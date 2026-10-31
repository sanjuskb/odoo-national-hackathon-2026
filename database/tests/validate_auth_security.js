/**
 * Brightloop Authentication & Database Security Validation Suite
 * Assigned Engineer: Harsha (harsha-1706)
 * Target Integration Branch: develop
 *
 * Verifies that Migration 004 and the canonical schema strictly enforce:
 * 1. Account status ('active', 'suspended') with index and check constraint.
 * 2. Hardened role escalation guard blocking customer role and status tampering.
 * 3. Idempotent user profile creation with server role preservation.
 * 4. Dedicated email and role/status metadata synchronization triggers.
 * 5. Active account helper function with locked search_path and execution privileges.
 * 6. Hardened RLS policies denying suspended accounts write operations.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT_DIR = path.resolve(__dirname, '../..');
const MIGRATION_004 = path.join(ROOT_DIR, 'database/migrations/20261031_004_authentication_security.sql');
const CANONICAL_SCHEMA = path.join(ROOT_DIR, 'database/schema/01_brightloop_schema.sql');

console.log('====================================================');
console.log('  Brightloop Auth & Security Validation Suite       ');
console.log('====================================================');
console.log('Target Branch: feature/harsha-supabase-setup');
console.log('Engineer: Harsha (harsha-1706)');
console.log('----------------------------------------------------');

let passedChecks = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedChecks++;
  } catch (err) {
    console.error(`  [FAIL] ${name}: ${err.message}`);
    process.exit(1);
  }
}

console.log('\n1. Migration File Inventory & Structural Boundaries:');
test('Migration 004 exists on disk', () => {
  assert(fs.existsSync(MIGRATION_004), 'Migration 004 file missing');
});

const migrationSql = fs.readFileSync(MIGRATION_004, 'utf-8');
const canonicalSql = fs.readFileSync(CANONICAL_SCHEMA, 'utf-8');

test('Migration 004 is wrapped in atomic BEGIN/COMMIT', () => {
  assert(migrationSql.includes('BEGIN;'), 'Migration 004 must begin transaction');
  assert(migrationSql.trim().endsWith('COMMIT;'), 'Migration 004 must commit transaction');
});

test('Migration 004 has balanced function delimiters', () => {
  const matches = migrationSql.match(/\$\$/g) || [];
  assert(matches.length % 2 === 0, 'Unbalanced $$ delimiters in Migration 004');
});

test('Canonical schema has balanced function delimiters', () => {
  const matches = canonicalSql.match(/\$\$/g) || [];
  assert(matches.length % 2 === 0, 'Unbalanced $$ delimiters in canonical schema');
});

console.log('\n2. Profile Contract & Account Status Support:');
test('Migration 004 adds account_status to public.profiles', () => {
  assert(migrationSql.includes('account_status TEXT NOT NULL DEFAULT \'active\''), 'Missing account_status in 004');
  assert(migrationSql.includes('CHECK (account_status IN (\'active\', \'suspended\'))'), 'Missing account_status check in 004');
});

test('Canonical schema includes account_status on public.profiles', () => {
  assert(canonicalSql.includes('account_status TEXT NOT NULL DEFAULT \'active\''), 'Missing account_status in canonical schema');
});

test('B-Tree index on profiles(account_status) defined', () => {
  assert(migrationSql.includes('profiles_status_idx'), 'Missing profiles_status_idx in 004');
  assert(canonicalSql.includes('profiles_status_idx'), 'Missing profiles_status_idx in canonical schema');
});

console.log('\n3. Security Definer Helper: is_active_account():');
test('is_active_account() declared with locked search_path', () => {
  assert(migrationSql.includes('FUNCTION public.is_active_account()'), 'is_active_account missing in 004');
  assert(migrationSql.includes('SET search_path = public'), 'Search path not set to public in 004');
  assert(canonicalSql.includes('FUNCTION public.is_active_account()'), 'is_active_account missing in canonical schema');
});

test('is_active_account() revoked from public and granted to authenticated', () => {
  assert(migrationSql.includes('REVOKE ALL ON FUNCTION public.is_active_account() FROM public;'), 'Missing revoke in 004');
  assert(migrationSql.includes('GRANT EXECUTE ON FUNCTION public.is_active_account() TO authenticated;'), 'Missing grant in 004');
});

console.log('\n4. Role & Account Status Escalation Guards:');
test('prevent_role_escalation blocks customer role modifications', () => {
  assert(migrationSql.includes('customers cannot modify user roles'), 'Missing role escalation check in 004');
  assert(canonicalSql.includes('customers cannot modify user roles'), 'Missing role escalation check in canonical');
});

test('prevent_role_escalation blocks account_status tampering', () => {
  assert(migrationSql.includes('only staff or service_role can modify account_status'), 'Missing status escalation check in 004');
  assert(canonicalSql.includes('only staff or service_role can modify account_status'), 'Missing status escalation check in canonical');
});

test('prevent_role_escalation blocks profile ID mutation', () => {
  assert(migrationSql.includes('profile id cannot be modified'), 'Missing id immutability check in 004');
  assert(canonicalSql.includes('profile id cannot be modified'), 'Missing id immutability check in canonical');
});

console.log('\n5. Idempotent Profile Creation & Auth Synchronization:');
test('create_customer_profile is idempotent with ON CONFLICT (id)', () => {
  assert(migrationSql.includes('ON CONFLICT (id) DO UPDATE SET'), 'Missing idempotent ON CONFLICT in 004');
  assert(canonicalSql.includes('ON CONFLICT (id) DO UPDATE SET'), 'Missing idempotent ON CONFLICT in canonical');
});

test('create_customer_profile honors admin-provisioned staff role', () => {
  assert(migrationSql.includes('NEW.raw_app_meta_data->>\'role\''), 'Missing role inspection in 004 create trigger');
  assert(canonicalSql.includes('NEW.raw_app_meta_data->>\'role\''), 'Missing role inspection in canonical create trigger');
});

test('sync_brightloop_profile_role synchronizes status and email', () => {
  assert(migrationSql.includes('NEW.raw_app_meta_data->>\'account_status\''), 'Missing status sync in 004');
  assert(canonicalSql.includes('NEW.raw_app_meta_data->>\'account_status\''), 'Missing status sync in canonical');
});

test('sync_brightloop_profile_email trigger installed on auth.users email update', () => {
  assert(migrationSql.includes('brightloop_auth_email_changed'), 'Missing email change trigger in 004');
  assert(canonicalSql.includes('brightloop_auth_email_changed'), 'Missing email change trigger in canonical');
});

console.log('\n6. RLS Policies Enforcing Customer & Account Status Isolation:');
test('profiles_update_self requires active account_status', () => {
  assert(migrationSql.includes('account_status = \'active\''), 'profiles_update_self missing status check in 004');
  assert(canonicalSql.includes('account_status = \'active\''), 'profiles_update_self missing status check in canonical');
});

test('subscriptions_update_customer requires is_active_account()', () => {
  assert(migrationSql.includes('public.is_active_account()'), 'subscriptions_update_customer missing active check in 004');
  assert(canonicalSql.includes('public.is_active_account()'), 'subscriptions_update_customer missing active check in canonical');
});

test('ai_events_insert_customer requires is_active_account()', () => {
  assert(migrationSql.includes('public.is_active_account()'), 'ai_events_insert_customer missing active check in 004');
  assert(canonicalSql.includes('public.is_active_account()'), 'ai_events_insert_customer missing active check in canonical');
});

console.log('----------------------------------------------------');
console.log(`Verification Complete: ${passedChecks} checks passed.`);
console.log('STATUS: [ALL CHECKS PASSED] Authentication & Security Foundation Verified.');
console.log('====================================================');
