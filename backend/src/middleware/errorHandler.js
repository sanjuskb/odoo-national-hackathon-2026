const { ZodError } = require('zod');
const AppError = require('../utils/AppError');
const { errorResponse } = require('../utils/response');

function errorHandler(err, _req, res, _next) {
  // If an unhandled ZodError reached errorHandler directly
  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      field: issue.path.join('.') || 'root',
      issue: issue.message,
    }));
    return errorResponse(res, 400, 'Validation failed', errors);
  }

  // Known operational AppError
  if (err instanceof AppError) {
    return errorResponse(res, err.statusCode, err.message, err.errors);
  }

  // Handle syntax error from malformed JSON body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(res, 400, 'Malformed JSON in request body', null);
  }

  // Unexpected errors
  const statusCode = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';
  const message = statusCode === 500 && isProd
    ? 'Internal server error'
    : (err.message || 'Internal server error');

  return errorResponse(res, statusCode, message, null);
}

module.exports = errorHandler;
