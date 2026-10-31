import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { setInjectedClients, resetInjectedClients } from '../src/lib/supabase.js';
import { createSupabaseMock } from './mocks/supabase.mock.js';

describe('Phase 6 Reports Suite (Finance Dashboard & Analytics)', () => {
  let mock;
  let adminToken;
  let staffToken;
  let customerToken;
  const adminId = 'a0000000-0000-4000-8000-000000000099';
  const staffId = 'a0000000-0000-4000-8000-000000000098';
  const customer1Id = 'a0000000-0000-4000-8000-000000000001';
  const customer2Id = 'a0000000-0000-4000-8000-000000000002';
  const plan1Id = 'b0000000-0000-4000-8000-000000000001';
  const plan2Id = 'b0000000-0000-4000-8000-000000000002';

  const fixedToday = '2026-10-31';

  beforeEach(() => {
    mock = createSupabaseMock();
    setInjectedClients({
      admin: mock.adminClient,
      publicClient: mock.publicClient,
    });

    adminToken = mock.seedUser({ id: adminId, email: 'admin@brightloop.local', role: 'admin' }).token;
    staffToken = mock.seedUser({ id: staffId, email: 'staff@brightloop.local', role: 'staff' }).token;
    customerToken = mock.seedUser({ id: customer1Id, email: 'customer@brightloop.local', role: 'customer' }).token;
  });

  afterEach(() => {
    resetInjectedClients();
    vi.restoreAllMocks();
  });

  describe('Authorization on Report Endpoints (SEC-002)', () => {
    const endpoints = [
      '/api/v1/reports/summary',
      '/api/v1/reports/overdue-invoices',
      '/api/v1/reports/payments',
      '/api/v1/reports/subscriptions',
    ];

    it('strictly forbids customers from accessing any report endpoint (403)', async () => {
      for (const ep of endpoints) {
        const res = await request(app)
          .get(ep)
          .set('Authorization', `Bearer ${customerToken}`);
        expect(res.status, `Failed on ${ep}`).toBe(403);
        expect(res.body.success).toBe(false);
      }
    });

    it('rejects unauthenticated requests (401)', async () => {
      for (const ep of endpoints) {
        const res = await request(app).get(ep);
        expect(res.status, `Failed on ${ep}`).toBe(401);
      }
    });

    it('allows staff and admin access (200)', async () => {
      for (const ep of endpoints) {
        const staffRes = await request(app)
          .get(ep)
          .set('Authorization', `Bearer ${staffToken}`);
        expect(staffRes.status, `Staff failed on ${ep}`).toBe(200);

        const adminRes = await request(app)
          .get(ep)
          .set('Authorization', `Bearer ${adminToken}`);
        expect(adminRes.status, `Admin failed on ${ep}`).toBe(200);
      }
    });
  });

  describe('Validation & Date Boundaries', () => {
    it('returns 400 when from date is after to date', async () => {
      const res = await request(app)
        .get('/api/v1/reports/summary?from=2026-11-01&to=2026-10-31')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors[0].issue).toContain('must be on or before');
    });

    it('returns 400 when limit exceeds 100 on paginated endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/reports/overdue-invoices?limit=500')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/reports/summary', () => {
    it('calculates exact separate invoiced vs collected revenue, outstanding and overdue balance', async () => {
      // Subscriptions
      mock.seedSubscription({
        id: 'sub-active-1',
        customer_id: customer1Id,
        plan_id: plan1Id,
        status: 'active',
        is_paused: false,
      });
      mock.seedSubscription({
        id: 'sub-active-2',
        customer_id: customer1Id,
        plan_id: plan1Id,
        status: 'active',
        is_paused: false,
      });
      mock.seedSubscription({
        id: 'sub-paused-1',
        customer_id: customer1Id,
        plan_id: plan1Id,
        status: 'active',
        is_paused: true,
      });

      // Invoices
      // 1. Confirmed invoice for 4970.16 created 2026-10-15, due 2026-10-25 (overdue as of 2026-10-31)
      const inv1Id = '11111111-1111-4111-8111-111111111301';
      mock.seedInvoice({
        id: inv1Id,
        invoice_number: 'INV-202610-000301',
        customer_id: customer1Id,
        subscription_id: 'sub-active-1',
        status: 'confirmed',
        total: '4970.16',
        due_date: '2026-10-25',
        created_at: '2026-10-15T10:00:00.000Z',
      });
      // Payments on inv1: 2000.00 + 1500.00 = 3500.00 collected -> balance_due 1470.16
      mock.seedPayment({
        id: 'pmt-1',
        invoice_id: inv1Id,
        amount: '2000.00',
        payment_date: '2026-10-18',
      });
      mock.seedPayment({
        id: 'pmt-2',
        invoice_id: inv1Id,
        amount: '1500.00',
        payment_date: '2026-10-20',
      });

      // 2. Fully paid invoice for 1000.00 created 2026-10-10, due 2026-10-20
      const inv2Id = '11111111-1111-4111-8111-111111111302';
      mock.seedInvoice({
        id: inv2Id,
        invoice_number: 'INV-202610-000302',
        customer_id: customer1Id,
        subscription_id: 'sub-active-1',
        status: 'paid',
        total: '1000.00',
        due_date: '2026-10-20',
        created_at: '2026-10-10T10:00:00.000Z',
      });
      mock.seedPayment({
        id: 'pmt-3',
        invoice_id: inv2Id,
        amount: '1000.00',
        payment_date: '2026-10-12',
      });

      // 3. Draft invoice for 500.00 created 2026-10-28 (should be excluded from revenue, outstanding, and overdue)
      mock.seedInvoice({
        id: '11111111-1111-4111-8111-111111111303',
        invoice_number: 'INV-202610-000303',
        customer_id: customer1Id,
        status: 'draft',
        total: '500.00',
        due_date: '2026-10-20',
        created_at: '2026-10-28T10:00:00.000Z',
      });

      // 4. Cancelled invoice for 800.00 created 2026-10-05 (should be excluded)
      mock.seedInvoice({
        id: '11111111-1111-4111-8111-111111111304',
        invoice_number: 'INV-202610-000304',
        customer_id: customer1Id,
        status: 'cancelled',
        total: '800.00',
        due_date: '2026-10-10',
        created_at: '2026-10-05T10:00:00.000Z',
      });

      const res = await request(app)
        .get(`/api/v1/reports/summary?from=2026-10-01&to=2026-10-31&today=${fixedToday}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const d = res.body.data;
      // Subscriptions
      expect(d.active_subscriptions).toBe(2);
      expect(d.paused_subscriptions).toBe(1);

      // Financials (exact known numbers)
      // Invoiced = 4970.16 + 1000.00 = 5970.16
      expect(d.revenue_invoiced).toBe('5970.16');
      // Collected = 2000.00 + 1500.00 + 1000.00 = 4500.00
      expect(d.revenue_collected).toBe('4500.00');
      // Outstanding (confirmed balance only) = 1470.16
      expect(d.outstanding_balance).toBe('1470.16');
      // Overdue (due 2026-10-25 < 2026-10-31 with 1470.16 remaining)
      expect(d.overdue_count).toBe(1);
      expect(d.overdue_amount).toBe('1470.16');
      expect(d.as_of).toBe(fixedToday);
    });

    it('filters summary metrics strictly by customer_id', async () => {
      mock.seedInvoice({
        id: '11111111-1111-4111-8111-111111111305',
        customer_id: customer1Id,
        status: 'confirmed',
        total: '1000.00',
        created_at: '2026-10-15T00:00:00.000Z',
      });
      mock.seedInvoice({
        id: '11111111-1111-4111-8111-111111111306',
        customer_id: customer2Id,
        status: 'confirmed',
        total: '3000.00',
        created_at: '2026-10-15T00:00:00.000Z',
      });

      const res = await request(app)
        .get(`/api/v1/reports/summary?customer_id=${customer1Id}&today=${fixedToday}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.revenue_invoiced).toBe('1000.00');
      expect(res.body.data.outstanding_balance).toBe('1000.00');
    });
  });

  describe('GET /api/v1/reports/overdue-invoices', () => {
    it('returns overdue invoices sorted by days_overdue DESC with customer details', async () => {
      // Invoice 1: Due 2026-10-20 -> 11 days overdue on 2026-10-31
      const inv1 = mock.seedInvoice({
        id: '11111111-1111-4111-8111-111111111401',
        invoice_number: 'INV-202610-000401',
        customer_id: customer1Id,
        status: 'confirmed',
        total: '2000.00',
        due_date: '2026-10-20',
      });
      // Invoice 2: Due 2026-10-28 -> 3 days overdue on 2026-10-31
      const inv2 = mock.seedInvoice({
        id: '11111111-1111-4111-8111-111111111402',
        invoice_number: 'INV-202610-000402',
        customer_id: customer1Id,
        status: 'confirmed',
        total: '1500.00',
        due_date: '2026-10-28',
      });
      // Invoice 3: Due 2026-10-31 -> Due TODAY -> Strictly NOT overdue
      mock.seedInvoice({
        id: '11111111-1111-4111-8111-111111111403',
        invoice_number: 'INV-202610-000403',
        customer_id: customer1Id,
        status: 'confirmed',
        total: '1000.00',
        due_date: '2026-10-31',
      });

      const res = await request(app)
        .get(`/api/v1/reports/overdue-invoices?today=${fixedToday}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(2);

      // Order check: First is inv1 (11 days overdue), second is inv2 (3 days overdue)
      const first = res.body.data.items[0];
      const second = res.body.data.items[1];

      expect(first.invoice_number).toBe('INV-202610-000401');
      expect(first.days_overdue).toBe(11);
      expect(first.balance_due).toBe('2000.00');
      expect(first.customer.id).toBe(customer1Id);

      expect(second.invoice_number).toBe('INV-202610-000402');
      expect(second.days_overdue).toBe(3);
      expect(second.balance_due).toBe('1500.00');
    });

    it('returns empty array when page is beyond total count', async () => {
      const res = await request(app)
        .get(`/api/v1/reports/overdue-invoices?page=999&limit=20&today=${fixedToday}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toEqual([]);
    });
  });

  describe('GET /api/v1/reports/payments', () => {
    it('returns paginated payments with aggregate totals and method filtering', async () => {
      mock.seedPayment({
        id: '33333333-3333-4333-8333-333333333601',
        invoice_id: '11111111-1111-4111-8111-111111111501',
        amount: '1200.00',
        payment_date: '2026-10-15',
        method: 'bank_transfer',
      });
      mock.seedPayment({
        id: '33333333-3333-4333-8333-333333333602',
        invoice_id: '11111111-1111-4111-8111-111111111501',
        amount: '800.00',
        payment_date: '2026-10-20',
        method: 'upi',
      });
      mock.seedPayment({
        id: '33333333-3333-4333-8333-333333333603',
        invoice_id: '11111111-1111-4111-8111-111111111502',
        amount: '500.00',
        payment_date: '2026-10-22',
        method: 'bank_transfer',
      });

      // Filter by method = bank_transfer
      const res = await request(app)
        .get('/api/v1/reports/payments?method=bank_transfer')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.totals.count).toBe(2);
      expect(res.body.data.totals.amount).toBe('1700.00'); // 1200 + 500
    });
  });

  describe('GET /api/v1/reports/subscriptions', () => {
    it('returns subscription counts partitioned by lifecycle state', async () => {
      mock.seedSubscription({ id: 's1', customer_id: customer1Id, status: 'active', is_paused: false });
      mock.seedSubscription({ id: 's2', customer_id: customer1Id, status: 'active', is_paused: true });
      mock.seedSubscription({ id: 's3', customer_id: customer1Id, status: 'draft' });
      mock.seedSubscription({ id: 's4', customer_id: customer1Id, status: 'closed' });

      const res = await request(app)
        .get('/api/v1/reports/subscriptions')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const c = res.body.data.counts;
      expect(c.active).toBe(1);
      expect(c.paused).toBe(1);
      expect(c.draft).toBe(1);
      expect(c.closed).toBe(1);
    });
  });

  describe('Performance: Bounded-Memory Paging Fallback', () => {
    it('accurately aggregates sums across multiple chunks (>1000 items) in constant memory', async () => {
      // Seed 1,050 payments in mock to verify paging across chunk boundary
      for (let i = 0; i < 1050; i++) {
        mock.seedPayment({
          id: `chunk-pmt-${i.toString().padStart(5, '0')}`,
          invoice_id: '11111111-1111-4111-8111-111111111999',
          amount: '10.00',
          payment_date: '2026-10-15',
          method: 'card',
        });
      }

      const res = await request(app)
        .get('/api/v1/reports/payments?from=2026-10-01&to=2026-10-31')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totals.count).toBe(1050);
      // 1050 * 10.00 = 10500.00
      expect(res.body.data.totals.amount).toBe('10500.00');
    });
  });
});
