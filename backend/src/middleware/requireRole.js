const AppError = require('../utils/AppError');

function requireRole(...allowedRoles) {
  const roles = allowedRoles.flat();
  return (req, _res, next) => {
    if (!req.user || !req.user.role) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Insufficient permissions. Required one of: [${roles.join(', ')}]`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
}

module.exports = requireRole;
