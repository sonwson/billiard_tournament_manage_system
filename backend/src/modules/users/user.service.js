const bcrypt = require('bcryptjs');
const { StatusCodes } = require('http-status-codes');
const ApiError = require('../../common/errors/ApiError');
const errorCodes = require('../../common/errors/errorCodes');
const { parsePagination } = require('../../common/utils/pagination');
const userRepository = require('./user.repository');
const playerRepository = require('../players/player.repository');
const matchRepository = require('../matches/match.repository');
const { ROLES, isSuperAdminRole } = require('../../common/constants/roles');

async function listUsers(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  if (query.role) filter.role = query.role;
  if (query.status) filter.status = query.status;
  if (query.keyword) {
    filter.$or = [
      { fullName: { $regex: query.keyword, $options: 'i' } },
      { email: { $regex: query.keyword, $options: 'i' } },
      { phone: { $regex: query.keyword, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    userRepository.findMany(filter, { skip, limit }),
    userRepository.countDocuments(filter),
  ]);

  return {
    items,
    meta: { page, limit, total },
  };
}

async function listTournamentAdminRequests(query, actor) {
  if (!isSuperAdminRole(actor.role)) {
    throw new ApiError(StatusCodes.FORBIDDEN, errorCodes.FORBIDDEN, 'Only total admins can view tournament admin requests');
  }

  const { page, limit, skip } = parsePagination(query);
  const filter = {
    'tournamentAdminRequest.status': query.status || 'pending',
  };

  if (query.keyword) {
    filter.$or = [
      { fullName: { $regex: query.keyword, $options: 'i' } },
      { email: { $regex: query.keyword, $options: 'i' } },
      { phone: { $regex: query.keyword, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    userRepository.findMany(filter, { skip, limit }),
    userRepository.countDocuments(filter),
  ]);

  return {
    items,
    meta: { page, limit, total },
  };
}

async function getUserById(id) {
  const user = await userRepository.findById(id);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'User not found');
  }

  return user;
}

async function updateUser(id, payload, actorId) {
  const user = await getUserById(id);
  Object.assign(user, payload, { updatedBy: actorId });
  await user.save();
  return user;
}

async function updateMe(id, payload) {
  const user = await getUserById(id);
  user.fullName = payload.fullName ?? user.fullName;
  user.phone = payload.phone ?? user.phone;
  user.updatedBy = id;
  await user.save();
  return user;
}

async function requestTournamentAdmin(id, payload = {}) {
  const user = await getUserById(id);

  if (isSuperAdminRole(user.role) || user.role === ROLES.TOURNAMENT_ADMIN) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Your account already has admin permissions');
  }

  if (user.tournamentAdminRequest?.status === 'pending') {
    throw new ApiError(StatusCodes.CONFLICT, errorCodes.CONFLICT, 'Tournament admin request is already pending');
  }

  user.tournamentAdminRequest = {
    status: 'pending',
    note: payload.note || '',
    requestedAt: new Date(),
    reviewedAt: null,
    reviewedBy: null,
  };
  user.updatedBy = id;
  await user.save();
  return user;
}

async function reviewTournamentAdminRequest(id, payload, actor) {
  if (!isSuperAdminRole(actor.role)) {
    throw new ApiError(StatusCodes.FORBIDDEN, errorCodes.FORBIDDEN, 'Only total admins can review tournament admin requests');
  }

  const user = await getUserById(id);

  if (user.tournamentAdminRequest?.status !== 'pending') {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Tournament admin request is not pending');
  }

  user.tournamentAdminRequest.status = payload.action === 'approve' ? 'approved' : 'rejected';
  user.tournamentAdminRequest.reviewedAt = new Date();
  user.tournamentAdminRequest.reviewedBy = actor.sub;

  if (payload.action === 'approve') {
    user.role = ROLES.TOURNAMENT_ADMIN;
  }

  user.updatedBy = actor.sub;
  await user.save();
  return user;
}

async function changePassword(id, payload) {
  const user = await userRepository.findById(id, { selectPassword: true });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'User not found');
  }

  const isMatched = await bcrypt.compare(payload.oldPassword, user.passwordHash);
  if (!isMatched) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Old password is incorrect');
  }

  user.passwordHash = await bcrypt.hash(payload.newPassword, 10);
  user.refreshTokenVersion += 1;
  await user.save();
}

async function listMyMatches(actor, query) {
  const resolvedPlayer = actor.playerId
    ? { _id: actor.playerId }
    : await playerRepository.findOne({ userId: actor.sub });

  if (!resolvedPlayer?._id) {
    return {
      items: [],
      meta: { page: 1, limit: 200, total: 0 },
    };
  }

  const filter = {
    $or: [{ player1Id: resolvedPlayer._id }, { player2Id: resolvedPlayer._id }],
  };

  if (query.tournamentId) filter.tournamentId = query.tournamentId;
  if (query.status) filter.status = query.status;

  const items = await matchRepository.findMany(filter, {
    sort: { scheduledAt: 1, roundNumber: 1, matchNumber: 1 },
    limit: 200,
    populatePlayers: true,
  });

  return {
    items,
    meta: { page: 1, limit: 200, total: items.length },
  };
}

async function downgradeTournamentAdmin(userId, actor) {
  // Only super admins (admin, super_admin) can downgrade tournament admins
  if (!isSuperAdminRole(actor.role)) {
    throw new ApiError(StatusCodes.FORBIDDEN, errorCodes.FORBIDDEN, 'Only super admins can downgrade tournament admins');
  }

  const user = await getUserById(userId);

  // Check if user is a tournament_admin
  if (user.role !== ROLES.TOURNAMENT_ADMIN) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'User is not a tournament admin');
  }

  // Downgrade to user role
  user.role = ROLES.USER;
  user.tournamentAdminRequest = {
    status: 'none',
    note: '',
    requestedAt: null,
    reviewedAt: null,
    reviewedBy: null,
  };
  user.updatedBy = actor.sub;
  await user.save();

  return user;
}

module.exports = {
  listUsers,
  listTournamentAdminRequests,
  getUserById,
  updateUser,
  updateMe,
  requestTournamentAdmin,
  reviewTournamentAdminRequest,
  changePassword,
  listMyMatches,
  downgradeTournamentAdmin,
};
