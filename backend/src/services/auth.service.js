const { getSupabaseAdmin, getSupabasePublic } = require('../lib/supabase');
const { env } = require('../config/env');
const roleStore = require('./roleStore');
const AppError = require('../utils/AppError');

/**
 * Register a new customer account.
 * Role is ALWAYS 'customer', regardless of any client-supplied role.
 */
async function register({ email, password, full_name }) {
  const supabaseAdmin = getSupabaseAdmin();

  // Create user with email_confirm: true so hackathon demo accounts work immediately
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (error) {
    const errorMsg = error.message?.toLowerCase() || '';
    if (
      error.status === 422 ||
      error.status === 409 ||
      errorMsg.includes('already registered') ||
      errorMsg.includes('already exists') ||
      errorMsg.includes('duplicate')
    ) {
      throw new AppError('An account with this email already exists', 409, 'CONFLICT');
    }
    throw new AppError(error.message || 'Failed to create user account', error.status || 500, 'REGISTRATION_ERROR');
  }

  const user = data.user;
  // Secure role assignment through roleStore
  await roleStore.setRole(user.id, 'customer');

  return {
    id: user.id,
    email: user.email,
    full_name,
    role: 'customer',
  };
}

/**
 * Authenticate user credentials and return session tokens.
 */
async function login({ email, password }) {
  const supabasePublic = getSupabasePublic();

  const { data, error } = await supabasePublic.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data || !data.session || !data.user) {
    // Generic failure message to prevent email enumeration or credential leaking
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const role = await roleStore.getRole(data.user.id);

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    user: {
      id: data.user.id,
      email: data.user.email,
      role,
    },
  };
}

/**
 * Trigger password reset for registered email address.
 * Timing-safe and enumeration-safe: returns same message always.
 */
async function forgotPassword({ email }) {
  const supabasePublic = getSupabasePublic();

  try {
    await supabasePublic.auth.resetPasswordForEmail(email, {
      redirectTo: env.PASSWORD_RESET_REDIRECT_URL,
    });
  } catch (_err) {
    // Intentionally suppressed: do not reveal whether email exists
  }

  return {
    message: 'If your email is registered, you will receive a password reset link.',
  };
}

/**
 * Create an internal staff member. Caller must be verified admin.
 */
async function createStaff({ email, password, full_name }) {
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (error) {
    const errorMsg = error.message?.toLowerCase() || '';
    if (
      error.status === 422 ||
      error.status === 409 ||
      errorMsg.includes('already registered') ||
      errorMsg.includes('already exists') ||
      errorMsg.includes('duplicate')
    ) {
      throw new AppError('An account with this email already exists', 409, 'CONFLICT');
    }
    throw new AppError(error.message || 'Failed to create staff account', error.status || 500, 'STAFF_CREATION_ERROR');
  }

  const user = data.user;
  await roleStore.setRole(user.id, 'staff');

  return {
    id: user.id,
    email: user.email,
    full_name,
    role: 'staff',
  };
}

module.exports = {
  register,
  login,
  forgotPassword,
  createStaff,
};
