// TODO: TEMPORARY - replace when Harsha confirms profiles table
// Harsha owns the database schema. Currently, no SQL migration or table definition
// exists for profiles or roles in database/.
// As specified, we store roles strictly in Supabase Auth app_metadata, which can only
// be updated server-side by the admin API (service role key). Clients cannot modify app_metadata.

const { getSupabaseAdmin } = require('../lib/supabase');
const AppError = require('../utils/AppError');

const VALID_ROLES = ['admin', 'staff', 'customer'];

/**
 * Retrieve the role for a given user ID.
 * Defaults to 'customer' if user has no role or is not found.
 *
 * @param {string} userId
 * @returns {Promise<'admin' | 'staff' | 'customer'>}
 */
async function getRole(userId) {
  if (!userId) {
    return 'customer';
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (error || !data || !data.user) {
      return 'customer';
    }

    const assignedRole = data.user.app_metadata?.role;
    if (VALID_ROLES.includes(assignedRole)) {
      return assignedRole;
    }

    return 'customer';
  } catch (_err) {
    return 'customer';
  }
}

/**
 * Assign a role to a user. Must be called server-side via Supabase Admin API.
 *
 * @param {string} userId
 * @param {'admin' | 'staff' | 'customer'} role
 * @returns {Promise<'admin' | 'staff' | 'customer'>}
 */
async function setRole(userId, role) {
  if (!VALID_ROLES.includes(role)) {
    throw new AppError(
      `Invalid role: "${role}". Allowed roles: ${VALID_ROLES.join(', ')}`,
      400,
      'BAD_REQUEST'
    );
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  });

  if (error || !data || !data.user) {
    throw new AppError(
      `Failed to assign role to user: ${error?.message || 'Unknown error'}`,
      500,
      'INTERNAL_ERROR'
    );
  }

  return role;
}

module.exports = {
  VALID_ROLES,
  getRole,
  setRole,
};
