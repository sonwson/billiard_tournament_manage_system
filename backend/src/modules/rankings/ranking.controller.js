const asyncHandler = require('../../common/utils/asyncHandler');
const { successResponse } = require('../../common/utils/response');
const rankingService = require('./ranking.service');

const listRankings = asyncHandler(async (req, res) => {
  const result = await rankingService.listRankings(req.query);
  return successResponse(res, result.items, result.meta);
});

const getRankingDetail = asyncHandler(async (req, res) => {
  const result = await rankingService.getRankingDetail(req.params.playerId, req.query.seasonKey);
  return successResponse(res, result);
});

const getRankingHistory = asyncHandler(async (req, res) => {
  const result = await rankingService.getRankingDetail(req.query.playerId, req.query.seasonKey);
  return successResponse(res, result.history);
});

const recalculateRankings = asyncHandler(async (_req, res) => {
  const count = await rankingService.rebuildRanks('all_time');
  return successResponse(res, { message: 'Rankings recalculated', count });
});

module.exports = {
  listRankings,
  getRankingDetail,
  getRankingHistory,
  recalculateRankings,
};
