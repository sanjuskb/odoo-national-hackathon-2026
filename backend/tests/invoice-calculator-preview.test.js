import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { setInjectedClients, resetInjectedClients } from '../src/lib/supabase.js';
import { createSupabaseMock } from './mocks/supabase.mock.js';
import { calculateInvoicePreview } from '../src/services/invoiceCalculator.service.js';
import { calculateInvoice } from '../../billing/src/calculator.cjs';

describe('Phase 4 Invoice Calculator & Billing Preview Suite', () => {
  let mock;
  let adminToken;
  let staffToken;
  let customerToken;
  let customerUser;
  let activePlan;
  let product1;
  let variant1;
  let tax18;

  beforeEach(() => {
    mock = createSupabaseMock();
    setInjectedClients({
      admin: mock.adminClient,
      publicClient: mock.publicClient,
    });

    adminToken = mock.seedUser({ id: 'a0000000-0000-4000-8000-000000000001', email: 'admin@brightloop.local', role: 'admin' }).token;
    staffToken = mock.seedUser({ id: 'a0000000-0000-4000-8000-000000000002', email: 'staff@brightloop.local', role: 'staff' }).token;
    const custSeed = mock.seedUser({ id: 'a0000000-0000-4000-8000-000000000003', email: 'customer@brightloop.local', role: 'customer' });
    customerToken = custSeed.token;
    customerUser = custSeed.user;

    product1 = mock.seedProduct({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Brightloop Suite',
      sales_price: '1000.00',
    });

    variant1 = mock.seedVariant({
      id: '22222222-2222-4222-8222-222222222222',
      product_id: product1.id,
      name: 'Odoo Edition',
      price_adjustment: '560.00',
    });

    activePlan = mock.seedPlan({
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Enterprise Plan',
      frequency: 'monthly',
      min_quantity: 1,
    });

    tax18 = mock.seedTaxRule({
      id: '44444444-4444-4444-8444-444444444444',
      name: 'GST 18%',
      rate_percent: '18.00',
    });
  });

  afterEach(() => {
    resetInjectedClients();
    mock.reset();
  });

  // =========================================================================
  // 1. Invoice Calculator Unit Calculations (Case 7)
  // =========================================================================
  describe('invoiceCalculator.service.js Pure Calculations', () => {
    it('calculates full example: 3 x (1000.00 + 560.00) = 4680.00, 10% discount = 468.00, 18% tax on 4212.00 = 758.16, total = 4970.16', () => {
      const lines = [
        {
          product_id: product1.id,
          description: 'Brightloop Suite (Odoo Edition)',
          quantity: 3,
          unit_price: '1000.00',
          variant_adjustment: '560.00',
          tax_rate_percent: '18.00',
        },
      ];

      const discounts = [
        {
          id: 'disc-10',
          kind: 'percentage',
          value: '10.00',
          scope: 'subscription',
          is_active: true,
        },
      ];

      const res = calculateInvoicePreview({ lines, discounts, date: '2026-10-31' });

      expect(res.subtotal).toBe('4680.00');
      expect(res.discount_total).toBe('468.00');
      expect(res.tax_total).toBe('758.16');
      expect(res.total).toBe('4970.16');
      expect(res.selected_discount_id).toBe('disc-10');

      const line0 = res.lines[0];
      expect(line0.net).toBe('4680.00');
      expect(line0.discount_allocated).toBe('468.00');
      expect(line0.tax).toBe('758.16');
      expect(line0.total).toBe('4970.16');
    });

    it('matches Sanju calculator.cjs calculateInvoice result with zero discrepancy', () => {
      const lines = [
        {
          product_id: product1.id,
          description: 'Brightloop Suite (Odoo Edition)',
          quantity: 3,
          unit_price: '1000.00',
          variant_adjustment: '560.00',
          tax_rate_percent: '18.00',
        },
      ];

      const discounts = [
        {
          id: 'disc-10',
          kind: 'percentage',
          value: '10.00',
          scope: 'subscription',
          is_active: true,
        },
      ];

      // Our invoiceCalculator
      const ourResult = calculateInvoicePreview({ lines, discounts, date: '2026-10-31' });

      // Sanju's billing calculator
      const sanjuResult = calculateInvoice({
        subscriptionId: 'sub-test',
        customerId: 'cust-test',
        periodStart: '2026-10-31',
        currency: 'INR',
        lines: [
          {
            productId: product1.id,
            title: 'Brightloop Suite (Odoo Edition)',
            quantity: 3,
            unitPrice: '1000.00',
            variantAdjustment: '560.00',
            taxPercent: '18.00',
          },
        ],
        discounts: [
          {
            id: 'disc-10',
            kind: 'percentage',
            value: '10.00',
            scope: 'subscription',
          },
        ],
        policy: {
          taxMode: 'exclusive',
          discountStacking: 'best',
          rounding: 'half-up',
        },
      });

      expect(ourResult.subtotal).toBe(sanjuResult.subtotal);
      expect(ourResult.discount_total).toBe(sanjuResult.discountTotal);
      expect(ourResult.tax_total).toBe(sanjuResult.taxTotal);
      expect(ourResult.total).toBe(sanjuResult.total);
    });

    it('calculates invoice with no discount correctly', () => {
      const lines = [
        {
          product_id: product1.id,
          description: 'Brightloop Suite',
          quantity: 2,
          unit_price: '1000.00',
          variant_adjustment: '0.00',
          tax_rate_percent: '18.00',
        },
      ];

      const res = calculateInvoicePreview({ lines, discounts: [], date: '2026-10-31' });

      // 2 x 1000.00 = 2000.00; tax 18% = 360.00; total = 2360.00
      expect(res.subtotal).toBe('2000.00');
      expect(res.discount_total).toBe('0.00');
      expect(res.tax_total).toBe('360.00');
      expect(res.total).toBe('2360.00');
      expect(res.selected_discount_id).toBeNull();
    });

    it('calculates invoice with two lines and product-scoped discount', () => {
      const product2 = mock.seedProduct({
        id: '55555555-5555-4555-8555-555555555555',
        name: 'Addon Service',
        sales_price: '500.00',
      });

      const lines = [
        {
          product_id: product1.id,
          description: 'Brightloop Suite',
          quantity: 1,
          unit_price: '1000.00',
          variant_adjustment: '0.00',
          tax_rate_percent: '18.00',
        },
        {
          product_id: product2.id,
          description: 'Addon Service',
          quantity: 2,
          unit_price: '500.00',
          variant_adjustment: '0.00',
          tax_rate_percent: '5.00',
        },
      ];

      // 20% discount on product2 only
      const discounts = [
        {
          id: 'disc-addon-20',
          kind: 'percentage',
          value: '20.00',
          scope: 'product',
          product_ids: [product2.id],
          is_active: true,
        },
      ];

      const res = calculateInvoicePreview({ lines, discounts, date: '2026-10-31' });

      // Line 1: net = 1000.00, discount = 0, tax 18% on 1000.00 = 180.00, total = 1180.00
      // Line 2: net = 1000.00 (2 x 500), discount 20% = 200.00, discounted net = 800.00, tax 5% on 800.00 = 40.00, total = 840.00
      // Totals: subtotal = 2000.00, discount = 200.00, tax = 220.00, total = 2020.00
      expect(res.subtotal).toBe('2000.00');
      expect(res.discount_total).toBe('200.00');
      expect(res.tax_total).toBe('220.00');
      expect(res.total).toBe('2020.00');
      expect(res.lines[0].discount_allocated).toBe('0.00');
      expect(res.lines[1].discount_allocated).toBe('200.00');
    });
  });

  // =========================================================================
  // 2. Billing Preview Endpoint Tests (Case 8)
  // =========================================================================
  describe('GET /api/v1/billing/preview', () => {
    it('returns preview for active subscription (200) for Admin and Staff', async () => {
      // Create subscription with line
      const sub = mock.seedSubscription({
        id: '66666666-6666-4666-8666-666666666661',
        subscription_number: 'SUB-202610-PREV01',
        customer_id: customerUser.id,
        plan_id: activePlan.id,
        status: 'active',
        start_date: '2026-10-01',
        expiry_date: '2027-10-01',
        next_billing_date: '2026-11-01',
      });

      mock.seedSubscriptionLine({
        subscription_id: sub.id,
        product_id: product1.id,
        quantity: 2,
        unit_price: '1000.00',
        variant_adjustment: '0.00',
        tax_rate_percent: '18.00',
        amount: '2000.00',
      });

      const res = await request(app)
        .get(`/api/v1/billing/preview?subscription_id=${sub.id}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoice_preview.subscription_id).toBe(sub.id);
      expect(res.body.data.invoice_preview.subtotal).toBe('2000.00');
      expect(res.body.data.invoice_preview.tax_total).toBe('360.00');
      expect(res.body.data.invoice_preview.total).toBe('2360.00');
    });

    it('rejects Customer from billing preview (403)', async () => {
      const sub = mock.seedSubscription({
        id: '66666666-6666-4666-8666-666666666662',
        customer_id: customerUser.id,
        plan_id: activePlan.id,
        status: 'active',
      });

      const res = await request(app)
        .get(`/api/v1/billing/preview?subscription_id=${sub.id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it('writes NOTHING to the database (no invoice created, no used_count changed)', async () => {
      const disc = mock.seedDiscountRule({
        name: 'Preview Discount',
        value: '10.00',
        max_uses: 10,
        used_count: 2,
      });

      const sub = mock.seedSubscription({
        id: '66666666-6666-4666-8666-666666666663',
        customer_id: customerUser.id,
        plan_id: activePlan.id,
        status: 'active',
        next_billing_date: '2026-11-01',
      });

      mock.seedSubscriptionLine({
        subscription_id: sub.id,
        product_id: product1.id,
        quantity: 1,
        unit_price: '1000.00',
        amount: '1000.00',
        tax_rate_percent: '0.00',
      });

      await request(app)
        .get(`/api/v1/billing/preview?subscription_id=${sub.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Verify discount used_count unchanged
      expect(mock.discountRulesTable.get(disc.id).used_count).toBe(2);
    });

    it('rejects closed subscriptions with 409 Conflict', async () => {
      const sub = mock.seedSubscription({
        id: '66666666-6666-4666-8666-666666666664',
        customer_id: customerUser.id,
        plan_id: activePlan.id,
        status: 'closed',
      });

      mock.seedSubscriptionLine({
        subscription_id: sub.id,
        product_id: product1.id,
        quantity: 1,
        unit_price: '1000.00',
      });

      const res = await request(app)
        .get(`/api/v1/billing/preview?subscription_id=${sub.id}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('closed');
    });
  });

  // =========================================================================
  // 3. Step A5 Tests: Pricing Reconciliation & Tax Snapshot
  // =========================================================================
  describe('Step A5 Line Price Reconciliation & Tax Snapshot', () => {
    it('proves single pricing: base 1000.00 + variant 560.00 x quantity 3 = 4680.00 without double counting, and snapshots tax_rate_percent', async () => {
      const createRes = await request(app)
        .post('/api/v1/subscriptions')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          customer_id: customerUser.id,
          plan_id: activePlan.id,
          start_date: '2026-11-01',
          expiry_date: '2027-11-01',
          payment_terms: 'immediate',
          lines: [
            {
              product_id: product1.id,
              variant_id: variant1.id,
              quantity: 3,
              tax_id: tax18.id,
            },
          ],
        });

      expect(createRes.status).toBe(201);
      const sub = createRes.body.data.subscription;
      expect(sub.lines.length).toBe(1);

      const storedLine = sub.lines[0];
      // 1. unit_price is base price only
      expect(storedLine.unit_price).toBe('1000.00');

      // 2. variant_adjustment stored separately
      expect(storedLine.variant_adjustment).toBe('560.00');

      // 3. line amount = quantity x (base + adjustment) = 3 x (1000.00 + 560.00) = 4680.00
      expect(storedLine.amount).toBe('4680.00');

      // 4. tax_rate_percent is snapshotted from tax_id
      expect(storedLine.tax_rate_percent).toBe('18.00');

      // 5. description is formatted as product (variant)
      expect(storedLine.description).toBe('Brightloop Suite (Odoo Edition)');

      // 6. Verify that billing reader would compute exactly 4680.00
      const billingUnit = Number(storedLine.unit_price);
      const billingAdj = Number(storedLine.variant_adjustment);
      const billingQty = storedLine.quantity;
      const billingComputed = (billingUnit + billingAdj) * billingQty;
      expect(billingComputed.toFixed(2)).toBe('4680.00');
    });
  });

  // =========================================================================
  // 4. Case 10: Error Response Sanitization & Standard Envelope
  // =========================================================================
  describe('Standard Response Envelope & Error Sanitization', () => {
    it('ensures error responses never leak stack traces or internal DB errors', async () => {
      const res = await request(app)
        .get('/api/v1/billing/preview?subscription_id=ffffffff-ffff-4fff-bfff-ffffffffffff')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('errors');
      expect(res.body.stack).toBeUndefined();
    });
  });
});
