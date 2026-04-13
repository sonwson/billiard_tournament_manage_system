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

const resetRankings = asyncHandler(async (req, res) => {
  const result = await rankingService.resetRankings(req.body.seasonKey || 'all_time');
  return successResponse(res, result);
});

const rollbackPointChange = asyncHandler(async (req, res) => {
  const result = await rankingService.rollbackPointChange(
    req.params.playerId,
    req.body.sourceKey,
    req.body.seasonKey || 'all_time',
  );
  
  if (!result) {
    return successResponse(res, { message: 'No matching point change found' }, null, 404);
  }
  
  return successResponse(res, result);
});

module.exports = {
  listRankings,
  getRankingDetail,
  getRankingHistory,
  recalculateRankings,
  resetRankings,
  rollbackPointChange,
};
