function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Log ONLY method, path, status, duration
    // NEVER log request body, passwords, tokens, or headers
    const logLine = `[REQ] ${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${duration}ms`;
    if (process.env.NODE_ENV !== 'test' || process.env.ENABLE_TEST_LOGGING === 'true') {
      console.log(logLine);
    }
  });
  next();
}

module.exports = requestLogger;
