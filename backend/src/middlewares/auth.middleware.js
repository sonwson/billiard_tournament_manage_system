const { StatusCodes } = require('http-status-codes');
const ApiError = require('../common/errors/ApiError');
const errorCodes = require('../common/errors/errorCodes');
const { verifyAccessToken } = require('../config/jwt');

function authMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(StatusCodes.UNAUTHORIZED, errorCodes.UNAUTHORIZED, 'Missing access token'));
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    req.user = verifyAccessToken(token);
    return next();
  } catch {
    return next(new ApiError(StatusCodes.UNAUTHORIZED, errorCodes.UNAUTHORIZED, 'Invalid or expired access token'));
  }
}

module.exports = authMiddleware;
