const AppError = require('../utils/AppError');

function requireSelfOrStaff(paramName = 'id') {
  return (req, _res, next) => {
    if (!req.user || !req.user.role) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    const { role, id: currentUserId } = req.user;

    // Admin and staff bypass individual customer ownership checks
    if (role === 'admin' || role === 'staff') {
      return next();
    }

    // Customer can only access records belonging to their own user id
    const resourceUserId = req.params[paramName];
    if (role === 'customer' && resourceUserId && resourceUserId === currentUserId) {
      return next();
    }

    return next(
      new AppError(
        'Forbidden: You do not have permission to access another user’s resource',
        403,
        'FORBIDDEN'
      )
    );
  };
}

module.exports = requireSelfOrStaff;
