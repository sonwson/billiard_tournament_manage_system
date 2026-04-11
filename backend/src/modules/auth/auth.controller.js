const asyncHandler = require('../../common/utils/asyncHandler');
const { successResponse } = require('../../common/utils/response');
const authService = require('./auth.service');

const register = asyncHandler(async (req, res) => {
  const result = await authService.register({
    ...req.body,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  return successResponse(res, result, null, 201);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login({
    ...req.body,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  return successResponse(res, result);
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body);
  return successResponse(res, result);
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  return successResponse(res, result);
});

const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken);
  return successResponse(res, result);
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  return successResponse(res, { message: 'Logged out successfully' });
});

const me = asyncHandler(async (req, res) => {
  const result = await authService.getProfile(req.user.sub);
  return successResponse(res, result);
});

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  refresh,
  logout,
  me,
};
