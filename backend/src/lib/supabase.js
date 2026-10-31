const { createClient } = require('@supabase/supabase-js');
const { env } = require('../config/env');

function getSupabaseAdmin(customConfig) {
  if (global.__brightloop_injected_admin) {
    return global.__brightloop_injected_admin;
  }
  const config = customConfig || env;
  return createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getSupabasePublic(customConfig) {
  if (global.__brightloop_injected_public) {
    return global.__brightloop_injected_public;
  }
  const config = customConfig || env;
  return createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function setInjectedClients({ admin, publicClient } = {}) {
  global.__brightloop_injected_admin = admin || null;
  global.__brightloop_injected_public = publicClient || null;
}

function resetInjectedClients() {
  global.__brightloop_injected_admin = null;
  global.__brightloop_injected_public = null;
}

module.exports = {
  getSupabaseAdmin,
  getSupabasePublic,
  setInjectedClients,
  resetInjectedClients,
};
