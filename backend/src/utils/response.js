function successResponse(res, statusCode = 200, data = null, message = 'Success') {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    errors: null,
  });
}

function errorResponse(res, statusCode = 500, message = 'An error occurred', errors = null) {
  return res.status(statusCode).json({
    success: false,
    data: null,
    message,
    errors,
  });
}

module.exports = {
  successResponse,
  errorResponse,
};
