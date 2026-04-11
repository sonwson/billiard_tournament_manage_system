const { StatusCodes } = require('http-status-codes');
const ApiError = require('../common/errors/ApiError');
const errorCodes = require('../common/errors/errorCodes');

function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(StatusCodes.FORBIDDEN, errorCodes.FORBIDDEN, 'Insufficient permissions'));
    }

    return next();
  };
}

module.exports = requireRole;
