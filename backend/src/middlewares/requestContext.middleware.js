const crypto = require('crypto');

function requestContextMiddleware(req, res, next) {
  req.context = {
    requestId: req.headers['x-request-id'] || crypto.randomUUID(),
  };

  res.setHeader('x-request-id', req.context.requestId);
  next();
}

module.exports = requestContextMiddleware;
