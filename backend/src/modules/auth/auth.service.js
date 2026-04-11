const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { StatusCodes } = require('http-status-codes');
const ApiError = require('../../common/errors/ApiError');
const errorCodes = require('../../common/errors/errorCodes');
const env = require('../../config/env');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../../config/jwt');
const { sendMail } = require('../../common/utils/mailer');
const userRepository = require('../users/user.repository');
const User = require('../users/user.model');
const Player = require('../players/player.model');
const authRepository = require('./auth.repository');

function sanitizeUser(user) {
  if (!user) return null;
  const plainUser = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete plainUser.passwordHash;
  delete plainUser.passwordReset;
  return plainUser;
}

function buildTokenPayload(user, playerId = null) {
  return {
    sub: user._id.toString(),
    role: user.role,
    email: user.email,
    playerId: playerId ? playerId.toString() : null,
  };
}

async function register(payload) {
  const email = payload.email.toLowerCase();
  const phone = payload.phone || null;
  const orConditions = [{ email }];
  if (phone) {
    orConditions.push({ phone });
  }

  const existingUser = await userRepository.findOne({ $or: orConditions });

  if (existingUser) {
    throw new ApiError(StatusCodes.CONFLICT, errorCodes.CONFLICT, 'Email or phone already exists');
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  const user = await User.create({
    fullName: payload.fullName,
    email,
    phone,
    passwordHash,
    role: 'user',
  });

  const player = await Player.create({
    userId: user._id,
    playerCode: `PLR-${Date.now()}`,
    displayName: payload.fullName,
    club: payload.club || null,
    city: payload.city || null,
    createdBy: user._id,
    updatedBy: user._id,
  });

  const accessToken = signAccessToken(buildTokenPayload(user, player._id));
  const refreshToken = signRefreshToken({ sub: user._id.toString(), tokenVersion: user.refreshTokenVersion });

  await authRepository.createSession({
    userId: user._id,
    refreshTokenHash: authRepository.hashToken(refreshToken),
    userAgent: payload.userAgent || null,
    ipAddress: payload.ipAddress || null,
    expiresAt: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)),
  });

  return {
    user: { ...sanitizeUser(user), playerId: player?._id?.toString() || null },
    player,
    accessToken,
    refreshToken,
  };
}

async function login(payload) {
  const user = await authRepository.findUserByEmailOrPhone(payload.emailOrPhone, { selectPassword: true });
  if (!user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, errorCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  const isMatched = await bcrypt.compare(payload.password, user.passwordHash);
  if (!isMatched) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, errorCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  if (user.status !== 'active') {
    throw new ApiError(StatusCodes.FORBIDDEN, errorCodes.FORBIDDEN, 'User account is not active');
  }

  const player = await Player.findOne({ userId: user._id, deletedAt: null });
  const accessToken = signAccessToken(buildTokenPayload(user, player?._id));
  const refreshToken = signRefreshToken({ sub: user._id.toString(), tokenVersion: user.refreshTokenVersion });

  user.lastLoginAt = new Date();
  await user.save();

  await authRepository.createSession({
    userId: user._id,
    refreshTokenHash: authRepository.hashToken(refreshToken),
    userAgent: payload.userAgent || null,
    ipAddress: payload.ipAddress || null,
    expiresAt: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)),
  });

  return {
    user: { ...sanitizeUser(user), playerId: player?._id?.toString() || null },
    player,
    accessToken,
    refreshToken,
  };
}

function hashVerificationCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function generateVerificationCode() {
  return `${Math.floor(100000 + (Math.random() * 900000))}`;
}

async function forgotPassword(payload) {
  const user = await authRepository.findUserByEmail(payload.email, { selectPassword: true });

  if (!user) {
    return {
      message: 'If the email exists, a verification code has been sent.',
      deliveryMethod: 'silent',
    };
  }

  const verificationCode = generateVerificationCode();
  const expiresAt = new Date(Date.now() + (10 * 60 * 1000));
  user.passwordReset = {
    codeHash: hashVerificationCode(verificationCode),
    expiresAt,
    requestedAt: new Date(),
    deliveredTo: user.email,
  };
  await user.save();

  const mailResult = await sendMail({
    to: user.email,
    subject: 'BilliardHub password reset code',
    text: `Your password reset code is ${verificationCode}. It expires in 10 minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2 style="margin:0 0 12px">BilliardHub password reset</h2>
        <p>Your verification code is:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px">${verificationCode}</p>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  });

  return {
    message: 'Verification code sent successfully.',
    deliveryMethod: mailResult.deliveryMethod,
    expiresInMinutes: 10,
    ...(env.nodeEnv !== 'production' ? { verificationCode } : {}),
  };
}

async function resetPassword(payload) {
  const user = await authRepository.findUserByEmail(payload.email, { selectPassword: true });

  if (!user || !user.passwordReset?.codeHash) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Password reset request is invalid or expired');
  }

  if (!user.passwordReset.expiresAt || user.passwordReset.expiresAt < new Date()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Verification code has expired');
  }

  if (user.passwordReset.codeHash !== hashVerificationCode(payload.verificationCode)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Verification code is incorrect');
  }

  user.passwordHash = await bcrypt.hash(payload.newPassword, 10);
  user.refreshTokenVersion += 1;
  user.passwordReset = {
    codeHash: null,
    expiresAt: null,
    requestedAt: null,
    deliveredTo: null,
  };
  await user.save();

  return { message: 'Password reset successfully.' };
}

async function refresh(refreshToken) {
  const decoded = verifyRefreshToken(refreshToken);
  const [session, user, player] = await Promise.all([
    authRepository.findSessionByRefreshToken(refreshToken),
    userRepository.findById(decoded.sub),
    Player.findOne({ userId: decoded.sub, deletedAt: null }),
  ]);

  if (!session || !user || session.expiresAt < new Date()) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, errorCodes.UNAUTHORIZED, 'Refresh token is invalid');
  }

  const accessToken = signAccessToken(buildTokenPayload(user, player?._id));
  const newRefreshToken = signRefreshToken({
    sub: user._id.toString(),
    tokenVersion: user.refreshTokenVersion,
  });

  session.refreshTokenHash = authRepository.hashToken(newRefreshToken);
  session.expiresAt = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000));
  await session.save();

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
}

async function logout(refreshToken) {
  await authRepository.revokeSession(refreshToken);
}

async function getProfile(userId) {
  const [user, player] = await Promise.all([
    userRepository.findById(userId),
    Player.findOne({ userId, deletedAt: null }),
  ]);

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'User not found');
  }

  return { user: { ...sanitizeUser(user), playerId: player?._id?.toString() || null }, player };
}

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  refresh,
  logout,
  getProfile,
};
