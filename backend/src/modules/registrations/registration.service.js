const { StatusCodes } = require('http-status-codes');
const ApiError = require('../../common/errors/ApiError');
const errorCodes = require('../../common/errors/errorCodes');
const { parsePagination } = require('../../common/utils/pagination');
const { ADMIN_ROLES, isSuperAdminRole } = require('../../common/constants/roles');
const { assertTournamentAccess } = require('../../common/utils/tournamentAccess');
const tournamentRepository = require('../tournaments/tournament.repository');
const playerRepository = require('../players/player.repository');
const registrationRepository = require('./registration.repository');

async function createRegistration(tournamentId, payload, authUser) {
  const isAdminDirectEntry = ADMIN_ROLES.includes(authUser.role) && payload.playerId;
  const [tournament, player] = await Promise.all([
    tournamentRepository.findById(tournamentId),
    playerRepository.findById(payload.playerId || authUser.playerId),
  ]);

  if (!tournament) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Tournament not found');
  }
  if (isAdminDirectEntry) {
    assertTournamentAccess(tournament, authUser);
  }
  if (!player) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Player not found');
  }
  if (!isAdminDirectEntry && tournament.status !== 'open_registration') {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Tournament is not open for registration');
  }
  if (!isAdminDirectEntry && tournament.registrationCloseAt < new Date()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Registration has already closed');
  }
  if (isAdminDirectEntry && !['open_registration', 'closed_registration'].includes(tournament.status)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Admin can only add players before the tournament starts');
  }
  if (isAdminDirectEntry && tournament.bracketGeneratedAt) {
    throw new ApiError(StatusCodes.CONFLICT, errorCodes.CONFLICT, 'Cannot add players after bracket generation');
  }
  if (tournament.approvedPlayerCount >= tournament.maxPlayers) {
    throw new ApiError(StatusCodes.CONFLICT, errorCodes.CONFLICT, 'Tournament is full');
  }

  const existingRegistration = await registrationRepository.findOne({ tournamentId, playerId: player._id });
  if (existingRegistration) {
    throw new ApiError(StatusCodes.CONFLICT, errorCodes.CONFLICT, 'Player already registered for this tournament');
  }

  const registrationPayload = {
    tournamentId,
    playerId: player._id,
    userId: authUser.sub,
    skillLevel: payload.skillLevel,
    status: isAdminDirectEntry ? 'approved' : 'pending',
    reviewedAt: isAdminDirectEntry ? new Date() : null,
    reviewedBy: isAdminDirectEntry ? authUser.sub : null,
    seedingNumber: null,
    snapshot: {
      displayName: player.displayName,
      club: player.club,
      rankingPoints: player.stats?.rankingPoints || 0,
    },
    createdBy: authUser.sub,
    updatedBy: authUser.sub,
  };

  if (isAdminDirectEntry) {
    const approvedInSkillGroup = await registrationRepository.countDocuments({
      tournamentId,
      status: 'approved',
      skillLevel: payload.skillLevel,
    });
    registrationPayload.seedingNumber = approvedInSkillGroup + 1;
  }

  const registration = await registrationRepository.create(registrationPayload);

  // Update player's skillLevel if they don't have one set yet
  if (!player.skillLevel || player.skillLevel === 'CN') {
    player.skillLevel = payload.skillLevel;
    player.updatedBy = authUser.sub;
    await player.save();
  }

  if (isAdminDirectEntry) {
    tournament.approvedPlayerCount += 1;
    tournament.updatedBy = authUser.sub;
    await tournament.save();
  }

  return registration;
}

async function listByTournament(tournamentId, query, actor) {
  const { page, limit, skip } = parsePagination(query);
  const tournament = await tournamentRepository.findById(tournamentId);
  if (!tournament) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Tournament not found');
  }
  assertTournamentAccess(tournament, actor);

  const filter = { tournamentId };
  if (query.status) filter.status = query.status;

  const [items, total] = await Promise.all([
    registrationRepository.findMany(filter, { skip, limit, populatePlayer: true, populateUser: true }),
    registrationRepository.countDocuments(filter),
  ]);

  return {
    items,
    meta: { page, limit, total },
  };
}

