const { StatusCodes } = require('http-status-codes');
const ApiError = require('../common/errors/ApiError');
const errorCodes = require('../common/errors/errorCodes');

function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body || {},
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      return next(new ApiError(
        StatusCodes.BAD_REQUEST,
        errorCodes.VALIDATION_ERROR,
        'Validation failed',
        result.error.flatten(),
      ));
    }

    req.body = result.data.body;
    req.params = result.data.params;
    req.query = result.data.query;
    return next();
  };
}

module.exports = validate;
