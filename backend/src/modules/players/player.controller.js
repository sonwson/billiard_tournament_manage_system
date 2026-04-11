const asyncHandler = require('../../common/utils/asyncHandler');
const { successResponse } = require('../../common/utils/response');
const playerService = require('./player.service');

const createPlayer = asyncHandler(async (req, res) => {
  const result = await playerService.createPlayer(req.body, req.user?.sub || null);
  return successResponse(res, result, null, 201);
});

const bulkCreatePlayers = asyncHandler(async (req, res) => {
  const result = await playerService.createPlayersBulk(req.body, req.user?.sub || null);
  return successResponse(res, result, null, 201);
});

const listPlayers = asyncHandler(async (req, res) => {
  const result = await playerService.listPlayers(req.query);
  return successResponse(res, result.items, result.meta);
});

const getPlayerById = asyncHandler(async (req, res) => {
  const result = await playerService.getPlayerById(req.params.id);
  return successResponse(res, result);
});

const updatePlayer = asyncHandler(async (req, res) => {
  const result = await playerService.updatePlayer(req.params.id, req.body, req.user.sub);
  return successResponse(res, result);
});

const updateMyPlayer = asyncHandler(async (req, res) => {
  const result = await playerService.updateMyPlayer(req.user.sub, req.body);
  return successResponse(res, result);
});

const deletePlayerPermanently = asyncHandler(async (req, res) => {
  const result = await playerService.deletePlayerPermanently(req.params.id, req.user);
  return successResponse(res, result);
});

module.exports = {
  createPlayer,
  bulkCreatePlayers,
  listPlayers,
  getPlayerById,
  updatePlayer,
  updateMyPlayer,
  deletePlayerPermanently,
};
