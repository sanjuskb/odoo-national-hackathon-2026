import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { setInjectedClients, resetInjectedClients } from '../src/lib/supabase.js';
import { createSupabaseMock } from './mocks/supabase.mock.js';
import { calculateLineTax, roundHalfUpDiv } from '../src/services/tax.service.js';

describe('Phase 4 Taxes Suite (Pure Unit Tests & API Endpoints)', () => {
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

  // =========================================================================
  // 1. Pure Tax Service Unit Tests (Step B1 requirements)
  // =========================================================================
  describe('tax.service.js Pure Calculations', () => {
    it('calculates 100.00 @ 18% = 18.00 exactly (10000 minor units @ 18% = 1800 minor units)', () => {
      const tax = calculateLineTax(10000, '18.00');
      expect(tax).toBe(1800);
    });

    it('calculates 0.10 @ 18% rounding half-up to 2 minor units (0.02)', () => {
      // 10 * 1800 = 18000; (18000 + 5000) / 10000 = 23000 / 10000 = 2 minor units (0.02)
      const tax = calculateLineTax(10, '18.00');
      expect(tax).toBe(2);
    });

    it('calculates 33.33 @ 5% = 1.67 exactly (3333 minor units @ 5% = 167 minor units)', () => {
      // 3333 * 500 = 1666500; (1666500 + 5000) / 10000 = 1671500 / 10000 = 167
      const tax = calculateLineTax(3333, '5.00');
      expect(tax).toBe(167);
    });

    it('calculates 0% rate = 0 minor units', () => {
      const tax = calculateLineTax(50000, '0.00');
      expect(tax).toBe(0);
    });

    it('handles boundary half cases correctly with round half-up', () => {
      // 1.00 (100) @ 2.50% (250 bps): 100 * 250 = 25000 / 10000 = 2.5 -> rounds UP to 3
      expect(calculateLineTax(100, '2.50')).toBe(3);

      // 0.99 (99) @ 2.50% (250 bps): 99 * 250 = 24750 / 10000 = 2.475 -> rounds DOWN to 2
      expect(calculateLineTax(99, '2.50')).toBe(2);

      // 1.01 (101) @ 2.50% (250 bps): 101 * 250 = 25250 / 10000 = 2.525 -> rounds UP to 3
      expect(calculateLineTax(101, '2.50')).toBe(3);
    });

    it('throws RangeError on negative net amount or rate outside 0..100', () => {
      expect(() => calculateLineTax(-100, '18.00')).toThrow(RangeError);
      expect(() => calculateLineTax(1000, '105.00')).toThrow();
      expect(() => roundHalfUpDiv(-10n, 100n)).toThrow(RangeError);
      expect(() => roundHalfUpDiv(10n, 0n)).toThrow(RangeError);
    });
  });

  // =========================================================================
  // 2. Tax Endpoints RBAC & Validation (Step B1 requirements)
  // =========================================================================
  describe('Tax API Endpoints', () => {
    it('allows Admin to create a tax rule (201)', async () => {
      const res = await request(app)
        .post('/api/v1/taxes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'GST 18%',
          rate_percent: '18.00',
          description: 'Standard Goods & Services Tax',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tax.name).toBe('GST 18%');
      expect(res.body.data.tax.rate_percent).toBe('18.00');
      expect(res.body.data.tax.is_active).toBe(true);
      expect(res.body.errors).toBeNull();
    });

    it('allows Admin to update tax rule and deactivate instead of delete (200)', async () => {
      const tax = mock.seedTaxRule({
        name: 'Service Tax',
        rate_percent: '12.00',
        is_active: true,
      });

      const res = await request(app)
        .patch(`/api/v1/taxes/${tax.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Service Tax (Legacy)',
          is_active: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tax.name).toBe('Service Tax (Legacy)');
      expect(res.body.data.tax.is_active).toBe(false);
      expect(res.body.data.tax.rate_percent).toBe('12.00');
    });

    it('allows Staff to list and get tax rules (read-only)', async () => {
      const tax = mock.seedTaxRule({ name: 'VAT 5%', rate_percent: '5.00' });

      // List
      const listRes = await request(app)
        .get('/api/v1/taxes')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(listRes.body.data.items.length).toBeGreaterThanOrEqual(1);

      // Get by id
      const getRes = await request(app)
        .get(`/api/v1/taxes/${tax.id}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.tax.id).toBe(tax.id);
    });

    it('rejects Staff from creating or updating tax rules (403)', async () => {
      const tax = mock.seedTaxRule({ name: 'Tax 10%', rate_percent: '10.00' });

      const createRes = await request(app)
        .post('/api/v1/taxes')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ name: 'Unauthorized Tax', rate_percent: '10.00' });
      expect(createRes.status).toBe(403);

      const updateRes = await request(app)
        .patch(`/api/v1/taxes/${tax.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ is_active: false });
      expect(updateRes.status).toBe(403);
    });

    it('rejects Customer from all tax endpoints (403)', async () => {
      const tax = mock.seedTaxRule({ name: 'Tax 10%', rate_percent: '10.00' });

      const listRes = await request(app)
        .get('/api/v1/taxes')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(listRes.status).toBe(403);

      const getRes = await request(app)
        .get(`/api/v1/taxes/${tax.id}`)
        .set('Authorization', `Bearer ${customerToken}`);
      expect(getRes.status).toBe(403);

      const postRes = await request(app)
        .post('/api/v1/taxes')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ name: 'Customer Tax', rate_percent: '5.00' });
      expect(postRes.status).toBe(403);

      const patchRes = await request(app)
        .patch(`/api/v1/taxes/${tax.id}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ is_active: false });
      expect(patchRes.status).toBe(403);
    });

    it('rejects unauthenticated requests (401)', async () => {
      const res = await request(app).get('/api/v1/taxes');
      expect(res.status).toBe(401);
    });

    it('rejects invalid tax rates (rate > 100, rate < 0, more than 2 decimals) with 400', async () => {
      // Over 100
      const res1 = await request(app)
        .post('/api/v1/taxes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Huge Tax', rate_percent: '105.00' });
      expect(res1.status).toBe(400);

      // Negative
      const res2 = await request(app)
        .post('/api/v1/taxes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Negative Tax', rate_percent: '-5.00' });
      expect(res2.status).toBe(400);

      // 3 decimals
      const res3 = await request(app)
        .post('/api/v1/taxes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Fractional Tax', rate_percent: '18.125' });
      expect(res3.status).toBe(400);
    });

    it('filters active taxes via query parameter', async () => {
      mock.seedTaxRule({ name: 'Active Tax', rate_percent: '10.00', is_active: true });
      mock.seedTaxRule({ name: 'Inactive Tax', rate_percent: '15.00', is_active: false });

      const res = await request(app)
        .get('/api/v1/taxes?is_active=true')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.every((t) => t.is_active === true)).toBe(true);
    });
  });
});

