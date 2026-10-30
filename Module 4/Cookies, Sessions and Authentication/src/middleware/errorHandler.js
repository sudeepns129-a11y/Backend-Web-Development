function errorHandler(error, req, res, next) {
  if (error && error.status) {
    return res.status(error.status).json({ error: { code: error.code, message: error.message } });
  }
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
}

module.exports = errorHandler;
