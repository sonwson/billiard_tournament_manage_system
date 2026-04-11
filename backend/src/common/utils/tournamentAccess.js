const { StatusCodes } = require('http-status-codes');
const ApiError = require('../errors/ApiError');
const errorCodes = require('../errors/errorCodes');
const { ROLES, isSuperAdminRole } = require('../constants/roles');

function isTournamentManager(tournament, actor) {
  if (!tournament || !actor) return false;
  if (isSuperAdminRole(actor.role)) return true;

  if (actor.role !== ROLES.TOURNAMENT_ADMIN) {
    return false;
  }

  const actorId = actor.sub?.toString();
  const ownerAdminId = tournament.ownerAdminId?.toString?.() || tournament.ownerAdminId?.toString();
  const managerIds = (tournament.managerAdminIds || []).map((item) => item.toString());

  return ownerAdminId === actorId || managerIds.includes(actorId);
}

function assertTournamentAccess(tournament, actor) {
  if (!isTournamentManager(tournament, actor)) {
    throw new ApiError(StatusCodes.FORBIDDEN, errorCodes.FORBIDDEN, 'You do not have permission to manage this tournament');
  }
}

module.exports = {
  isTournamentManager,
  assertTournamentAccess,
};
