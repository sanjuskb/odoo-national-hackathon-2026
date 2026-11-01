const { z } = require('zod');

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  PASSWORD_RESET_REDIRECT_URL: z.string().url().default('http://localhost:5173/reset-password'),
  USE_MOCK_DB: z.boolean().default(false),
});

function getEnv(overrides = {}) {
  const nodeEnv = overrides.NODE_ENV || process.env.NODE_ENV || 'development';
  const isTest = nodeEnv === 'test';

  const rawUrl = overrides.SUPABASE_URL ?? process.env.SUPABASE_URL;
  const rawAnonKey = overrides.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  const rawServiceKey = overrides.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  const hasRealSupabase = Boolean(
    rawUrl &&
    rawAnonKey &&
    rawServiceKey &&
    !rawUrl.includes('your-') &&
    !rawUrl.includes('[YOUR-PROJECT-REF]') &&
    !rawAnonKey.includes('your_') &&
    !rawServiceKey.includes('your_')
  );

  const useMockDb = overrides.USE_MOCK_DB !== undefined
    ? Boolean(overrides.USE_MOCK_DB)
    : (process.env.USE_MOCK_DB === 'true' || (!hasRealSupabase && !isTest && nodeEnv === 'development'));

  if (!isTest && !useMockDb) {
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ];
    const missing = requiredVars.filter((v) => {
      const val = overrides[v] ?? process.env[v];
      return !val || val.includes('your-') || val.includes('[YOUR-PROJECT-REF]');
    });
    if (missing.length > 0) {
      throw new Error(
        `[CONFIG ERROR] Missing required environment variable(s): ${missing.join(', ')}. Please configure them in your environment or .env file, or set USE_MOCK_DB=true for local in-memory development.`
      );
    }
  }

  const raw = {
    PORT: overrides.PORT ?? process.env.PORT ?? 5000,
    NODE_ENV: nodeEnv,
    CORS_ORIGIN: overrides.CORS_ORIGIN ?? process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    SUPABASE_URL: overrides.SUPABASE_URL ?? process.env.SUPABASE_URL ?? (isTest ? 'https://test.supabase.co' : (useMockDb ? 'https://mock.brightloop.local' : undefined)),
    SUPABASE_ANON_KEY: overrides.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? (isTest ? 'test-anon-key' : (useMockDb ? 'mock-anon-key-brightloop' : undefined)),
    SUPABASE_SERVICE_ROLE_KEY: overrides.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? (isTest ? 'test-service-role-key' : (useMockDb ? 'mock-service-role-key-brightloop' : undefined)),
    PASSWORD_RESET_REDIRECT_URL: overrides.PASSWORD_RESET_REDIRECT_URL ?? process.env.PASSWORD_RESET_REDIRECT_URL ?? 'http://localhost:5173/reset-password',
    USE_MOCK_DB: useMockDb,
  };

  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const formatted = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`[CONFIG ERROR] Invalid environment configuration: ${formatted}`);
  }

  return parsed.data;
}

// Lazy/cached getter so requiring this module outside test won't crash prematurely
// if dotenv hasn't been loaded yet
let cachedEnv = null;

function resolveEnv() {
  if (!cachedEnv || process.env.NODE_ENV === 'test') {
    cachedEnv = getEnv();
  }
  return cachedEnv;
}

module.exports = {
  get env() {
    return resolveEnv();
  },
  getEnv,
};
