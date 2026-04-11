const asyncHandler = require('../../common/utils/asyncHandler');
const { successResponse } = require('../../common/utils/response');
const registrationService = require('./registration.service');

const createForTournament = asyncHandler(async (req, res) => {
  const result = await registrationService.createRegistration(req.params.id, req.body, req.user);
  return successResponse(res, result, null, 201);
});

const listByTournament = asyncHandler(async (req, res) => {
  const result = await registrationService.listByTournament(req.params.id, req.query, req.user);
  return successResponse(res, result.items, result.meta);
});

const reviewRegistration = asyncHandler(async (req, res) => {
  const result = await registrationService.reviewRegistration(req.params.id, req.body, req.user);
  return successResponse(res, result);
});

const cancelRegistration = asyncHandler(async (req, res) => {
  const result = await registrationService.cancelRegistration(req.params.id, req.user);
  return successResponse(res, result);
});

const removePlayerFromTournament = asyncHandler(async (req, res) => {
  const result = await registrationService.removePlayerFromTournament(req.params.id, req.params.playerId, req.user);
  return successResponse(res, result);
});

module.exports = {
  createForTournament,
  listByTournament,
  reviewRegistration,
  cancelRegistration,
  removePlayerFromTournament,
};
