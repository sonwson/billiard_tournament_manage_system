const asyncHandler = require('../../common/utils/asyncHandler');
const { successResponse } = require('../../common/utils/response');
const matchService = require('./match.service');

const listByTournament = asyncHandler(async (req, res) => {
  const result = await matchService.listByTournament(req.params.id, req.query);
  return successResponse(res, result.items, result.meta);
});

const getMatchById = asyncHandler(async (req, res) => {
  const result = await matchService.getMatchById(req.params.id);
  return successResponse(res, result);
});

const getPublicScoreMatch = asyncHandler(async (req, res) => {
  const result = await matchService.getPublicScoreMatch(req.params.token);
  return successResponse(res, result);
});

const generateScoreAccess = asyncHandler(async (req, res) => {
  const result = await matchService.generateScoreAccess(req.params.id, req.user);
  return successResponse(res, result);
});

const updatePublicLiveScore = asyncHandler(async (req, res) => {
  const result = await matchService.updatePublicLiveScore(req.params.token, req.body);
  return successResponse(res, result);
});

const updatePublicMatchResult = asyncHandler(async (req, res) => {
  const result = await matchService.updatePublicMatchResult(req.params.token, req.body);
  return successResponse(res, result);
});

const scheduleMatch = asyncHandler(async (req, res) => {
  const result = await matchService.scheduleMatch(req.params.id, req.body, req.user);
  return successResponse(res, result);
});

const updateMatchStatus = asyncHandler(async (req, res) => {
  const result = await matchService.updateMatchStatus(req.params.id, req.body, req.user);
  return successResponse(res, result);
});

const updateLiveScore = asyncHandler(async (req, res) => {
  const result = await matchService.updateLiveScore(req.params.id, req.body, req.user);
  return successResponse(res, result);
});

const updateMatchResult = asyncHandler(async (req, res) => {
  const result = await matchService.updateMatchResult(req.params.id, req.body, req.user);
  return successResponse(res, result);
});

module.exports = {
  listByTournament,
  getMatchById,
  getPublicScoreMatch,
  generateScoreAccess,
  updatePublicLiveScore,
  updatePublicMatchResult,
  scheduleMatch,
  updateMatchStatus,
  updateLiveScore,
  updateMatchResult,
};
