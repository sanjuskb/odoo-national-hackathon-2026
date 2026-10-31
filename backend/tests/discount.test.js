import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { setInjectedClients, resetInjectedClients } from '../src/lib/supabase.js';
import { createSupabaseMock } from './mocks/supabase.mock.js';
import {
  isDiscountEligible,
  computeDiscountAmount,
  selectBestDiscount,
  allocateDiscountToLines,
} from '../src/services/discount.service.js';

describe('Phase 4 Discounts Suite (Pure Service & API Endpoints)', () => {
  let mock;
  let adminToken;
  let staffToken;
  let customerToken;
  let product1;
  let product2;

  beforeEach(() => {
    mock = createSupabaseMock();
    setInjectedClients({
      admin: mock.adminClient,
      publicClient: mock.publicClient,
    });

    adminToken = mock.seedUser({ id: 'admin-1', email: 'admin@brightloop.local', role: 'admin' }).token;
    staffToken = mock.seedUser({ id: 'staff-1', email: 'staff@brightloop.local', role: 'staff' }).token;
    customerToken = mock.seedUser({ id: 'cust-1', email: 'customer@brightloop.local', role: 'customer' }).token;

    product1 = mock.seedProduct({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Product 1',
      sales_price: '1000.00',
    });
    product2 = mock.seedProduct({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Product 2',
      sales_price: '500.00',
    });
  });

  afterEach(() => {
    resetInjectedClients();
    mock.reset();
  });

  // =========================================================================
  // 1. Pure Discount Service Unit Tests (Cases 4, 5, 6)
  // =========================================================================
  describe('discount.service.js Pure Calculations & Eligibility', () => {
    const baseDiscount = {
      id: 'disc-1',
      kind: 'percentage',
      value: '10.00',
      scope: 'subscription',
      min_amount: '100.00',
      min_quantity: 2,
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      max_uses: 10,
      used_count: 5,
      is_active: true,
    };

    it('evaluates date range eligibility: before start, on start, on end, after end', () => {
      const context = {
        lines: [{ product_id: product1.id, quantity: 2, amount: '2000.00' }],
      };

      // Before start
      expect(isDiscountEligible(baseDiscount, context, '2025-12-31')).toBe(false);

      // On start (inclusive)
      expect(isDiscountEligible(baseDiscount, context, '2026-01-01')).toBe(true);

      // In middle
      expect(isDiscountEligible(baseDiscount, context, '2026-06-15')).toBe(true);

      // On end (inclusive)
      expect(isDiscountEligible(baseDiscount, context, '2026-12-31')).toBe(true);

      // After end
      expect(isDiscountEligible(baseDiscount, context, '2027-01-01')).toBe(false);
    });

    it('evaluates usage cap eligibility: rejects when used_count reaches or exceeds max_uses', () => {
      const context = {
        lines: [{ product_id: product1.id, quantity: 2, amount: '2000.00' }],
      };

      // exactly at max_uses
      const atMax = { ...baseDiscount, used_count: 10, max_uses: 10 };
      expect(isDiscountEligible(atMax, context, '2026-06-01')).toBe(false);

      // exceeded max_uses
      const overMax = { ...baseDiscount, used_count: 11, max_uses: 10 };
      expect(isDiscountEligible(overMax, context, '2026-06-01')).toBe(false);

      // below max_uses
      const belowMax = { ...baseDiscount, used_count: 9, max_uses: 10 };
      expect(isDiscountEligible(belowMax, context, '2026-06-01')).toBe(true);

      // null max_uses allows unlimited
      const unlimited = { ...baseDiscount, max_uses: null, used_count: 100 };
      expect(isDiscountEligible(unlimited, context, '2026-06-01')).toBe(true);
    });

    it('evaluates thresholds: min_amount and min_quantity', () => {
      const disc = {
        ...baseDiscount,
        min_amount: '500.00',
        min_quantity: 3,
      };

      // Below min_amount (amount 400 < 500)
      expect(
        isDiscountEligible(
          disc,
          { lines: [{ product_id: product1.id, quantity: 4, amount: '400.00' }] },
          '2026-06-01'
        )
      ).toBe(false);

      // Below min_quantity (qty 2 < 3)
      expect(
        isDiscountEligible(
          disc,
          { lines: [{ product_id: product1.id, quantity: 2, amount: '1000.00' }] },
          '2026-06-01'
        )
      ).toBe(false);

      // Both met
      expect(
        isDiscountEligible(
          disc,
          { lines: [{ product_id: product1.id, quantity: 3, amount: '600.00' }] },
          '2026-06-01'
        )
      ).toBe(true);
    });

    it('evaluates active flag: rejects inactive discounts', () => {
      const context = {
        lines: [{ product_id: product1.id, quantity: 2, amount: '2000.00' }],
      };
      const inactive = { ...baseDiscount, is_active: false };
      expect(isDiscountEligible(inactive, context, '2026-06-01')).toBe(false);
    });

    it('evaluates product scope: matches only mapped products', () => {
      const prodScopedDisc = {
        ...baseDiscount,
        scope: 'product',
        product_ids: [product1.id],
      };

      // Matching product
      expect(
        isDiscountEligible(
          prodScopedDisc,
          { lines: [{ product_id: product1.id, quantity: 2, amount: '2000.00' }] },
          '2026-06-01'
        )
      ).toBe(true);

      // Non-matching product
      expect(
        isDiscountEligible(
          prodScopedDisc,
          { lines: [{ product_id: product2.id, quantity: 2, amount: '2000.00' }] },
          '2026-06-01'
        )
      ).toBe(false);
    });

    it('computeDiscountAmount: computes percentage and fixed, capping at base', () => {
      // 10% on 100.00 (10000 minor units) = 1000 minor units
      expect(computeDiscountAmount({ kind: 'percentage', value: '10.00' }, 10000)).toBe(1000);

      // Fixed 50.00 on 100.00 = 5000 minor units
      expect(computeDiscountAmount({ kind: 'fixed', value: '50.00' }, 10000)).toBe(5000);

      // Fixed discount larger than base is capped to base
      expect(computeDiscountAmount({ kind: 'fixed', value: '150.00' }, 10000)).toBe(10000);
    });

    it('selectBestDiscount: chooses single discount with largest saving without stacking', () => {
      const lines = [{ product_id: product1.id, quantity: 2, amount: '1000.00' }]; // base = 1000.00 (100000)

      const discounts = [
        { id: 'disc-small', kind: 'percentage', value: '5.00', scope: 'subscription', is_active: true }, // saving = 50.00
        { id: 'disc-large', kind: 'percentage', value: '15.00', scope: 'subscription', is_active: true }, // saving = 150.00
        { id: 'disc-fixed', kind: 'fixed', value: '80.00', scope: 'subscription', is_active: true }, // saving = 80.00
      ];

      const best = selectBestDiscount(discounts, lines, '2026-06-01');
      expect(best.id).toBe('disc-large');
    });

    it('selectBestDiscount: breaks ties deterministically by lowest ID', () => {
      const lines = [{ product_id: product1.id, quantity: 1, amount: '1000.00' }];

      const discounts = [
        { id: 'disc-b', kind: 'fixed', value: '50.00', scope: 'subscription', is_active: true },
        { id: 'disc-a', kind: 'fixed', value: '50.00', scope: 'subscription', is_active: true },
      ];

      const best = selectBestDiscount(discounts, lines, '2026-06-01');
      expect(best.id).toBe('disc-a');
    });

    it('allocateDiscountToLines: sums EXACTLY to discountMinor deterministically', () => {
      // Example 1: 10.00 (1000 minor) over 3 equal lines of 33.33 (3333 minor) each
      // Total base = 9999; 1000 * 3333 / 9999 = 333 each (999 allocated), remainder 1 cent to largest line
      const lines1 = [3333, 3333, 3333];
      const alloc1 = allocateDiscountToLines(lines1, 1000);
      expect(alloc1.reduce((sum, v) => sum + v, 0)).toBe(1000);
      expect(alloc1).toEqual([334, 333, 333]);

      // Example 2: 3 lines with uneven amounts
      const lines2 = [10000, 25000, 15000]; // total = 50000
      const alloc2 = allocateDiscountToLines(lines2, 7500); // 75.00
      expect(alloc2.reduce((sum, v) => sum + v, 0)).toBe(7500);
      expect(alloc2).toEqual([1500, 3750, 2250]);

      // Example 3: discount larger than total base is capped
      const lines3 = [2000, 3000]; // total = 5000
      const alloc3 = allocateDiscountToLines(lines3, 8000);
      expect(alloc3.reduce((sum, v) => sum + v, 0)).toBe(5000);
      expect(alloc3).toEqual([2000, 3000]);
    });
  });

  // =========================================================================
  // 2. Discount API Endpoints RBAC & Validation (Step B2 requirements)
  // =========================================================================
  describe('Discount API Endpoints', () => {
    it('allows Admin to create a discount rule (201)', async () => {
      const res = await request(app)
        .post('/api/v1/discounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Festival Promo 10%',
          type: 'percentage',
          value: '10.00',
          scope: 'subscription',
          min_amount: '500.00',
          min_quantity: 1,
          start_date: '2026-01-01',
          end_date: '2026-12-31',
          max_uses: 50,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.discount.name).toBe('Festival Promo 10%');
      expect(res.body.data.discount.type).toBe('percentage');
      expect(res.body.data.discount.value).toBe('10.00');
      expect(res.body.data.discount.used_count).toBe(0);
      expect(res.body.data.discount.is_active).toBe(true);
    });

    it('allows Admin to create a product-scoped discount with product_ids (201)', async () => {
      const res = await request(app)
        .post('/api/v1/discounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Product 1 Special',
          type: 'fixed',
          value: '100.00',
          scope: 'product',
          product_ids: [product1.id],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.discount.scope).toBe('product');
      expect(res.body.data.discount.product_ids).toContain(product1.id);
    });

    it('rejects Staff from creating or updating discounts (403)', async () => {
      const disc = mock.seedDiscountRule({ name: 'Staff Promo', value: '5.00' });

      const postRes = await request(app)
        .post('/api/v1/discounts')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ name: 'Unauthorized', type: 'percentage', value: '10.00' });
      expect(postRes.status).toBe(403);

      const patchRes = await request(app)
        .patch(`/api/v1/discounts/${disc.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ is_active: false });
      expect(patchRes.status).toBe(403);
    });

    it('rejects Customer from all discount endpoints (403)', async () => {
      const disc = mock.seedDiscountRule({ name: 'Cust Promo', value: '5.00' });

      const listRes = await request(app)
        .get('/api/v1/discounts')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(listRes.status).toBe(403);

      const getRes = await request(app)
        .get(`/api/v1/discounts/${disc.id}`)
        .set('Authorization', `Bearer ${customerToken}`);
      expect(getRes.status).toBe(403);

      const postRes = await request(app)
        .post('/api/v1/discounts')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ name: 'Hack', type: 'fixed', value: '1000.00' });
      expect(postRes.status).toBe(403);
    });

    it('validates discount constraints and rejects invalid payloads (400)', async () => {
      // Percentage > 100
      const res1 = await request(app)
        .post('/api/v1/discounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Over 100', type: 'percentage', value: '105.00' });
      expect(res1.status).toBe(400);

      // Fixed <= 0
      const res2 = await request(app)
        .post('/api/v1/discounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Zero Fixed', type: 'fixed', value: '0.00' });
      expect(res2.status).toBe(400);

      // end_date before start_date
      const res3 = await request(app)
        .post('/api/v1/discounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Bad Dates',
          type: 'percentage',
          value: '10.00',
          start_date: '2026-12-01',
          end_date: '2026-01-01',
        });
      expect(res3.status).toBe(400);

      // Product scope without products
      const res4 = await request(app)
        .post('/api/v1/discounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'No Prods',
          type: 'percentage',
          value: '10.00',
          scope: 'product',
          product_ids: [],
        });
      expect(res4.status).toBe(400);

      // Subscription scope with products
      const res5 = await request(app)
        .post('/api/v1/discounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Sub with Prods',
          type: 'percentage',
          value: '10.00',
          scope: 'subscription',
          product_ids: [product1.id],
        });
      expect(res5.status).toBe(400);
    });

    it('ensures used_count is never client-writable (stripped on create and patch)', async () => {
      const res = await request(app)
        .post('/api/v1/discounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Used Count Tamper',
          type: 'fixed',
          value: '50.00',
          used_count: 999, // Attempt to tamper
        });

      expect(res.status).toBe(201);
      expect(res.body.data.discount.used_count).toBe(0);

      const discId = res.body.data.discount.id;
      const patchRes = await request(app)
        .patch(`/api/v1/discounts/${discId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Name Updated',
          used_count: 555,
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.discount.name).toBe('Name Updated');
      expect(patchRes.body.data.discount.used_count).toBe(0);
    });

    it('rejects PATCH lowering max_uses below existing used_count (400)', async () => {
      const disc = mock.seedDiscountRule({
        name: 'Capped Promo',
        value: '10.00',
        max_uses: 10,
        used_count: 7,
      });

      const res = await request(app)
        .patch(`/api/v1/discounts/${disc.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ max_uses: 5 }); // 5 < 7

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('max_uses');
    });
  });
});
