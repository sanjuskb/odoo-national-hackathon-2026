'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateInvoice } = require('../src/calculator.cjs');
const { nextBillingDate } = require('../src/recurrence.cjs');
const { runDueBilling } = require('../src/runner.cjs');

test('invoice acceptance test: end-to-end deterministic generation, persistence and duplicate defense', async () => {
  // Mock store adhering to Harsha's persist_due_billing_invoice RPC specification
  const store = {
    subscriptions: new Map([
      ['sub-uuid-101', {
        id: 'sub-uuid-101',
        status: 'active',
        customerId: 'cust-uuid-202',
        planId: 'plan-uuid-303',
        frequency: 'monthly',
        currency: 'USD',
        start_date: '2026-01-31',
        anchorDate: '2026-01-31',
        nextBillingDate: '2026-01-31',
        lines: [
          {
            productId: 'prod-uuid-404',
            title: 'Professional Monthly Subscription',
            quantity: 1,
            unitPrice: '49.00',
            variantAdjustment: '0.00',
            taxPercent: '10.00',
          }
        ],
        discounts: [],
      }]
    ]),
    invoices: new Map(), // key: subscription_id + ':' + billing_period_start
  };

  const repository = {
    listDueSubscriptionIds: async ({ asOf, limit }) => {
      const due = [];
      for (const [id, s] of store.subscriptions) {
        if (s.status === 'active' && s.nextBillingDate <= asOf) due.push(id);
      }
      return due.slice(0, limit);
    },
    getBillingSnapshot: async (id) => {
      const s = store.subscriptions.get(id);
      if (!s) return null;
      return {
        status: s.status,
        customerId: s.customerId,
        frequency: s.frequency,
        currency: s.currency,
        nextBillingDate: s.nextBillingDate,
        anchorDate: s.anchorDate,
        lines: s.lines,
        discounts: s.discounts,
      };
    },
    persistInvoiceAtomically: async ({ subscriptionId, expectedNextBillingDate, nextBillingDate, invoice }) => {
      const key = `${subscriptionId}:${expectedNextBillingDate}`;
      // Emulate UNIQUE(subscription_id, billing_period_start)
      if (store.invoices.has(key)) {
        return { status: 'already-exists', invoiceId: store.invoices.get(key).id };
      }
      const invId = `inv-uuid-${Math.random().toString(36).slice(2, 10)}`;
      store.invoices.set(key, { id: invId, invoice, periodStart: expectedNextBillingDate });
      // Cursor advancement
      const s = store.subscriptions.get(subscriptionId);
      s.nextBillingDate = nextBillingDate;
      return { status: 'created', invoiceId: invId };
    }
  };

  // STEP 1: Execute due billing as of 2026-02-01
  const run1 = await runDueBilling({
    repository,
    asOf: '2026-02-01',
    policy: { taxMode: 'exclusive', discountStacking: 'best', rounding: 'half-up' },
  });

  assert.equal(run1.created, 1);
  assert.equal(run1.failed.length, 0);
  assert.equal(store.invoices.size, 1);

  // Inspect generated invoice values
  const inv1 = store.invoices.get('sub-uuid-101:2026-01-31').invoice;
  assert.equal(inv1.subtotal, '49.00');
  assert.equal(inv1.taxTotal, '4.90');
  assert.equal(inv1.total, '53.90');
  assert.equal(inv1.currency, 'USD');
  assert.equal(inv1.invoiceLines.length, 1);
  assert.equal(inv1.invoiceLines[0].lineTotal, '53.90');

  // Verify cursor advanced with Jan 31 -> Feb 28 month-end clamping
  const subAfterRun1 = store.subscriptions.get('sub-uuid-101');
  assert.equal(subAfterRun1.nextBillingDate, '2026-02-28');

  // STEP 2: Retry identical billing operation (Idempotency Proof)
  const run2 = await runDueBilling({
    repository,
    asOf: '2026-02-01',
    policy: { taxMode: 'exclusive', discountStacking: 'best', rounding: 'half-up' },
  });

  // Because nextBillingDate is now 2026-02-28 (> 2026-02-01), zero new invoices are created
  assert.equal(run2.created, 0);
  assert.equal(store.invoices.size, 1);

  // STEP 3: Multi-period bounded catch-up as of 2026-04-01
  const run3 = await runDueBilling({
    repository,
    asOf: '2026-04-01',
    policy: { taxMode: 'exclusive', discountStacking: 'best', rounding: 'half-up' },
  });

  // Bills Feb 28 (period 2) and Mar 31 (period 3 with anchor day 31 restored!)
  assert.equal(run3.created, 2);
  assert.equal(store.invoices.size, 3);
  assert.ok(store.invoices.has('sub-uuid-101:2026-02-28'));
  assert.ok(store.invoices.has('sub-uuid-101:2026-03-31'));

  // Next cursor should now be 2026-04-30 (April has 30 days)
  assert.equal(subAfterRun1.nextBillingDate, '2026-04-30');
});

