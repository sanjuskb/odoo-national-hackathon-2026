import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { setInjectedClients, resetInjectedClients } from '../src/lib/supabase.js';
import { createSupabaseMock } from './mocks/supabase.mock.js';

describe('Phase 5 Payments Suite (Payment Ledger & Settlement)', () => {
  let mock;
  let adminToken;
  let staffToken;
  let customer1Token;
  let customer2Token;
  const customer1Id = 'a0000000-0000-4000-8000-000000000001';
  const customer2Id = 'a0000000-0000-4000-8000-000000000002';
  const adminId = 'a0000000-0000-4000-8000-000000000099';
  const staffId = 'a0000000-0000-4000-8000-000000000098';

  beforeEach(() => {
    mock = createSupabaseMock();
    setInjectedClients({
      admin: mock.adminClient,
      publicClient: mock.publicClient,
    });

    adminToken = mock.seedUser({ id: adminId, email: 'admin@brightloop.local', role: 'admin' }).token;
    staffToken = mock.seedUser({ id: staffId, email: 'staff@brightloop.local', role: 'staff' }).token;
    customer1Token = mock.seedUser({ id: customer1Id, email: 'cust1@brightloop.local', role: 'customer' }).token;
    customer2Token = mock.seedUser({ id: customer2Id, email: 'cust2@brightloop.local', role: 'customer' }).token;
  });

  afterEach(() => {
    resetInjectedClients();
  });

  describe('POST /api/v1/invoices/:id/payments', () => {
    const invId = '11111111-1111-4111-8111-111111111201';

    beforeEach(() => {
      mock.seedInvoice({
        id: invId,
        invoice_number: 'INV-202610-000201',
        customer_id: customer1Id,
        status: 'confirmed',
        subtotal: '1000.00',
        total: '1000.00',
        due_date: '2026-11-01',
      });
    });

    it('records partial payment, keeps invoice confirmed, and reduces balance due', async () => {
      const res = await request(app)
        .post(`/api/v1/invoices/${invId}/payments`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          amount: '400.00',
          method: 'bank_transfer',
          reference: 'TXN-987654',
          note: 'Initial deposit',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payment.amount).toBe('400.00');
      expect(res.body.data.willPayInFull).toBe(false);
      expect(res.body.data.financials.balance_due).toBe('600.00');
      expect(res.body.data.invoice.status).toBe('confirmed');
    });

    it('automatically marks invoice paid and records paid_at when payment settles balance in full', async () => {
      // First partial payment: 600.00
      await request(app)
        .post(`/api/v1/invoices/${invId}/payments`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          amount: '600.00',
          method: 'card',
        });

      // Second payment settling remaining 400.00
      const res = await request(app)
        .post(`/api/v1/invoices/${invId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: '400.00',
          method: 'upi',
          reference: 'UPI-112233',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.willPayInFull).toBe(true);
      expect(res.body.data.financials.balance_due).toBe('0.00');
      expect(res.body.data.invoice.status).toBe('paid');
      expect(res.body.data.invoice.paid_at).toBeDefined();

      // Verify that querying invoice now reflects paid status
      const getRes = await request(app)
        .get(`/api/v1/invoices/${invId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(getRes.body.data.invoice.status).toBe('paid');
      expect(getRes.body.data.invoice.financials.balance_due).toBe('0.00');
    });

    it('strictly rejects overpayment attempt exceeding remaining balance (400)', async () => {
      const res = await request(app)
        .post(`/api/v1/invoices/${invId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: '1200.00',
          method: 'cash',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('exceeds remaining balance due');
    });

    it('rejects zero and negative payment amounts (400)', async () => {
      const zeroRes = await request(app)
        .post(`/api/v1/invoices/${invId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: '0.00',
          method: 'cash',
        });

      expect(zeroRes.status).toBe(400);

      const negRes = await request(app)
        .post(`/api/v1/invoices/${invId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: '-50.00',
          method: 'cash',
        });

      expect(negRes.status).toBe(400);
    });

    it('forbids customer from recording payments (403)', async () => {
      const res = await request(app)
        .post(`/api/v1/invoices/${invId}/payments`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          amount: '100.00',
          method: 'upi',
        });

      expect(res.status).toBe(403);
    });

    it('rejects payment recording on a draft invoice (400)', async () => {
      const draftId = '11111111-1111-4111-8111-111111111202';
      mock.seedInvoice({
        id: draftId,
        customer_id: customer1Id,
        status: 'draft',
        total: '500.00',
      });

      const res = await request(app)
        .post(`/api/v1/invoices/${draftId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: '100.00',
          method: 'cash',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot record payment on a draft invoice');
    });

    it('rejects payment recording on a cancelled invoice (400)', async () => {
      const cancelledId = '11111111-1111-4111-8111-111111111203';
      mock.seedInvoice({
        id: cancelledId,
        customer_id: customer1Id,
        status: 'cancelled',
        total: '500.00',
      });

      const res = await request(app)
        .post(`/api/v1/invoices/${cancelledId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: '100.00',
          method: 'cash',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot record payment on a cancelled invoice');
    });

    it('rejects payment recording on an already paid invoice (400)', async () => {
      const paidId = '11111111-1111-4111-8111-111111111204';
      mock.seedInvoice({
        id: paidId,
        customer_id: customer1Id,
        status: 'paid',
        total: '500.00',
      });

      const res = await request(app)
        .post(`/api/v1/invoices/${paidId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: '100.00',
          method: 'cash',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already fully paid');
    });
  });

  describe('GET /api/v1/payments (Global Ledger)', () => {
    beforeEach(() => {
      mock.seedPayment({
        id: '33333333-3333-4333-8333-333333333401',
        invoice_id: '11111111-1111-4111-8111-111111111201',
        amount: '250.00',
        payment_date: '2026-10-20',
        method: 'upi',
      });
      mock.seedPayment({
        id: '33333333-3333-4333-8333-333333333402',
        invoice_id: '11111111-1111-4111-8111-111111111201',
        amount: '750.00',
        payment_date: '2026-10-22',
        method: 'bank_transfer',
      });
    });

    it('allows staff & admin to list all payments across invoices', async () => {
      const res = await request(app)
        .get('/api/v1/payments')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.pagination.total).toBe(2);
    });

    it('filters payments by date range', async () => {
      const res = await request(app)
        .get('/api/v1/payments?date_from=2026-10-21')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].id).toBe('33333333-3333-4333-8333-333333333402');
    });

    it('forbids customer from accessing global payment ledger (403)', async () => {
      const res = await request(app)
        .get('/api/v1/payments')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/invoices/:id/payments', () => {
    const invId = '11111111-1111-4111-8111-111111111205';

    beforeEach(() => {
      mock.seedInvoice({
        id: invId,
        customer_id: customer1Id,
        status: 'confirmed',
        total: '500.00',
      });
      mock.seedPayment({
        id: '33333333-3333-4333-8333-333333333501',
        invoice_id: invId,
        amount: '150.00',
        method: 'card',
      });
    });

    it('allows customer to view payment history for own invoice', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/${invId}/payments`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payments).toHaveLength(1);
      expect(res.body.data.payments[0].amount).toBe('150.00');
    });

    it('forbids customer from viewing payment history for foreign invoice (404)', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/${invId}/payments`)
        .set('Authorization', `Bearer ${customer2Token}`);

      expect(res.status).toBe(404);
    });
  });
});

