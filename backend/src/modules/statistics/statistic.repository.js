const Tournament = require('../tournaments/tournament.model');
const Registration = require('../registrations/registration.model');
const Match = require('../matches/match.model');
const Ranking = require('../rankings/ranking.model');
const Player = require('../players/player.model');
const { mongoose } = require('../../config/db');

async function getDashboardSummary(dateFilter = {}, options = {}) {
  const tournamentIds = Array.isArray(options.tournamentIds) ? options.tournamentIds.filter(Boolean) : null;
  const tournamentMatch = { deletedAt: null, ...dateFilter };

  if (tournamentIds) {
    tournamentMatch._id = { $in: tournamentIds.map((id) => new mongoose.Types.ObjectId(id)) };
  }

  const activeTournaments = await Tournament.find(tournamentMatch).select('_id name');
  const activeTournamentIds = activeTournaments.map((item) => item._id);

  if (!activeTournamentIds.length) {
    return {
      tournamentStatusSummary: [],
      activePlayers: 0,
      registrationSummary: [],
      matchSummary: [],
      topPlayers: [],
      busiestTournament: null,
    };
  }

  const [
    tournamentStatusSummary,
    activePlayerIds,
    registrationSummary,
    matchSummary,
    topPlayers,
    busiestTournament,
  ] = await Promise.all([
    Tournament.aggregate([
      { $match: { _id: { $in: activeTournamentIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Registration.distinct('playerId', {
      deletedAt: null,
      tournamentId: { $in: activeTournamentIds },
      status: 'approved',
    }),
    Registration.aggregate([
      { $match: { deletedAt: null, tournamentId: { $in: activeTournamentIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Match.aggregate([
      { $match: { tournamentId: { $in: activeTournamentIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Ranking.find({ seasonKey: 'all_time' })
      .populate('playerId')
      .sort({ totalPoints: -1 })
      .limit(10),
    Registration.aggregate([
      { $match: { deletedAt: null, status: 'approved', tournamentId: { $in: activeTournamentIds } } },
      { $group: { _id: '$tournamentId', playerCount: { $sum: 1 } } },
      { $sort: { playerCount: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: 'tournaments',
          localField: '_id',
          foreignField: '_id',
          as: 'tournament',
        },
      },
      { $unwind: '$tournament' },
      { $match: { 'tournament.deletedAt': null } },
    ]),
  ]);

  const activePlayers = activePlayerIds.length
    ? await Player.countDocuments({
      _id: { $in: activePlayerIds },
      deletedAt: null,
      status: 'active',
    })
    : 0;

  return {
    tournamentStatusSummary,
    activePlayers,
    registrationSummary,
    matchSummary,
    topPlayers,
    busiestTournament: busiestTournament[0] || null,
  };
}

async function getTournamentStatistics(tournamentId) {
  const objectId = new mongoose.Types.ObjectId(tournamentId);
  const [tournament, registrationSummary, matchSummary, roundSummary] = await Promise.all([
    Tournament.findOne({ _id: tournamentId, deletedAt: null }).populate('championPlayerId'),
    Registration.aggregate([
      { $match: { tournamentId: objectId, deletedAt: null } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Match.aggregate([
      { $match: { tournamentId: objectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Match.aggregate([
      { $match: { tournamentId: objectId } },
      { $group: { _id: '$roundNumber', matchCount: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  return {
    tournament,
    registrationSummary,
    matchSummary,
    roundSummary,
  };
}

async function getPlayerStatistics(playerId) {
  const [player, ranking] = await Promise.all([
    Player.findOne({ _id: playerId, deletedAt: null }),
    Ranking.findOne({ playerId, seasonKey: 'all_time' }),
  ]);

  return {
    player,
    ranking,
  };
}

module.exports = {
  getDashboardSummary,
  getTournamentStatistics,
  getPlayerStatistics,
};
