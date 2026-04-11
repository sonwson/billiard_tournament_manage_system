const { StatusCodes } = require('http-status-codes');
const ApiError = require('../common/errors/ApiError');
const errorCodes = require('../common/errors/errorCodes');

function notFoundMiddleware(_req, _res, next) {
  next(new ApiError(StatusCodes.NOT_FOUND, errorCodes.NOT_FOUND, 'Route not found'));
}

module.exports = notFoundMiddleware;
