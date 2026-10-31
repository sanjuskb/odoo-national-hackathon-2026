const { getSupabaseAdmin } = require('../lib/supabase');
const roleStore = require('../services/roleStore');
const AppError = require('../utils/AppError');

async function authenticate(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required: Missing or malformed Bearer token', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new AppError('Authentication required: Token is empty', 401, 'UNAUTHORIZED');
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data || !data.user) {
      throw new AppError('Invalid or expired authentication token', 401, 'UNAUTHORIZED');
    }

    // Security invariant: Role comes strictly from roleStore.getRole(userId)
    // NEVER trust role from request headers, params, body, or user_metadata
    const verifiedRole = await roleStore.getRole(data.user.id);

    req.user = {
      id: data.user.id,
      email: data.user.email,
      role: verifiedRole,
    };

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authenticate;