test('recurrence preserves anchor day across leap year boundary', () => {
  // Leap day anchor: Feb 29 on leap year
  const start = '2024-02-29';
  const next1 = nextBillingDate(start, 'yearly', start);
  assert.equal(next1, '2025-02-28'); // Clamped to Feb 28 on non-leap year

  const next2 = nextBillingDate(next1, 'yearly', start);
  assert.equal(next2, '2026-02-28');

  const next3 = nextBillingDate(next2, 'yearly', start);
  assert.equal(next3, '2027-02-28');

  const next4 = nextBillingDate(next3, 'yearly', start);
  assert.equal(next4, '2028-02-29'); // Leap day restored on next leap year!
});


test('canonical billing runner and repository match exact Harsha persist_due_billing_invoice RPC contract', async () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
  const { createSupabaseBillingRepository } = require('../../backend/src/services/supabaseBillingRepository.cjs');
  let capturedRpc = null;
  let capturedPayload = null;

  const mockSupabaseClient = {
    rpc: async (functionName, payload) => {
      capturedRpc = functionName;
      capturedPayload = payload;
      return {
        data: [{ result_status: 'created', result_invoice_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }],
        error: null
      };
    }
  };

  const repo = createSupabaseBillingRepository({
    client: mockSupabaseClient,
    env: { BILLING_DUE_DAYS: '15' }
  });

  const invoice = {
    subtotal: '49.00',
    taxTotal: '4.90',
    discountTotal: '0.00',
    total: '53.90',
    invoiceLines: [
      {
        productId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
        title: 'Professional Plan',
        quantity: 1,
        unitPrice: '49.00',
        variantAdjustment: '0.00',
        taxPercent: '10.00',
        taxAmount: '4.90',
        baseAmount: '49.00',
        discountAmount: '0.00',
        lineTotal: '53.90'
      }
    ],
    appliedDiscounts: []
  };

  const result = await repo.persistInvoiceAtomically({
    subscriptionId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c33',
    expectedNextBillingDate: '2026-10-31',
    nextBillingDate: '2026-11-30',
    invoice
  });

  // 1. Verify RPC function name
  assert.equal(capturedRpc, 'persist_due_billing_invoice');

  // 2. Verify all 10 SQL parameters match 20261031_002_atomic_billing_rpc.sql
  assert.equal(capturedPayload.p_subscription_id, 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c33');
  assert.equal(capturedPayload.p_expected_date, '2026-10-31');
  assert.equal(capturedPayload.p_next_date, '2026-11-30');
  assert.equal(capturedPayload.p_due_date, '2026-11-15');
  assert.equal(capturedPayload.p_subtotal, '49.00');
  assert.equal(capturedPayload.p_tax_total, '4.90');
  assert.equal(capturedPayload.p_discount_total, '0.00');
  assert.equal(capturedPayload.p_total, '53.90');
  assert.deepEqual(capturedPayload.p_lines, invoice.invoiceLines);
  assert.deepEqual(capturedPayload.p_discounts, invoice.appliedDiscounts);

  // 3. Verify returned mapping
  assert.equal(result.status, 'created');
  assert.equal(result.invoiceId, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});
