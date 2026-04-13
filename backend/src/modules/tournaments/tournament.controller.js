const asyncHandler = require('../../common/utils/asyncHandler');
const { successResponse } = require('../../common/utils/response');
const tournamentService = require('./tournament.service');

const createTournament = asyncHandler(async (req, res) => {
  const result = await tournamentService.createTournament(req.body, req.user);
  return successResponse(res, result, null, 201);
});

const listTournaments = asyncHandler(async (req, res) => {
  const result = await tournamentService.listTournaments(req.query);
  return successResponse(res, result.items, result.meta);
});

const listOpenRegistration = asyncHandler(async (req, res) => {
  const result = await tournamentService.listOpenRegistration(req.query);
  return successResponse(res, result.items, result.meta);
});

const listHistory = asyncHandler(async (req, res) => {
  const result = await tournamentService.listHistory(req.query);
  return successResponse(res, result.items, result.meta);
});

const listManageableTournaments = asyncHandler(async (req, res) => {
  const result = await tournamentService.listManageableTournaments(req.query, req.user);
  return successResponse(res, result.items, result.meta);
});

const listDeletedTournaments = asyncHandler(async (req, res) => {
  const result = await tournamentService.listDeletedTournaments(req.query, req.user);
  return successResponse(res, result.items, result.meta);
});

const getTournamentById = asyncHandler(async (req, res) => {
  const result = await tournamentService.getTournamentById(req.params.id);
  return successResponse(res, result);
});

const updateTournament = asyncHandler(async (req, res) => {
  const result = await tournamentService.updateTournament(req.params.id, req.body, req.user);
  return successResponse(res, result);
});

const updateTournamentStatus = asyncHandler(async (req, res) => {
  const result = await tournamentService.updateTournamentStatus(req.params.id, req.body.status, req.user);
  return successResponse(res, result);
});

const deleteTournament = asyncHandler(async (req, res) => {
  await tournamentService.deleteTournament(req.params.id, req.user);
  return successResponse(res, { message: 'Tournament moved to trash successfully' });
});

const restoreTournament = asyncHandler(async (req, res) => {
  const result = await tournamentService.restoreTournament(req.params.id, req.user);
  return successResponse(res, result);
});

const deleteTournamentPermanently = asyncHandler(async (req, res) => {
  await tournamentService.deleteTournamentPermanently(req.params.id, req.user);
  return successResponse(res, { message: 'Tournament permanently deleted' });
});

const generateBracket = asyncHandler(async (req, res) => {
  const result = await tournamentService.generateBracket(req.params.id, req.body, req.user);
  return successResponse(res, result);
});

const regenerateBracket = asyncHandler(async (req, res) => {
  const result = await tournamentService.regenerateBracket(req.params.id, req.body, req.user);
  return successResponse(res, result);
});

const getPlayerStats = asyncHandler(async (req, res) => {
  const result = await tournamentService.getPlayerStats(req.params.id);
  return successResponse(res, result);
});

module.exports = {
  createTournament,
  listTournaments,
  listOpenRegistration,
  listHistory,
  listManageableTournaments,
  listDeletedTournaments,
  getTournamentById,
  updateTournament,
  updateTournamentStatus,
  deleteTournament,
  restoreTournament,
  deleteTournamentPermanently,
  generateBracket,
  regenerateBracket,
  getPlayerStats,
};
