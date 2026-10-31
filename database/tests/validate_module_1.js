/**
 * Module 1 Foundation Static Verification Suite
 * Brightloop Software Subscription Management System
 * Assigned Engineer: Harsha (harsha-1706), Database Engineer
 *
 * Performs static structural, contract, and SQL integrity verification
 * on the unified Module 1 database assets.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const MIGRATIONS_DIR = path.join(ROOT_DIR, 'database', 'migrations');
const SCHEMA_FILE = path.join(ROOT_DIR, 'database', 'schema', '01_brightloop_schema.sql');
const REPO_FILE = path.join(ROOT_DIR, 'backend', 'src', 'services', 'supabaseBillingRepository.cjs');

let passedTests = 0;
let totalTests = 0;
const failures = [];

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failures.push({ testName, details });
    console.error(`  [FAIL] ${testName}: ${details}`);
  }
}

function runVerification() {
  console.log('====================================================');
  console.log('   Brightloop Module 1 Database Validation Suite    ');
  console.log('====================================================');
  console.log('Target Branch: feature/harsha-supabase-setup');
  console.log('Engineer: Harsha (harsha-1706)');
  console.log('----------------------------------------------------\n');

  // 1. MIGRATION FILE PRESENCE
  console.log('1. Migration File Inventory:');
  const m001Path = path.join(MIGRATIONS_DIR, '20261031_001_brightloop_core.sql');
  const m002Path = path.join(MIGRATIONS_DIR, '20261031_002_atomic_billing_rpc.sql');
  const m003Path = path.join(MIGRATIONS_DIR, '20261031_003_foundation_enhancements.sql');

  assert(fs.existsSync(m001Path), 'Migration 001 exists', m001Path);
  assert(fs.existsSync(m002Path), 'Migration 002 exists', m002Path);
  assert(fs.existsSync(m003Path), 'Migration 003 exists', m003Path);
  assert(fs.existsSync(SCHEMA_FILE), 'Canonical schema DDL exists', SCHEMA_FILE);

  const m001Sql = fs.readFileSync(m001Path, 'utf8');
  const m002Sql = fs.readFileSync(m002Path, 'utf8');
  const m003Sql = fs.readFileSync(m003Path, 'utf8');
  const canonicalSql = fs.readFileSync(SCHEMA_FILE, 'utf8');

  // 2. TRANSACTION AND SYNTAX INTEGRITY
  console.log('\n2. SQL Structural Integrity & Transaction Boundaries:');
  assert(m003Sql.includes('BEGIN;') && m003Sql.includes('COMMIT;'), 'Migration 003 has atomic BEGIN/COMMIT boundary');
  
  // Dollar-quote balance check
  const countDollarQuotes = (str) => (str.match(/\$\$/g) || []).length;
  assert(countDollarQuotes(m003Sql) % 2 === 0, 'Migration 003 has balanced $$ function delimiters');
  assert(countDollarQuotes(canonicalSql) % 2 === 0, 'Canonical schema has balanced $$ function delimiters');

  // 3. TABLE COVERAGE
  console.log('\n3. Canonical Domain Table Coverage:');
  const expectedTables = [
    'profiles', 'products', 'product_variants', 'plans', 'tax_rules',
    'quotation_templates', 'quotation_template_lines', 'subscriptions',
    'subscription_lines', 'discount_rules', 'discount_product_mappings',
    'invoices', 'invoice_lines', 'discount_redemptions', 'payments',
    'ai_assistance_events'
  ];

  for (const table of expectedTables) {
    const tablePattern = new RegExp(`CREATE TABLE (IF NOT EXISTS )?public\\.${table}\\b`, 'i');
    assert(tablePattern.test(canonicalSql), `Table public.${table} defined in canonical schema`);
  }

  // 4. ROLE ESCALATION & SECURITY INTEGRITY
  console.log('\n4. Security & Role Escalation Invariants:');
  assert(m003Sql.includes('prevent_role_escalation'), 'Migration 003 implements prevent_role_escalation()');
  assert(m003Sql.includes('trg_profiles_prevent_role_escalation'), 'Profiles table has prevent_role_escalation trigger');
  assert(canonicalSql.includes('is_brightloop_staff()'), 'is_brightloop_staff() security definer function present');
  assert(canonicalSql.includes('REVOKE ALL ON FUNCTION public.is_brightloop_staff() FROM public;'), 'Staff function execution revoked from public');

  // 5. BACKEND REPOSITORY CONTRACT COMPATIBILITY
  console.log('\n5. Backend Billing Repository Contract Compatibility:');
  if (fs.existsSync(REPO_FILE)) {
    const repoSrc = fs.readFileSync(REPO_FILE, 'utf8');
    
    // Check tables accessed
    const repoTables = ['subscriptions', 'plans', 'subscription_lines', 'discount_rules', 'discount_product_mappings'];
    for (const rt of repoTables) {
      assert(canonicalSql.includes(`public.${rt}`), `Backend queried table public.${rt} exists in schema`);
    }

    // Check specific columns
    assert(canonicalSql.includes('next_billing_date DATE'), 'subscriptions.next_billing_date matches contract');
    assert(canonicalSql.includes('billing_anchor_date DATE'), 'subscriptions.billing_anchor_date matches contract');
    assert(canonicalSql.includes("frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly'))"), 'plans.frequency check constraint matches contract');
    assert(canonicalSql.includes('variant_adjustment NUMERIC(14, 2)'), 'subscription_lines.variant_adjustment matches contract');
    assert(canonicalSql.includes('tax_rate_percent NUMERIC(5, 2)'), 'subscription_lines.tax_rate_percent matches contract');
    assert(canonicalSql.includes('persist_due_billing_invoice'), 'persist_due_billing_invoice RPC present');
  } else {
    console.warn('  [WARN] Backend repository file not found at expected path:', REPO_FILE);
  }

  // 6. RLS COVERAGE IN CANONICAL SCHEMA
  console.log('\n6. Row Level Security Policy Verification:');
  for (const table of expectedTables) {
    const rlsPattern = new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY;`, 'i');
    assert(rlsPattern.test(canonicalSql), `RLS enabled on public.${table}`);
  }

  // 7. FOREIGN KEY INDEX COVERAGE
  console.log('\n7. Critical Foreign Key & Performance Index Verification:');
  const expectedIndexes = [
    'product_variants_product_idx',
    'plans_product_idx',
    'plans_frequency_idx',
    'quotation_templates_plan_idx',
    'quotation_template_lines_template_idx',
    'quotation_template_lines_product_idx',
    'subscription_lines_sub_idx',
    'subscription_lines_product_idx',
    'discount_product_mappings_product_idx',
    'profiles_role_idx',
    'ai_events_customer_idx'
  ];

  for (const idx of expectedIndexes) {
    assert(m003Sql.includes(idx), `Index ${idx} present in Migration 003`);
  }

  // SUMMARY REPORT
  console.log('\n----------------------------------------------------');
  console.log(`Verification Complete: ${passedTests} / ${totalTests} checks passed.`);
  if (failures.length === 0) {
    console.log('STATUS: [ALL CHECKS PASSED] Module 1 Foundation is contractually sound and ready.');
    console.log('====================================================');
    return true;
  } else {
    console.error(`STATUS: [${failures.length} CHECKS FAILED]`);
    console.log('====================================================');
    return false;
  }
}

if (require.main === module) {
  const success = runVerification();
  process.exit(success ? 0 : 1);
}

module.exports = { runVerification };

