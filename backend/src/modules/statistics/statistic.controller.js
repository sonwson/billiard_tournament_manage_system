const asyncHandler = require('../../common/utils/asyncHandler');
const { successResponse } = require('../../common/utils/response');
const statisticService = require('./statistic.service');

const getDashboard = asyncHandler(async (req, res) => {
  const result = await statisticService.getDashboard(req.query, req.user);
  return successResponse(res, result);
});

const getTournamentStatistics = asyncHandler(async (req, res) => {
  const result = await statisticService.getTournamentStatistics(req.params.id);
  return successResponse(res, result);
});

const getPlayerStatistics = asyncHandler(async (req, res) => {
  const result = await statisticService.getPlayerStatistics(req.params.id);
  return successResponse(res, result);
});

module.exports = {
  getDashboard,
  getTournamentStatistics,
  getPlayerStatistics,
};
