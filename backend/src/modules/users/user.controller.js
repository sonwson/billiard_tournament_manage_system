const asyncHandler = require('../../common/utils/asyncHandler');
const { successResponse } = require('../../common/utils/response');
const userService = require('./user.service');

const listUsers = asyncHandler(async (req, res) => {
  const result = await userService.listUsers(req.query);
  return successResponse(res, result.items, result.meta);
});

const listTournamentAdminRequests = asyncHandler(async (req, res) => {
  const result = await userService.listTournamentAdminRequests(req.query, req.user);
  return successResponse(res, result.items, result.meta);
});

const getUserById = asyncHandler(async (req, res) => {
  const result = await userService.getUserById(req.params.id);
  return successResponse(res, result);
});

const updateUser = asyncHandler(async (req, res) => {
  const result = await userService.updateUser(req.params.id, req.body, req.user.sub);
  return successResponse(res, result);
});

const updateMe = asyncHandler(async (req, res) => {
  const result = await userService.updateMe(req.user.sub, req.body);
  return successResponse(res, result);
});

const requestTournamentAdmin = asyncHandler(async (req, res) => {
  const result = await userService.requestTournamentAdmin(req.user.sub, req.body);
  return successResponse(res, result);
});

const reviewTournamentAdminRequest = asyncHandler(async (req, res) => {
  const result = await userService.reviewTournamentAdminRequest(req.params.id, req.body, req.user);
  return successResponse(res, result);
});

const changePassword = asyncHandler(async (req, res) => {
  await userService.changePassword(req.user.sub, req.body);
  return successResponse(res, { message: 'Password updated successfully' });
});

const listMyMatches = asyncHandler(async (req, res) => {
  const result = await userService.listMyMatches(req.user, req.query);
  return successResponse(res, result.items, result.meta);
});

module.exports = {
  listUsers,
  listTournamentAdminRequests,
  getUserById,
  updateUser,
  updateMe,
  requestTournamentAdmin,
  reviewTournamentAdminRequest,
  changePassword,
  listMyMatches,
};
