const { z } = require('zod');

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  PASSWORD_RESET_REDIRECT_URL: z.string().url().default('http://localhost:5173/reset-password'),
});

function getEnv(overrides = {}) {
  const nodeEnv = overrides.NODE_ENV || process.env.NODE_ENV || 'development';
  const isTest = nodeEnv === 'test';

  if (!isTest) {
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ];
    const missing = requiredVars.filter((v) => {
      const val = overrides[v] ?? process.env[v];
      return !val || val.includes('your-');
    });
    if (missing.length > 0) {
      throw new Error(
        `[CONFIG ERROR] Missing required environment variable(s): ${missing.join(', ')}. Please configure them in your environment or .env file.`
      );
    }
  }

  const raw = {
    PORT: overrides.PORT ?? process.env.PORT ?? 5000,
    NODE_ENV: nodeEnv,
    CORS_ORIGIN: overrides.CORS_ORIGIN ?? process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    SUPABASE_URL: overrides.SUPABASE_URL ?? process.env.SUPABASE_URL ?? (isTest ? 'https://test.supabase.co' : undefined),
    SUPABASE_ANON_KEY: overrides.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? (isTest ? 'test-anon-key' : undefined),
    SUPABASE_SERVICE_ROLE_KEY: overrides.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? (isTest ? 'test-service-role-key' : undefined),
    PASSWORD_RESET_REDIRECT_URL: overrides.PASSWORD_RESET_REDIRECT_URL ?? process.env.PASSWORD_RESET_REDIRECT_URL ?? 'http://localhost:5173/reset-password',
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
