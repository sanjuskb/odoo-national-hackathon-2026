'use strict';

/**
 * Performance Benchmark Script for Brightloop Reports & Invoicing
 *
 * MOCK in-memory data - NOT evidence of real Supabase latency
 */

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const path = require('path');
const request = require('supertest');
const app = require('../src/app');
const { setInjectedClients, resetInjectedClients } = require('../src/lib/supabase');
const { createSupabaseMock } = require('../tests/mocks/supabase.mock');
const reportsRepo = require('../src/repositories/reports.repository');
const reportCache = require('../src/utils/reportCache');

function calculateStats(timings) {
  const sorted = [...timings].sort((a, b) => a - b);
  const min = sorted[0].toFixed(2);
  const median = sorted[Math.floor(sorted.length / 2)].toFixed(2);
  const max = sorted[sorted.length - 1].toFixed(2);
  return { min, median, max };
}

async function runMockBenchmark() {
  console.log('========================================================================');
  console.log('  DATA SOURCE: MOCK in-memory data - NOT evidence of real Supabase latency');
  console.log('========================================================================');

  const mock = createSupabaseMock();
  setInjectedClients({
    admin: mock.adminClient,
    publicClient: mock.publicClient,
  });

  const adminToken = mock.seedUser({
    id: 'a0000000-0000-4000-8000-000000000099',
    email: 'admin@brightloop.local',
    role: 'admin',
  }).token;

  console.log('Generating synthetic dataset: 5,000 subscriptions, 20,000 invoices, 15,000 payments...');
  const t0 = performance.now();

  // 1. Seed 5,000 subscriptions
  const subIds = [];
  for (let i = 1; i <= 5000; i++) {
    const id = `00000000-0000-4000-8000-${i.toString().padStart(12, '0')}`;
    subIds.push(id);
    mock.seedSubscription({
      id,
      subscription_number: `SUB-202610-${i.toString().padStart(6, '0')}`,
      customer_id: 'a0000000-0000-4000-8000-000000000001',
      plan_id: 'b0000000-0000-4000-8000-000000000001',
      status: i % 10 === 0 ? 'closed' : i % 5 === 0 ? 'draft' : 'active',
      is_paused: i % 8 === 0,
      start_date: '2026-01-01',
      expiry_date: '2027-01-01',
    });
  }

  // 2. Seed 20,000 invoices
  const statuses = ['draft', 'confirmed', 'paid', 'cancelled'];
  const invIds = [];
  for (let i = 1; i <= 20000; i++) {
    const id = `11111111-1111-4111-8111-${i.toString().padStart(12, '0')}`;
    invIds.push(id);
    const status = statuses[i % statuses.length];
    const isOverdue = status === 'confirmed' && i % 3 === 0;
    const dueDate = isOverdue ? '2026-10-15' : '2026-11-15';
    mock.seedInvoice({
      id,
      invoice_number: `INV-202610-${i.toString().padStart(6, '0')}`,
      subscription_id: subIds[i % subIds.length],
      customer_id: 'a0000000-0000-4000-8000-000000000001',
      status,
      total: '1000.00',
      due_date: dueDate,
      created_at: `2026-10-${String((i % 28) + 1).padStart(2, '0')}T10:00:00.000Z`,
    });
  }

  // 3. Seed 15,000 payments
  const methods = ['cash', 'bank_transfer', 'upi', 'card', 'cheque', 'other'];
  for (let i = 1; i <= 15000; i++) {
    const id = `22222222-2222-4222-8222-${i.toString().padStart(12, '0')}`;
    mock.seedPayment({
      id,
      invoice_id: invIds[i % invIds.length],
      amount: '500.00',
      payment_date: `2026-10-${String((i % 28) + 1).padStart(2, '0')}`,
      method: methods[i % methods.length],
    });
  }

  const tGen = ((performance.now() - t0) / 1000).toFixed(2);
  console.log(`Dataset created in ${tGen}s.`);
  console.log('Measuring database round trips and latency (MOCK data)...');
  console.log('------------------------------------------------------------------------');

  const benchmarks = [
    {
      name: 'GET /api/v1/reports/summary (FALLBACK Chunked Path)',
      path: '/api/v1/reports/summary?from=2026-10-01&to=2026-10-31&refresh=true',
      setup: () => {
        reportsRepo.resetRpcStatusForTest();
        reportsRepo.setRpcStatusForTest({ available: false });
        reportCache.clear();
      },
    },
    {
      name: 'GET /api/v1/reports/summary (RPC Optimized Path)',
      path: '/api/v1/reports/summary?from=2026-10-01&to=2026-10-31&refresh=true',
      setup: () => {
        mock.registerRpc('get_finance_summary_report', () => ({
          active_subscriptions: 3000,
          paused_subscriptions: 625,
          revenue_invoiced: '10000000.00',
          revenue_collected: '7500000.00',
          outstanding_balance: '2500000.00',
          overdue_count: 1666,
          overdue_amount: '1666000.00',
          as_of: '2026-10-31',
        }));
        reportsRepo.setRpcStatusForTest({ available: true });
        reportCache.clear();
      },
    },
    {
      name: 'GET /api/v1/reports/overdue-invoices',
      path: '/api/v1/reports/overdue-invoices?page=1&limit=20',
      setup: () => {},
    },
    {
      name: 'GET /api/v1/reports/payments',
      path: '/api/v1/reports/payments?page=1&limit=20',
      setup: () => {},
    },
    {
      name: 'GET /api/v1/reports/subscriptions',
      path: '/api/v1/reports/subscriptions?refresh=true',
      setup: () => {
        reportCache.clear();
      },
    },
    {
      name: 'GET /api/v1/invoices?limit=100',
      path: '/api/v1/invoices?page=1&limit=100',
      setup: () => {},
    },
    {
      name: 'GET /api/v1/payments',
      path: '/api/v1/payments?page=1&limit=20',
      setup: () => {},
    },
  ];

  const results = [];

  for (const b of benchmarks) {
    b.setup();
    const timings = [];
    let recordedRoundTrips = 0;

    for (let run = 1; run <= 5; run++) {
      mock.resetRoundTripCount();
      const start = performance.now();
      const res = await request(app)
        .get(b.path)
        .set('Authorization', `Bearer ${adminToken}`);
      const duration = performance.now() - start;

      if (res.status !== 200) {
        console.error(`Error on ${b.name}: ${res.status}`, res.body);
      }
      timings.push(duration);
      recordedRoundTrips = mock.getRoundTripCount();
    }
    const stats = calculateStats(timings);
    const est60 = recordedRoundTrips * 60;
    const est120 = recordedRoundTrips * 120;

    results.push({
      Endpoint: b.name,
      'DB Round Trips': recordedRoundTrips,
      'Measured (ms)': `${stats.median} ms`,
      'Est @ 60ms RTT': `${est60} ms`,
      'Est @ 120ms RTT': `${est120} ms`,
    });
  }

  console.table(results);
  console.log('------------------------------------------------------------------------');

  resetInjectedClients();
}

async function checkRealSupabaseMode() {
  const hasUrl = Boolean(process.env.SUPABASE_URL);
  const hasKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);
  const hasAdmin = Boolean(process.env.SMOKE_ADMIN_EMAIL && process.env.SMOKE_ADMIN_PASSWORD);

  if (!hasUrl || !hasKey || !hasAdmin) {
    console.log('Real Supabase mode check: SKIPPED');
    if (!hasUrl) console.log('  - Reason: SUPABASE_URL not configured');
    if (!hasKey) console.log('  - Reason: SUPABASE credentials not configured');
    if (!hasAdmin) console.log('  - Reason: SMOKE_ADMIN_EMAIL / SMOKE_ADMIN_PASSWORD not set');
    return false;
  }
  return true;
}

async function main() {
  await runMockBenchmark();
  await checkRealSupabaseMode();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Benchmark error:', err);
    process.exit(1);
  });
}

module.exports = { runMockBenchmark };
