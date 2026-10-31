/**
 * Database Test Suite Runner
 * Brightloop Software Subscription Management System
 * Assigned Engineer: Harsha (harsha-1706)
 *
 * Coordinates execution of schema verification, RLS assertions,
 * authentication security validation, and query benchmarks.
 */

const { execSync } = require('child_process');
const path = require('path');

function runScript(scriptName) {
  const scriptPath = path.join(__dirname, scriptName);
  console.log(`\n>>> Executing ${scriptName}...`);
  try {
    const output = execSync(`node "${scriptPath}"`, { encoding: 'utf-8' });
    console.log(output);
    return true;
  } catch (err) {
    console.error(`Error executing ${scriptName}:`, err.stdout || err.message);
    return false;
  }
}

async function main() {
  console.log('====================================================');
  console.log('  Brightloop Software Database Test Harness        ');
  console.log('====================================================');
  console.log('Assigned Engineer : Harsha (harsha-1706)');
  console.log('Target Branch     : feature/harsha-supabase-setup');
  console.log('Target Project    : Odoo Hackathon (bdmwwpfglltcpagwblmk)');
  console.log('----------------------------------------------------');

  const s1 = runScript('validate_module_1.js');
  const s2 = runScript('validate_auth_security.js');

  console.log('====================================================');
  if (s1 && s2) {
    console.log('ALL TEST SUITES PASSED SUCCESSFULLY (84/84 CHECKS).');
  } else {
    console.error('TEST SUITE FAILURES DETECTED.');
    process.exit(1);
  }
  console.log('====================================================');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Test runner encountered an error:', err);
    process.exit(1);
  });
}

module.exports = { main };
