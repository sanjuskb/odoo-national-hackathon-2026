/**
 * Supabase & PostgreSQL Connection Health Check
 * Odoo National Level Hackathon 2026
 * Assigned Engineer: Harsha (harsha-1706)
 *
 * Safe, non-destructive health check script.
 * Validates environment configuration without logging or leaking secret credentials.
 */

const fs = require('fs');
const path = require('path');

function checkEnvironment() {
  console.log('====================================================');
  console.log('       Supabase Database Connectivity Check         ');
  console.log('====================================================');
  console.log('Workspace Directory : E:\\Projects\\Odoo-Team');
  console.log('Target Branch       : feature/harsha-supabase-setup');
  console.log('Engineer            : Harsha (harsha-1706)');
  console.log('----------------------------------------------------');

  const envPath = path.resolve(__dirname, '../../.env');
  const envExamplePath = path.resolve(__dirname, '../../.env.example');

  const hasEnv = fs.existsSync(envPath);
  const hasEnvExample = fs.existsSync(envExamplePath);

  console.log(`[Config] .env.example exists : ${hasEnvExample ? 'YES' : 'NO'}`);
  console.log(`[Config] Local .env exists   : ${hasEnv ? 'YES' : 'NO (Create from .env.example)'}`);

  const supabaseUrl = process.env.SUPABASE_URL;
  const hasAnonKey = Boolean(process.env.SUPABASE_ANON_KEY);
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

  console.log('----------------------------------------------------');
  console.log(`SUPABASE_URL configured     : ${supabaseUrl ? 'YES (' + new URL(supabaseUrl).host + ')' : 'NO'}`);
  console.log(`SUPABASE_ANON_KEY present   : ${hasAnonKey ? 'YES (Masked)' : 'NO'}`);
  console.log(`SUPABASE_SERVICE_KEY present: ${hasServiceKey ? 'YES (Masked)' : 'NO'}`);
  console.log(`DATABASE_URL present        : ${hasDatabaseUrl ? 'YES (Masked)' : 'NO'}`);
  console.log('----------------------------------------------------');

  if (!supabaseUrl && !hasDatabaseUrl) {
    console.log('Status: Stage 1 Workspace Preparation Complete.');
    console.log('Credentials will be supplied when Supabase project is linked in Stage 2.');
  } else {
    console.log('Status: Credentials detected. Ready for Stage 2 connectivity verification.');
  }
  console.log('====================================================');
}

if (require.main === module) {
  checkEnvironment();
}

module.exports = { checkEnvironment };

