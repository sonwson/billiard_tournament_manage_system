const { StatusCodes } = require('http-status-codes');
const logger = require('../config/logger');
const errorCodes = require('../common/errors/errorCodes');

function errorMiddleware(err, req, res, next) {
  void next;
  logger.error({
    requestId: req.context?.requestId,
    path: req.originalUrl,
    method: req.method,
    error: {
      message: err.message,
      stack: err.stack,
      code: err.code,
      details: err.details,
    },
  });

  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const code = err.code || errorCodes.INTERNAL_SERVER_ERROR;

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: err.message || 'Internal server error',
      details: err.details || null,
    },
  });
}

module.exports = errorMiddleware;
