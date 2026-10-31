import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { setInjectedClients, resetInjectedClients } from '../src/lib/supabase.js';
import { createSupabaseMock } from './mocks/supabase.mock.js';

describe('Phase 5 Invoices Suite (API Endpoints & Lifecycle)', () => {
  let mock;
  let adminToken;
  let staffToken;
  let customer1Token;
  let customer2Token;
  const customer1Id = 'a0000000-0000-4000-8000-000000000001';
  const customer2Id = 'a0000000-0000-4000-8000-000000000002';
  const adminId = 'a0000000-0000-4000-8000-000000000099';
  const staffId = 'a0000000-0000-4000-8000-000000000098';

  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.RESEND_API_KEY;
    delete process.env.MAIL_FROM;

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
    process.env = originalEnv;
    resetInjectedClients();
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/invoices', () => {
    it('allows admin to list all invoices with pagination and batch financials', async () => {
      mock.seedInvoice({
        id: '11111111-1111-4111-8111-111111111101',
        invoice_number: 'INV-202610-000001',
        customer_id: customer1Id,
        status: 'draft',
        total: '1500.00',
      });
      mock.seedInvoice({
        id: '11111111-1111-4111-8111-111111111102',
        invoice_number: 'INV-202610-000002',
        customer_id: customer2Id,
        status: 'confirmed',
        total: '2000.00',
      });

      const res = await request(app)
        .get('/api/v1/invoices')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.pagination.total).toBe(2);
      expect(res.body.data.items[0].financials).toBeDefined();
    });

    it('scopes list results strictly to authenticated customer (isolation)', async () => {
      mock.seedInvoice({
        id: '11111111-1111-4111-8111-111111111101',
        invoice_number: 'INV-202610-000001',
        customer_id: customer1Id,
        status: 'confirmed',
        total: '1000.00',
      });
      mock.seedInvoice({
        id: '11111111-1111-4111-8111-111111111102',
        invoice_number: 'INV-202610-000002',
        customer_id: customer2Id,
        status: 'confirmed',
        total: '2000.00',
      });

      const res = await request(app)
        .get('/api/v1/invoices')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].customer_id).toBe(customer1Id);
    });

    it('customer portal /api/v1/portal/invoices returns own invoices', async () => {
      mock.seedInvoice({
        id: '11111111-1111-4111-8111-111111111101',
        invoice_number: 'INV-202610-000001',
        customer_id: customer1Id,
        status: 'confirmed',
        total: '1000.00',
      });

      const res = await request(app)
        .get('/api/v1/portal/invoices')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items[0].id).toBe('11111111-1111-4111-8111-111111111101');
    });
  });

  describe('GET /api/v1/invoices/:id', () => {
    it('returns full invoice details with lines, payments, and financials for staff', async () => {
      const invId = '11111111-1111-4111-8111-111111111103';
      mock.seedInvoice({
        id: invId,
        invoice_number: 'INV-202610-000003',
        customer_id: customer1Id,
        status: 'confirmed',
        subtotal: '1000.00',
        discount_total: '100.00',
        tax_total: '162.00',
        total: '1062.00',
        due_date: '2026-11-15',
      });
      mock.seedInvoiceLine({
        id: '22222222-2222-4222-8222-222222222201',
        invoice_id: invId,
        description: 'Pro Subscription Plan',
        quantity: 1,
        unit_price: '1000.00',
        line_total: '1062.00',
      });
      mock.seedPayment({
        id: '33333333-3333-4333-8333-333333333301',
        invoice_id: invId,
        amount: '500.00',
        payment_date: '2026-10-25',
        method: 'upi',
      });

      const res = await request(app)
        .get(`/api/v1/invoices/${invId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoice.lines).toHaveLength(1);
      expect(res.body.data.invoice.payments).toHaveLength(1);
      expect(res.body.data.invoice.financials.paid_amount).toBe('500.00');
      expect(res.body.data.invoice.financials.balance_due).toBe('562.00');
    });

    it('returns 404 when customer tries to access another customer invoice', async () => {
      const invId = '11111111-1111-4111-8111-111111111104';
      mock.seedInvoice({
        id: invId,
        invoice_number: 'INV-202610-000004',
        customer_id: customer2Id,
        status: 'confirmed',
        total: '2000.00',
      });

      const res = await request(app)
        .get(`/api/v1/invoices/${invId}`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/invoices/:id/confirm', () => {
    it('transitions draft invoice to confirmed status', async () => {
      const invId = '11111111-1111-4111-8111-111111111105';
      mock.seedInvoice({
        id: invId,
        invoice_number: 'INV-202610-000005',
        customer_id: customer1Id,
        status: 'draft',
        total: '500.00',
      });

      const res = await request(app)
        .post(`/api/v1/invoices/${invId}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoice.status).toBe('confirmed');
    });

    it('rejects confirmation if invoice is already confirmed (409)', async () => {
      const invId = '11111111-1111-4111-8111-111111111106';
      mock.seedInvoice({
        id: invId,
        invoice_number: 'INV-202610-000006',
        customer_id: customer1Id,
        status: 'confirmed',
        total: '500.00',
      });

      const res = await request(app)
        .post(`/api/v1/invoices/${invId}/confirm`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Only draft invoices can be confirmed');
    });

    it('rejects customer attempt to confirm invoice (403)', async () => {
      const invId = '11111111-1111-4111-8111-111111111107';
      mock.seedInvoice({
        id: invId,
        customer_id: customer1Id,
        status: 'draft',
      });

      const res = await request(app)
        .post(`/api/v1/invoices/${invId}/confirm`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/invoices/:id/cancel', () => {
    it('cancels draft invoice successfully', async () => {
      const invId = '11111111-1111-4111-8111-111111111108';
      mock.seedInvoice({
        id: invId,
        customer_id: customer1Id,
        status: 'draft',
        total: '1000.00',
      });

      const res = await request(app)
        .post(`/api/v1/invoices/${invId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.invoice.status).toBe('cancelled');
    });

    it('cancels confirmed invoice when zero payments exist', async () => {
      const invId = '11111111-1111-4111-8111-111111111109';
      mock.seedInvoice({
        id: invId,
        customer_id: customer1Id,
        status: 'confirmed',
        total: '1000.00',
      });

      const res = await request(app)
        .post(`/api/v1/invoices/${invId}/cancel`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.invoice.status).toBe('cancelled');
    });

    it('strictly forbids cancelling confirmed invoice with recorded payments (409)', async () => {
      const invId = '11111111-1111-4111-8111-111111111110';
      mock.seedInvoice({
        id: invId,
        customer_id: customer1Id,
        status: 'confirmed',
        total: '1000.00',
      });
      mock.seedPayment({
        id: '33333333-3333-4333-8333-333333333302',
        invoice_id: invId,
        amount: '200.00',
      });

      const res = await request(app)
        .post(`/api/v1/invoices/${invId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('recorded payments');
    });
  });

  describe('POST /api/v1/invoices/:id/send', () => {
    const invId = '11111111-1111-4111-8111-111111111111';

    beforeEach(() => {
      mock.seedInvoice({
        id: invId,
        invoice_number: 'INV-202610-000011',
        customer_id: customer1Id,
        status: 'confirmed',
        total: '1000.00',
      });
    });

    it('returns 503 Service Unavailable when Resend credentials are not configured', async () => {
      const res = await request(app)
        .post(`/api/v1/invoices/${invId}/send`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Email delivery service is not configured');
    });

    it('dispatches email via Resend API and records sent_at when configured', async () => {
      process.env.RESEND_API_KEY = 're_test_key_12345';
      process.env.MAIL_FROM = 'billing@brightloop.io';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'email_msg_12345' }),
      });
      global.fetch = mockFetch;

      const res = await request(app)
        .post(`/api/v1/invoices/${invId}/send`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ recipient_email: 'cust1@brightloop.local' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sent).toBe(true);
      expect(res.body.data.messageId).toBe('email_msg_12345');
      expect(res.body.data.invoice.sent_at).toBeDefined();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer re_test_key_12345',
          }),
        })
      );
    });

    it('does not set sent_at and returns error when email provider returns error', async () => {
      process.env.RESEND_API_KEY = 're_test_key_12345';
      process.env.MAIL_FROM = 'billing@brightloop.io';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Rate limit exceeded' }),
      });
      global.fetch = mockFetch;

      const res = await request(app)
        .post(`/api/v1/invoices/${invId}/send`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ recipient_email: 'cust1@brightloop.local' });

      expect(res.status).toBe(502);
      expect(res.body.success).toBe(false);

      // Verify that invoice row in DB still has sent_at null
      const checkRes = await request(app)
        .get(`/api/v1/invoices/${invId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(checkRes.body.data.invoice.sent_at).toBeNull();
    });

    it('rejects sending draft invoice (400)', async () => {
      const draftId = '11111111-1111-4111-8111-111111111112';
      mock.seedInvoice({
        id: draftId,
        customer_id: customer1Id,
        status: 'draft',
      });

      const res = await request(app)
        .post(`/api/v1/invoices/${draftId}/send`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Only confirmed or paid invoices can be sent');
    });
  });

  describe('GET /api/v1/invoices/:id/print', () => {
    const invId = '11111111-1111-4111-8111-111111111113';

    beforeEach(() => {
      mock.seedInvoice({
        id: invId,
        invoice_number: 'INV-202610-000013',
        customer_id: customer1Id,
        status: 'confirmed',
        subtotal: '2500.00',
        total: '2500.00',
      });
      mock.seedInvoiceLine({
        id: '22222222-2222-4222-8222-222222222203',
        invoice_id: invId,
        description: 'Product <script>alert("xss")</script>',
        quantity: 1,
        unit_price: '2500.00',
        line_total: '2500.00',
      });
    });

    it('returns JSON representation by default', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/${invId}/print`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoice.invoice_number).toBe('INV-202610-000013');
    });

    it('returns styled HTML with full XSS escaping when ?format=html is requested', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/${invId}/print?format=html`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');

      // Crucial Security Verification: Script tags must be safely entity-escaped
      expect(res.text).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(res.text).not.toContain('<script>alert("xss")</script>');
      expect(res.text).toContain('Brightloop Subscriptions');
      expect(res.text).toContain('INV-202610-000013');
    });

    it('forbids foreign customer from printing invoice (404)', async () => {
      const res = await request(app)
        .get(`/api/v1/invoices/${invId}/print`)
        .set('Authorization', `Bearer ${customer2Token}`);

      expect(res.status).toBe(404);
    });
  });
});

