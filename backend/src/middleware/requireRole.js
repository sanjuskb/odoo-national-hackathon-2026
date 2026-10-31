const AppError = require('../utils/AppError');

function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user || !req.user.role) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Insufficient permissions. Required one of: [${allowedRoles.join(', ')}]`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
}

module.exports = requireRole;
