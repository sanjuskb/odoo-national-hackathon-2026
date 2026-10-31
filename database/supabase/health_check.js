/**
 * Supabase & PostgreSQL Connection Health Check
 * Brightloop Software Subscription Management System
 * Assigned Engineer: Harsha (harsha-1706)
 *
 * Safe, non-destructive health check script.
 * Validates development project target (sldgofxhcfswcmcpebwv) and connection readiness.
 */

const fs = require('fs');
const path = require('path');

function checkEnvironment() {
  console.log('====================================================');
  console.log('    Brightloop Database Connection Health Check     ');
  console.log('====================================================');
  console.log('Workspace Directory : E:\\Projects\\Odoo-Team');
  console.log('Target Branch       : feature/harsha-supabase-setup');
  console.log('Target Project      : Odoo Hackathon Dev (sldgofxhcfswcmcpebwv)');
  console.log('Shared Project      : Odoo Hackathon (bdmwwpfglitcpagwblmk) [PROTECTED]');
  console.log('----------------------------------------------------');

  const envPath = path.resolve(__dirname, '../../.env');
  const envExamplePath = path.resolve(__dirname, '../../.env.example');

  const hasEnv = fs.existsSync(envPath);
  const hasEnvExample = fs.existsSync(envExamplePath);

  console.log(`[Config] .env.example exists : ${hasEnvExample ? 'YES' : 'NO'}`);
  console.log(`[Config] Local .env exists   : ${hasEnv ? 'YES' : 'NO'}`);

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

  if (supabaseUrl && supabaseUrl.includes('bdmwwpfglitcpagwblmk')) {
    console.error('CRITICAL WARNING: Configuration is pointing to SHARED project (bdmwwpfglitcpagwblmk)!');
    console.error('Mandate requires development against dev project (sldgofxhcfswcmcpebwv).');
  } else if (supabaseUrl && supabaseUrl.includes('sldgofxhcfswcmcpebwv')) {
    console.log('Verification: Target project correctly set to Odoo Hackathon Dev (sldgofxhcfswcmcpebwv).');
  }

  console.log('====================================================');
}

if (require.main === module) {
  checkEnvironment();
}

module.exports = { checkEnvironment };
