const statisticRepository = require('./statistic.repository');
const tournamentRepository = require('../tournaments/tournament.repository');
const { isSuperAdminRole } = require('../../common/constants/roles');

function buildDateFilter(query) {
  if (!query.fromDate && !query.toDate) {
    return {};
  }

  const createdAt = {};
  if (query.fromDate) createdAt.$gte = new Date(query.fromDate);
  if (query.toDate) createdAt.$lte = new Date(query.toDate);
  return { createdAt };
}

async function getDashboard(query, actor) {
  if (isSuperAdminRole(actor.role)) {
    return statisticRepository.getDashboardSummary(buildDateFilter(query));
  }

  const tournaments = await tournamentRepository.findMany(
    {
      $or: [
        { ownerAdminId: actor.sub },
        { managerAdminIds: actor.sub },
      ],
    },
    { limit: 1000, sort: { createdAt: -1 } },
  );

  return statisticRepository.getDashboardSummary(buildDateFilter(query), {
    tournamentIds: tournaments.map((item) => item._id),
  });
}

async function getTournamentStatistics(tournamentId) {
  return statisticRepository.getTournamentStatistics(tournamentId);
}

async function getPlayerStatistics(playerId) {
  return statisticRepository.getPlayerStatistics(playerId);
}

module.exports = {
  getDashboard,
  getTournamentStatistics,
  getPlayerStatistics,
};
