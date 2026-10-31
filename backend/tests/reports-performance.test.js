import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { setInjectedClients, resetInjectedClients } from '../src/lib/supabase';
import { createSupabaseMock } from './mocks/supabase.mock';
import reportsRepo from '../src/repositories/reports.repository';
import reportCache from '../src/utils/reportCache';
import { chunkArray, mapConcurrent } from '../src/utils/async';

describe('Reports Performance & Optimization Contract (Priority C)', () => {
  let mock;
  let adminToken;

  beforeEach(() => {
    mock = createSupabaseMock();
    setInjectedClients({
      admin: mock.adminClient,
      publicClient: mock.publicClient,
    });

    adminToken = mock.seedUser({
      id: 'a0000000-0000-4000-8000-000000000001',
      email: 'admin@brightloop.local',
      role: 'admin',
    }).token;

    reportsRepo.resetRpcStatusForTest();
    reportCache.clear();
    reportCache.setEnabledInTest(false);
  });

  describe('Bounded Concurrency and Chunking Helpers', () => {
    it('chunkArray splits arrays into chunks of at most 100 items', () => {
      const items = Array.from({ length: 250 }, (_, i) => `item-${i}`);
      const chunks = chunkArray(items, 100);

      expect(chunks.length).toBe(3);
      expect(chunks[0].length).toBe(100);
      expect(chunks[1].length).toBe(100);
      expect(chunks[2].length).toBe(50);
    });

    it('mapConcurrent respects max active concurrency', async () => {
      const items = Array.from({ length: 15 }, (_, i) => i);
      let active = 0;
      let maxActive = 0;

      const results = await mapConcurrent(items, 5, async (item) => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((r) => setTimeout(r, 10));
        active--;
        return item * 2;
      });

      expect(maxActive).toBeLessThanOrEqual(5);
      expect(results).toEqual(items.map((i) => i * 2));
    });
  });

  describe('RPC-First Summary vs Fallback Aggregation', () => {
    it('returns identical response shapes whether executed via RPC or fallback', async () => {
      // Seed small sample dataset
      mock.seedSubscription({
        id: 'sub-001',
        customer_id: 'cust-001',
        plan_id: 'plan-001',
        status: 'active',
        is_paused: false,
      });
      mock.seedSubscription({
        id: 'sub-002',
        customer_id: 'cust-001',
        plan_id: 'plan-001',
        status: 'active',
        is_paused: true,
      });
      mock.seedInvoice({
        id: 'inv-001',
        subscription_id: 'sub-001',
        customer_id: 'cust-001',
        status: 'confirmed',
        total: '1000.00',
        due_date: '2026-10-15',
        created_at: '2026-10-10T00:00:00.000Z',
      });
      mock.seedPayment({
        id: 'pmt-001',
        invoice_id: 'inv-001',
        amount: '300.00',
        payment_date: '2026-10-12',
      });

      // 1. Run Fallback Path
      reportsRepo.setRpcStatusForTest({ available: false });
      const fallbackResult = await reportsRepo.getSummaryReportFallback({
        from: '2026-10-01',
        to: '2026-10-31',
        today: '2026-10-31',
      }, mock.adminClient);

      // 2. Register Mock RPC returning the exact same numbers
      mock.registerRpc('get_finance_summary_report', () => ({
        active_subscriptions: fallbackResult.active_subscriptions,
        paused_subscriptions: fallbackResult.paused_subscriptions,
        revenue_invoiced: fallbackResult.revenue_invoiced,
        revenue_collected: fallbackResult.revenue_collected,
        outstanding_balance: fallbackResult.outstanding_balance,
        overdue_count: fallbackResult.overdue_count,
        overdue_amount: fallbackResult.overdue_amount,
        as_of: fallbackResult.as_of,
      }));

      // 3. Run RPC Path
      reportsRepo.setRpcStatusForTest({ available: true });
      const rpcResult = await reportsRepo.getSummaryReport({
        from: '2026-10-01',
        to: '2026-10-31',
        today: '2026-10-31',
      }, mock.adminClient);

      expect(rpcResult).toMatchObject({
        active_subscriptions: fallbackResult.active_subscriptions,
        paused_subscriptions: fallbackResult.paused_subscriptions,
        revenue_invoiced: fallbackResult.revenue_invoiced,
        revenue_collected: fallbackResult.revenue_collected,
        outstanding_balance: fallbackResult.outstanding_balance,
        overdue_count: fallbackResult.overdue_count,
        overdue_amount: fallbackResult.overdue_amount,
        as_of: fallbackResult.as_of,
        filters: fallbackResult.filters,
      });
      expect(rpcResult._source).toBe('rpc');
    });

    it('falls back seamlessly to chunked aggregation when RPC is not found', async () => {
      reportsRepo.resetRpcStatusForTest();

      mock.seedSubscription({
        id: 'sub-001',
        customer_id: 'cust-001',
        plan_id: 'plan-001',
        status: 'active',
        is_paused: false,
      });

      const res = await request(app)
        .get('/api/v1/reports/summary?from=2026-10-01&to=2026-10-31')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.active_subscriptions).toBe(1);

      // Status should remember that RPC is missing
      const status = reportsRepo.getRpcStatus();
      expect(status.tested).toBe(true);
      expect(status.available).toBe(false);
    });
  });

  describe('Report TTL Cache with X-Cache Header', () => {
    it('returns X-Cache: MISS on first request and HIT on subsequent within 30s', async () => {
      reportCache.setEnabledInTest(true);

      const res1 = await request(app)
        .get('/api/v1/reports/summary?from=2026-10-01&to=2026-10-31')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res1.status).toBe(200);
      expect(res1.headers['x-cache']).toBe('MISS');

      const res2 = await request(app)
        .get('/api/v1/reports/summary?from=2026-10-01&to=2026-10-31')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res2.status).toBe(200);
      expect(res2.headers['x-cache']).toBe('HIT');
    });

    it('bypasses cache with ?refresh=true and returns X-Cache: MISS', async () => {
      reportCache.setEnabledInTest(true);

      // First call -> MISS, populates cache
      await request(app)
        .get('/api/v1/reports/summary?from=2026-10-01&to=2026-10-31')
        .set('Authorization', `Bearer ${adminToken}`);

      // Second call with refresh=true -> MISS, bypasses cache
      const resRefresh = await request(app)
        .get('/api/v1/reports/summary?from=2026-10-01&to=2026-10-31&refresh=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resRefresh.status).toBe(200);
      expect(resRefresh.headers['x-cache']).toBe('MISS');
    });

    it('cache is disabled automatically when NODE_ENV=test unless explicitly enabled', async () => {
      reportCache.setEnabledInTest(false);

      const res1 = await request(app)
        .get('/api/v1/reports/summary?from=2026-10-01&to=2026-10-31')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res1.headers['x-cache']).toBe('MISS');

      const res2 = await request(app)
        .get('/api/v1/reports/summary?from=2026-10-01&to=2026-10-31')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res2.headers['x-cache']).toBe('MISS');
    });
  });
});
