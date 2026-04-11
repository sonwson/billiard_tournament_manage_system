const crypto = require('crypto');
const AuthSession = require('./auth-session.model');
const userRepository = require('../users/user.repository');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function createSession(payload) {
  return AuthSession.create(payload);
}

async function findUserByEmailOrPhone(emailOrPhone, options = {}) {
  return userRepository.findOne({
    $or: [
      { email: emailOrPhone.toLowerCase() },
      { phone: emailOrPhone },
    ],
  }, options);
}

async function findUserByEmail(email, options = {}) {
  return userRepository.findOne({ email: email.toLowerCase() }, options);
}

async function findSessionByRefreshToken(refreshToken) {
  return AuthSession.findOne({
    refreshTokenHash: hashToken(refreshToken),
    revokedAt: null,
  });
}

async function revokeSession(refreshToken) {
  return AuthSession.findOneAndUpdate(
    { refreshTokenHash: hashToken(refreshToken), revokedAt: null },
    { revokedAt: new Date() },
    { new: true },
  );
}

module.exports = {
  hashToken,
  createSession,
  findUserByEmailOrPhone,
  findUserByEmail,
  findSessionByRefreshToken,
  revokeSession,
};
