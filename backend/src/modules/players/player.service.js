const { StatusCodes } = require('http-status-codes');
const ApiError = require('../../common/errors/ApiError');
const errorCodes = require('../../common/errors/errorCodes');
const { parsePagination } = require('../../common/utils/pagination');
const playerRepository = require('./player.repository');
const rankingRepository = require('../rankings/ranking.repository');
const userRepository = require('../users/user.repository');
const registrationRepository = require('../registrations/registration.repository');
const { ROLES, isSuperAdminRole } = require('../../common/constants/roles');
const tournamentRepository = require('../tournaments/tournament.repository');

function buildPlayerFilter(query) {
  const filter = {};

  if (query.club) filter.club = query.club;
  if (query.city) filter.city = query.city;
  if (query.status) filter.status = query.status;
  if (query.skillLevel) filter.skillLevel = query.skillLevel;
  if (query.keyword) {
    filter.$or = [
      { displayName: { $regex: query.keyword, $options: 'i' } },
      { club: { $regex: query.keyword, $options: 'i' } },
      { city: { $regex: query.keyword, $options: 'i' } },
      { email: { $regex: query.keyword, $options: 'i' } },
      { phone: { $regex: query.keyword, $options: 'i' } },
    ];
  }

  return filter;
}

async function createPlayer(payload, actor) {
  const existingPlayer = payload.userId
    ? await playerRepository.findOne({ userId: payload.userId })
    : null;
  const orConditions = [];

  if (payload.email) {
    orConditions.push({ email: payload.email.toLowerCase() });
  }

  if (payload.phone) {
    orConditions.push({ phone: payload.phone });
  }

  if (existingPlayer) {
    throw new ApiError(StatusCodes.CONFLICT, errorCodes.CONFLICT, 'Player profile already exists for this user');
  }

  if (orConditions.length > 0) {
    const duplicatedContact = await playerRepository.findOne({ $or: orConditions });
    if (duplicatedContact) {
      throw new ApiError(StatusCodes.CONFLICT, errorCodes.CONFLICT, 'Player email or phone already exists');
    }
  }

  return playerRepository.create({
    ...payload,
    email: payload.email ? payload.email.toLowerCase() : null,
    playerCode: payload.playerCode || `PLR-${Date.now()}`,
    createdBy: actor,
    updatedBy: actor,
  });
}

async function createPlayersBulk(payload, actor) {
  const createdPlayers = [];

  for (const playerPayload of payload.players) {
    createdPlayers.push(await createPlayer(playerPayload, actor));
  }

  return createdPlayers;
}

async function listPlayers(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = buildPlayerFilter(query);
  const onlyParticipated = query.participated === true || query.participated === 'true';

  if (onlyParticipated) {
    const playerIds = await registrationRepository.findDistinctPlayerIds({});
    filter._id = { $in: playerIds };
  }

  const [items, total] = await Promise.all([
    playerRepository.findMany(filter, { skip, limit }),
    playerRepository.countDocuments(filter),
  ]);

  return {
    items,
    meta: { page, limit, total },
  };
}

async function listManageablePlayers(query, actor) {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20, maxLimit: 500 });
  const filter = buildPlayerFilter(query);

  const tournamentFilter = actor.role === ROLES.SUPER_ADMIN
    ? {}
    : {
      $or: [
        { ownerAdminId: actor.sub },
        { managerAdminIds: actor.sub },
      ],
    };

  const tournaments = await tournamentRepository.findMany(tournamentFilter, { skip: 0, limit: 5000, sort: { createdAt: -1 } });
  const tournamentIds = tournaments.map((tournament) => tournament._id);

  if (!tournamentIds.length) {
    return {
      items: [],
      meta: { page, limit, total: 0 },
    };
  }

  const playerIds = await registrationRepository.findDistinctPlayerIds({ tournamentId: { $in: tournamentIds } });
  filter._id = { $in: playerIds };

  const [items, total] = await Promise.all([
    playerRepository.findMany(filter, { skip, limit }),
    playerRepository.countDocuments(filter),
  ]);

  return {
    items,
    meta: { page, limit, total },
  };
}

async function getPlayerById(id) {
  const player = await playerRepository.findById(id);
  if (!player) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Player not found');
  }

  const ranking = await rankingRepository.findOne({ playerId: player._id, seasonKey: 'all_time' });
  return { player, ranking };
}

async function updatePlayer(id, payload, actor) {
  const player = await playerRepository.findById(id);
  if (!player) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Player not found');
  }

  Object.assign(player, payload, { updatedBy: actor });
  await player.save();
  return player;
}

async function updateMyPlayer(userId, payload) {
  const player = await playerRepository.findOne({ userId });
  if (!player) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Player profile not found');
  }

  Object.assign(player, payload, { updatedBy: userId });
  await player.save();
  return player;
}

async function deletePlayerPermanently(id, actor) {
  if (!isSuperAdminRole(actor.role)) {
    throw new ApiError(StatusCodes.FORBIDDEN, errorCodes.FORBIDDEN, 'Only super admin can permanently delete a player');
  }

  const player = await playerRepository.findById(id);
  if (!player) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Player not found');
  }

  player.deletedAt = new Date();
  player.deletedBy = actor.sub;
  player.status = 'banned';
  await player.save();

  if (player.userId) {
    const user = await userRepository.findById(player.userId);
    if (user) {
      user.deletedAt = new Date();
      user.deletedBy = actor.sub;
      user.status = 'blocked';
      await user.save();
    }
  }

  return player;
}

module.exports = {
  createPlayer,
  createPlayersBulk,
  listPlayers,
  listManageablePlayers,
  getPlayerById,
  updatePlayer,
  updateMyPlayer,
  deletePlayerPermanently,
};
