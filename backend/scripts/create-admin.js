#!/usr/bin/env node

/**
 * Script to create an Administrator account.
 * Reads credentials from CLI arguments or environment variables.
 * NEVER hard-code credentials.
 *
 * Usage:
 *   node scripts/create-admin.js --email=admin@brightloop.local --password="AdminPassword123!" --name="Sanju Architect"
 *   OR with environment variables:
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME=... node scripts/create-admin.js
 */

require('dotenv').config();

const { staffSchema } = require('../src/validators/auth.validators');
const { getSupabaseAdmin } = require('../src/lib/supabase');
const roleStore = require('../src/services/roleStore');

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};

  for (const arg of args) {
    if (arg.startsWith('--email=')) {
      parsed.email = arg.split('=')[1];
    } else if (arg.startsWith('--password=')) {
      parsed.password = arg.split('=')[1];
    } else if (arg.startsWith('--name=')) {
      parsed.full_name = arg.split('=')[1];
    }
  }

  return {
    email: parsed.email || process.env.ADMIN_EMAIL,
    password: parsed.password || process.env.ADMIN_PASSWORD,
    full_name: parsed.full_name || process.env.ADMIN_NAME,
  };
}

async function main() {
  const rawInput = parseArgs();

  // Validate input parameters against strict password & email schemas
  const validationResult = staffSchema.safeParse(rawInput);
  if (!validationResult.success) {
    console.error('[CREATE-ADMIN ERROR] Invalid input parameters:');
    for (const issue of validationResult.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  const { email, password, full_name } = validationResult.data;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    console.log(`[CREATE-ADMIN] Creating admin account for email: ${email}...`);

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (error) {
      console.error(`[CREATE-ADMIN ERROR] Failed to create user: ${error.message}`);
      process.exit(1);
    }

    const userId = data.user.id;
    await roleStore.setRole(userId, 'admin');

    console.log('[CREATE-ADMIN SUCCESS] Admin account provisioned successfully.');
    console.log(`  - User ID: ${userId}`);
    console.log(`  - Email: ${email}`);
    console.log('  - Role: admin');
  } catch (err) {
    console.error(`[CREATE-ADMIN UNEXPECTED ERROR] ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
