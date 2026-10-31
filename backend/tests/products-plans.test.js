import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { setInjectedClients, resetInjectedClients } from '../src/lib/supabase.js';
import { createSupabaseMock } from './mocks/supabase.mock.js';

describe('Phase 2 Products, Variants, and Plans Test Suite (Supabase Client Mocked)', () => {
  let mock;
  let adminToken;
  let staffToken;
  let customerToken;

  beforeEach(() => {
    mock = createSupabaseMock();
    setInjectedClients({
      admin: mock.adminClient,
      publicClient: mock.publicClient,
    });

    adminToken = mock.seedUser({ id: 'admin-1', email: 'admin@brightloop.local', role: 'admin' }).token;
    staffToken = mock.seedUser({ id: 'staff-1', email: 'staff@brightloop.local', role: 'staff' }).token;
    customerToken = mock.seedUser({ id: 'cust-1', email: 'customer@brightloop.local', role: 'customer' }).token;
  });

  afterEach(() => {
    resetInjectedClients();
    mock.reset();
  });

  // -------------------------------------------------------------------------
  // Case 2: Product Creation & RBAC
  // -------------------------------------------------------------------------
  describe('Case 2: POST /api/v1/products', () => {
    const validProduct = {
      name: 'Brightloop CRM',
      type: 'software',
      sales_price: '1000.00',
      cost_price: '300.00',
      notes: 'Standard enterprise CRM',
    };

    it('allows Admin to create a product (201)', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validProduct);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product).toBeDefined();
      expect(res.body.data.product.name).toBe('Brightloop CRM');
      expect(res.body.data.product.sales_price).toBe('1000.00');
      expect(res.body.data.product.cost_price).toBe('300.00');
    });

    it('denies Staff from creating a product (403)', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(validProduct);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('denies Customer from creating a product (403)', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(validProduct);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('rejects product creation with negative price (400)', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validProduct, sales_price: '-50.00' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects product creation with more than 2 decimal places (400)', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validProduct, sales_price: '99.999' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects product creation with non-numeric text price (400)', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validProduct, sales_price: 'free' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects product creation with missing name (400)', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validProduct, name: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Case 3: Product List & Detail (cost_price privacy & pagination bounds)
  // -------------------------------------------------------------------------
  describe('Case 3: Product Listing & Cost Price Privacy', () => {
    let p1;

    beforeEach(() => {
      p1 = mock.seedProduct({
        id: 'prod-crm',
        name: 'CRM Software',
        type: 'software',
        sales_price: 1000,
        cost_price: 350,
        notes: 'Confidential cost notes',
      });
    });

    it('hides cost_price from Customers in GET /api/v1/products', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThan(0);
      const product = res.body.data.items.find((p) => p.id === 'prod-crm');
      expect(product.sales_price).toBe('1000.00');
      expect(product.cost_price).toBeUndefined(); // MUST NOT leak cost_price to customer
    });

    it('hides cost_price from Customers in GET /api/v1/products/:id', async () => {
      const res = await request(app)
        .get('/api/v1/products/prod-crm')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.product.sales_price).toBe('1000.00');
      expect(res.body.data.product.cost_price).toBeUndefined();
    });

    it('exposes cost_price to Staff in list and detail', async () => {
      const listRes = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(listRes.status).toBe(200);
      const product = listRes.body.data.items.find((p) => p.id === 'prod-crm');
      expect(product.cost_price).toBe('350.00');

      const detailRes = await request(app)
        .get('/api/v1/products/prod-crm')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(detailRes.body.data.product.cost_price).toBe('350.00');
    });

    it('exposes cost_price to Admin in list and detail', async () => {
      const detailRes = await request(app)
        .get('/api/v1/products/prod-crm')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.product.cost_price).toBe('350.00');
    });

    it('caps page_size above 100 to 100', async () => {
      const res = await request(app)
        .get('/api/v1/products?page_size=500')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.page_size).toBe(100);
    });
  });

  // -------------------------------------------------------------------------
  // Case 4: Product Update
  // -------------------------------------------------------------------------
  describe('Case 4: PATCH /api/v1/products/:id', () => {
    beforeEach(() => {
      mock.seedProduct({
        id: 'prod-to-update',
        name: 'Initial Name',
        sales_price: 100,
        cost_price: 50,
      });
    });

    it('allows Admin to update product partially', async () => {
      const res = await request(app)
        .patch('/api/v1/products/prod-to-update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name', sales_price: '120.00' });

      expect(res.status).toBe(200);
      expect(res.body.data.product.name).toBe('Updated Name');
      expect(res.body.data.product.sales_price).toBe('120.00');
    });

    it('denies non-admin from updating product (403)', async () => {
      const res = await request(app)
        .patch('/api/v1/products/prod-to-update')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(403);
    });

    it('returns 404 for unknown product id', async () => {
      const res = await request(app)
        .patch('/api/v1/products/unknown-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Name' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Case 5: Variant Create & Update
  // -------------------------------------------------------------------------
  describe('Case 5: Variant Endpoints', () => {
    beforeEach(() => {
      mock.seedProduct({ id: 'prod-p1', name: 'Software Suite', sales_price: 1000, cost_price: 400 });
      mock.seedProduct({ id: 'prod-p2', name: 'Other Suite', sales_price: 500, cost_price: 200 });
      mock.seedVariant({ id: 'var-v2', product_id: 'prod-p2', name: 'Other Brand', price_adjustment: 100 });
    });

    it('allows Admin to create variant for product', async () => {
      const res = await request(app)
        .post('/api/v1/products/prod-p1/variants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Odoo Brand', price_adjustment: '560.00' });

      expect(res.status).toBe(201);
      expect(res.body.data.variant.name).toBe('Odoo Brand');
      expect(res.body.data.variant.price_adjustment).toBe('560.00');
      expect(res.body.data.variant.product_id).toBe('prod-p1');
    });

    it('returns 404 when updating a variant that belongs to a different product', async () => {
      // var-v2 belongs to prod-p2, but requested under prod-p1
      const res = await request(app)
        .patch('/api/v1/products/prod-p1/variants/var-v2')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Cross-Product Attempt' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Case 6: Pricing Service & Price Endpoint (Base 1000 + Odoo 560 = 1560)
  // -------------------------------------------------------------------------
  describe('Case 6: Pricing Service Verification (GET /api/v1/products/:id/price)', () => {
    beforeEach(() => {
      mock.seedProduct({ id: 'prod-odoo-demo', name: 'Business Software', sales_price: 1000, cost_price: 300 });
      mock.seedProduct({ id: 'prod-other', name: 'Other System', sales_price: 200, cost_price: 50 });
      mock.seedVariant({ id: 'var-odoo-560', product_id: 'prod-odoo-demo', name: 'Odoo Brand', price_adjustment: 560 });
      mock.seedVariant({ id: 'var-foreign', product_id: 'prod-other', name: 'Foreign Brand', price_adjustment: 50 });
    });

    it('computes base 1000.00 + Odoo brand 560.00 = 1560.00', async () => {
      const res = await request(app)
        .get('/api/v1/products/prod-odoo-demo/price?variant_id=var-odoo-560')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.product_id).toBe('prod-odoo-demo');
      expect(res.body.data.variant_id).toBe('var-odoo-560');
      expect(res.body.data.base_price).toBe('1000.00');
      expect(res.body.data.adjustment).toBe('560.00');
      expect(res.body.data.unit_price).toBe('1560.00');
    });

    it('returns base price when no variant is specified', async () => {
      const res = await request(app)
        .get('/api/v1/products/prod-odoo-demo/price')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.base_price).toBe('1000.00');
      expect(res.body.data.adjustment).toBe('0.00');
      expect(res.body.data.unit_price).toBe('1000.00');
    });

    it('rejects variant from another product with 404', async () => {
      const res = await request(app)
        .get('/api/v1/products/prod-odoo-demo/price?variant_id=var-foreign')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Case 7 & 8: Plan Create, Update & Frequencies
  // -------------------------------------------------------------------------
  describe('Case 7 & 8: Plan CRUD and Validations', () => {
    let productId;

    beforeEach(() => {
      const p = mock.seedProduct({ id: 'prod-plan-base', name: 'Core Base', sales_price: 50 });
      productId = p.id;
    });

    it('accepts each of the four frequencies (daily, weekly, monthly, yearly)', async () => {
      for (const freq of ['daily', 'weekly', 'monthly', 'yearly']) {
        const res = await request(app)
          .post('/api/v1/plans')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            product_id: productId,
            price: '29.99',
            frequency: freq,
            min_quantity: 1,
            auto_close: false,
            allow_early_close: true,
            allow_pause: true,
            allow_renew: true,
          });

        expect(res.status).toBe(201);
        expect(res.body.data.plan.frequency).toBe(freq);
      }
    });

    it('rejects an invalid frequency (400)', async () => {
      const res = await request(app)
        .post('/api/v1/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          product_id: productId,
          price: '29.99',
          frequency: 'hourly', // Invalid
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects min_quantity of 0 (400)', async () => {
      const res = await request(app)
        .post('/api/v1/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          product_id: productId,
          price: '29.99',
          frequency: 'monthly',
          min_quantity: 0,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects negative price (400)', async () => {
      const res = await request(app)
        .post('/api/v1/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          product_id: productId,
          price: '-10.00',
          frequency: 'monthly',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects available_until before available_from on create (400)', async () => {
      const res = await request(app)
        .post('/api/v1/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          product_id: productId,
          price: '10.00',
          frequency: 'monthly',
          available_from: '2026-12-01T00:00:00.000Z',
          available_until: '2026-11-01T00:00:00.000Z', // Before start
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('re-validates dates on merged result during PATCH (400)', async () => {
      const initialPlan = mock.seedPlan({
        id: 'plan-date-check',
        product_id: productId,
        price: 50,
        available_from: '2026-06-01T00:00:00.000Z',
        available_until: '2026-08-01T00:00:00.000Z',
      });

      // Update only available_until to a date before existing available_from
      const res = await request(app)
        .patch(`/api/v1/plans/${initialPlan.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          available_until: '2026-05-01T00:00:00.000Z',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('available_until must be on or after available_from');
    });
  });

  // -------------------------------------------------------------------------
  // Case 9: Plan Visibility (Customers restricted to available plans)
  // -------------------------------------------------------------------------
  describe('Case 9: Plan Visibility Restrictions', () => {
    let availablePlan;
    let expiredPlan;
    let futurePlan;

    beforeEach(() => {
      const prod = mock.seedProduct({ id: 'p-vis', name: 'Visibility Prod', sales_price: 100 });

      // Plan available right now
      availablePlan = mock.seedPlan({
        id: 'plan-active-now',
        product_id: prod.id,
        price: 99,
        available_from: '2026-01-01T00:00:00.000Z',
        available_until: '2026-12-31T23:59:59.000Z',
      });

      // Plan expired in the past
      expiredPlan = mock.seedPlan({
        id: 'plan-expired',
        product_id: prod.id,
        price: 49,
        available_from: '2025-01-01T00:00:00.000Z',
        available_until: '2025-12-31T23:59:59.000Z',
      });

      // Plan starting in the future
      futurePlan = mock.seedPlan({
        id: 'plan-future',
        product_id: prod.id,
        price: 149,
        available_from: '2028-01-01T00:00:00.000Z',
        available_until: '2028-12-31T23:59:59.000Z',
      });
    });

    it('customer receives 404 when requesting an expired plan by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/plans/${expiredPlan.id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('customer receives 404 when requesting a future plan by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/plans/${futurePlan.id}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('staff and admin CAN view expired or future plans by ID (200)', async () => {
      const staffRes = await request(app)
        .get(`/api/v1/plans/${expiredPlan.id}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(staffRes.status).toBe(200);
      expect(staffRes.body.data.plan.id).toBe(expiredPlan.id);

      const adminRes = await request(app)
        .get(`/api/v1/plans/${futurePlan.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.plan.id).toBe(futurePlan.id);
    });

    it('customer list only returns currently available plans', async () => {
      const res = await request(app)
        .get('/api/v1/plans')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.items.map((p) => p.id);
      expect(ids).toContain(availablePlan.id);
      expect(ids).not.toContain(expiredPlan.id);
      expect(ids).not.toContain(futurePlan.id);
    });
  });

  // -------------------------------------------------------------------------
  // Case 11: Error responses contain no stack traces or raw DB errors
  // -------------------------------------------------------------------------
  describe('Case 11: Error Response Sanitization', () => {
    it('returns clean error envelope without stack traces on validation errors', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body.stack).toBeUndefined();
      const stringified = JSON.stringify(res.body);
      expect(stringified).not.toContain('node_modules');
      expect(stringified).not.toContain('Error:');
    });
  });
});
