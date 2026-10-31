const { ZodError } = require('zod');
const { errorResponse } = require('../utils/response');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const target = source === 'all'
        ? { body: req.body, query: req.query, params: req.params }
        : req[source];

      const parsed = schema.parse(target);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.issues.map((issue) => {
          const fieldPath = issue.path.join('.');
          return {
            field: fieldPath || 'root',
            issue: issue.message,
          };
        });
        return errorResponse(res, 400, 'Validation failed', errors);
      }
      next(err);
    }
  };
}

module.exports = validate;
