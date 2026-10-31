const { errorResponse } = require('../utils/response');

function notFound(_req, res) {
  return errorResponse(res, 404, 'Resource not found', null);
}

module.exports = notFound;