async function reviewRegistration(id, payload, actor) {
  const registration = await registrationRepository.findById(id);
  if (!registration) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Registration not found');
  }
  if (registration.status !== 'pending') {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Registration has already been reviewed');
  }

  const tournament = await tournamentRepository.findById(registration.tournamentId);
  if (!tournament) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Tournament not found');
  }
  assertTournamentAccess(tournament, actor);

  if (payload.action === 'approve') {
    if (tournament.approvedPlayerCount >= tournament.maxPlayers) {
      throw new ApiError(StatusCodes.CONFLICT, errorCodes.CONFLICT, 'Tournament is full');
    }

    const approvedInSkillGroup = await registrationRepository.countDocuments({
      tournamentId: registration.tournamentId,
      status: 'approved',
      skillLevel: registration.skillLevel,
    });

    registration.status = 'approved';
    registration.reviewedAt = new Date();
    registration.reviewedBy = actor.sub;
    registration.seedingNumber = approvedInSkillGroup + 1;
    registration.updatedBy = actor.sub;
    tournament.approvedPlayerCount += 1;
    tournament.updatedBy = actor.sub;
    await Promise.all([registration.save(), tournament.save()]);
  } else {
    registration.status = 'rejected';
    registration.reviewedAt = new Date();
    registration.reviewedBy = actor.sub;
    registration.rejectionReason = payload.rejectionReason || 'Rejected by admin';
    registration.updatedBy = actor.sub;
    await registration.save();
  }

  return registration;
}

async function cancelRegistration(id, actor) {
  const registration = await registrationRepository.findById(id);
  if (!registration) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Registration not found');
  }
  const tournament = await tournamentRepository.findById(registration.tournamentId);
  const canManageAsAdmin = isSuperAdminRole(actor.role) || actor.role === 'tournament_admin';

  if (canManageAsAdmin) {
    if (tournament) {
      assertTournamentAccess(tournament, actor);
    }
  } else if (registration.userId.toString() !== actor.sub) {
    throw new ApiError(StatusCodes.FORBIDDEN, errorCodes.FORBIDDEN, 'You cannot cancel this registration');
  }

  if (registration.status === 'cancelled') {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Registration is already cancelled');
  }

  if (registration.status === 'approved' && tournament && tournament.approvedPlayerCount > 0) {
    tournament.approvedPlayerCount -= 1;
    await tournament.save();
  }

  registration.status = 'cancelled';
  registration.updatedBy = actor.sub;
  await registration.save();
  return registration;
}

async function removePlayerFromTournament(tournamentId, playerId, actor) {
  const [tournament, registration] = await Promise.all([
    tournamentRepository.findById(tournamentId),
    registrationRepository.findOne({ tournamentId, playerId }),
  ]);

  if (!tournament) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Tournament not found');
  }
  assertTournamentAccess(tournament, actor);

  if (!registration) {
    throw new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Player is not registered in this tournament');
  }
  if (tournament.status === 'ongoing' || tournament.bracketGeneratedAt) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errorCodes.BAD_REQUEST, 'Cannot remove player after bracket generation or during an ongoing tournament');
  }

  if (registration.status === 'approved' && tournament.approvedPlayerCount > 0) {
    tournament.approvedPlayerCount -= 1;
    tournament.updatedBy = actor.sub;
    await tournament.save();
  }

  registration.status = 'cancelled';
  registration.updatedBy = actor.sub;
  registration.deletedAt = new Date();
  registration.deletedBy = actor.sub;
  await registration.save();

  return registration;
}

module.exports = {
  createRegistration,
  listByTournament,
  reviewRegistration,
  cancelRegistration,
  removePlayerFromTournament,
};
