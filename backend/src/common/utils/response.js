function successResponse(res, data, meta = null, statusCode = 200) {
  const payload = { success: true, data };

  if (meta) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
}

module.exports = { successResponse };
