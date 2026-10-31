import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { setInjectedClients, resetInjectedClients } from '../src/lib/supabase.js';
import { createSupabaseMock } from './mocks/supabase.mock.js';
import { toDateOnly, addDays } from '../src/utils/dates.js';

describe('Phase 3 Quotation Templates & Subscriptions Test Suite (Supabase Client Mocked)', () => {
  let mock;
  let adminToken;
  let staffToken;
  let customer1Token;
  let customer2Token;
  let customer1Id;
  let customer2Id;

  let baseProduct;
  let microProduct;
  let odooVariant;
  let activePlan;
  let restrictedPlan;
  let autoClosePlan;

  beforeEach(() => {
    mock = createSupabaseMock();
    setInjectedClients({
      admin: mock.adminClient,
      publicClient: mock.publicClient,
    });

    const adminUser = mock.seedUser({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', email: 'admin@brightloop.local', role: 'admin' });
    adminToken = adminUser.token;

    const staffUser = mock.seedUser({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email: 'staff@brightloop.local', role: 'staff' });
    staffToken = staffUser.token;

    const c1 = mock.seedUser({ id: 'c0a80101-0000-4000-8000-000000000001', email: 'cust1@brightloop.local', role: 'customer' });
    customer1Id = c1.user.id;
    customer1Token = c1.token;

    const c2 = mock.seedUser({ id: 'c0a80101-0000-4000-8000-000000000002', email: 'cust2@brightloop.local', role: 'customer' });
    customer2Id = c2.user.id;
    customer2Token = c2.token;

    // Seed products & variants (valid UUIDs)
    baseProduct = mock.seedProduct({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Brightloop Base Product',
      sales_price: 1000.0,
      cost_price: 300.0,
    });

    microProduct = mock.seedProduct({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Micro Service Product',
      sales_price: 0.1,
      cost_price: 0.05,
    });

    odooVariant = mock.seedVariant({
      id: '33333333-3333-4333-8333-333333333333',
      product_id: baseProduct.id,
      name: 'Odoo Brand',
      price_adjustment: 560.0,
    });

    // Seed recurring plans (valid UUIDs)
    activePlan = mock.seedPlan({
      id: '44444444-4444-4444-8444-444444444444',
      product_id: baseProduct.id,
      price: 1560.0,
      frequency: 'monthly',
      min_quantity: 2,
      available_from: '2026-01-01',
      available_until: '2026-12-31',
      auto_close: false,
      allow_early_close: true,
      allow_pause: true,
      allow_renew: true,
    });

    restrictedPlan = mock.seedPlan({
      id: '55555555-5555-4555-8555-555555555555',
      product_id: baseProduct.id,
      price: 1000.0,
      frequency: 'monthly',
      min_quantity: 1,
      available_from: '2026-01-01',
      available_until: '2026-12-31',
      auto_close: false,
      allow_early_close: false,
      allow_pause: false,
      allow_renew: false,
    });

    autoClosePlan = mock.seedPlan({
      id: '66666666-6666-4666-8666-666666666666',
      product_id: baseProduct.id,
      price: 500.0,
      frequency: 'monthly',
      min_quantity: 1,
      available_from: '2025-01-01',
      available_until: '2026-01-01',
      auto_close: true,
      allow_early_close: true,
      allow_pause: true,
      allow_renew: true,
    });
  });

  afterEach(() => {
    resetInjectedClients();
    mock.reset();
  });

  // ---------------------------------------------------------------------------
  // STEP 7 Required Case 2: Quotation Templates
  // ---------------------------------------------------------------------------
  describe('Quotation Templates (Admin write, Staff read, Customer 403)', () => {
    let createdTemplateId;

    it('allows Admin to create a quotation template (201)', async () => {
      const res = await request(app)
        .post('/api/v1/quotation-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Enterprise Package Template',
          plan_id: activePlan.id,
          validity_days: 14,
          lines: [
            {
              product_id: baseProduct.id,
              variant_id: odooVariant.id,
              quantity: 3,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.template.name).toBe('Enterprise Package Template');
      expect(res.body.data.template.validity_days).toBe(14);
      expect(res.body.data.template.lines.length).toBe(1);
      createdTemplateId = res.body.data.template.id;
    });

    it('allows Staff to read quotation templates (200) but not create (403)', async () => {
      const listRes = await request(app)
        .get('/api/v1/quotation-templates')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(Array.isArray(listRes.body.data.items)).toBe(true);

      const postRes = await request(app)
        .post('/api/v1/quotation-templates')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Staff Template',
          plan_id: activePlan.id,
          validity_days: 7,
          lines: [{ product_id: baseProduct.id, quantity: 1 }],
        });

      expect(postRes.status).toBe(403);
    });

    it('rejects Customer on all quotation template endpoints (403)', async () => {
      const listRes = await request(app)
        .get('/api/v1/quotation-templates')
        .set('Authorization', `Bearer ${customer1Token}`);
      expect(listRes.status).toBe(403);

      const postRes = await request(app)
        .post('/api/v1/quotation-templates')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ name: 'Hacker Template' });
      expect(postRes.status).toBe(403);
    });

    it('rejects template with non-existent plan (400)', async () => {
      const res = await request(app)
        .post('/api/v1/quotation-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Plan Template',
          plan_id: '99999999-9999-4999-8999-999999999999',
          validity_days: 10,
          lines: [{ product_id: baseProduct.id, quantity: 2 }],
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/plan.*not found/i);
    });

    it('rejects template with foreign variant (400)', async () => {
      const foreignProduct = mock.seedProduct({
        id: '77777777-7777-4777-8777-777777777777',
        name: 'Foreign Product',
      });

      const res = await request(app)
        .post('/api/v1/quotation-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Foreign Variant Template',
          plan_id: activePlan.id,
          validity_days: 10,
          lines: [
            {
              product_id: foreignProduct.id,
              variant_id: odooVariant.id, // odooVariant belongs to baseProduct, not foreignProduct!
              quantity: 2,
            },
          ],
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/does not belong to product/i);
    });

    it('rejects validity_days < 1 (400)', async () => {
      const res = await request(app)
        .post('/api/v1/quotation-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Zero Days Template',
          plan_id: activePlan.id,
          validity_days: 0,
          lines: [{ product_id: baseProduct.id, quantity: 2 }],
        });
      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // STEP 7 Required Case 3: Subscription Creation & Money Arithmetic
  // ---------------------------------------------------------------------------
  describe('Subscription Creation, Number Generation, and Exact Money Math', () => {
    it('creates a subscription with unique number and exact money math (1000 + 560 = 1560 x 3 = 4680.00)', async () => {
      const res = await request(app)
        .post('/api/v1/subscriptions')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          customer_id: customer1Id,
          plan_id: activePlan.id,
          start_date: '2026-06-01',
          expiry_date: '2026-12-01',
          payment_terms: 'net_30',
          lines: [
            {
              product_id: baseProduct.id,
              variant_id: odooVariant.id,
              quantity: 3,
              unit_price: '9999.99', // Client-sent unit_price must be IGNORED
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const sub = res.body.data.subscription;
      expect(sub.subscription_number).toMatch(/^SUB-\d{6}-[A-Z0-9]{6}$/);
      expect(sub.status).toBe('draft');
      expect(sub.next_billing_date).toBeNull();
      expect(sub.subtotal).toBe('4680.00'); // 3 x 1560.00 = 4680.00 exact!

      const line = sub.lines[0];
      expect(line.unit_price).toBe('1000.00'); // Base price stored separately from variant
      expect(line.variant_adjustment).toBe('560.00'); // Variant adjustment stored separately to prevent double counting in billing
      expect(line.amount).toBe('4680.00');
    });

    it('computes exact fractional minor unit money (3 x 0.10 = 0.30)', async () => {
      const res = await request(app)
        .post('/api/v1/subscriptions')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          customer_id: customer1Id,
          plan_id: restrictedPlan.id,
          start_date: '2026-06-01',
          expiry_date: '2026-12-01',
          payment_terms: 'immediate',
          lines: [
            {
              product_id: microProduct.id,
              quantity: 3,
            },
          ],
        });

      expect(res.status).toBe(201);
      const sub = res.body.data.subscription;
      expect(sub.lines[0].unit_price).toBe('0.10');
      expect(sub.lines[0].amount).toBe('0.30');
      expect(sub.subtotal).toBe('0.30');
    });

    it('creates a subscription from quotation template copying plan, lines, and computing valid_until', async () => {
      // Seed template
      const template = mock.seedQuotationTemplate({
        id: 'd0000000-0000-4000-8000-000000000001',
        name: 'Preconfigured Template',
        plan_id: activePlan.id,
        validity_days: 15,
      });
      mock.seedVariant({
        id: odooVariant.id,
        product_id: baseProduct.id,
        name: 'Odoo Brand',
        price_adjustment: 560.0,
      });

      // Insert template lines in mock
      const qtlTable = mock.quotationTemplateLinesTable;
      qtlTable.set('d0000000-0000-4000-8000-000000000002', {
        id: 'd0000000-0000-4000-8000-000000000002',
        template_id: template.id,
        product_id: baseProduct.id,
        variant_id: odooVariant.id,
        quantity: 2,
      });

      const res = await request(app)
        .post('/api/v1/subscriptions')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          customer_id: customer1Id,
          template_id: template.id,
          start_date: '2026-06-01',
          expiry_date: '2026-12-01',
          payment_terms: 'immediate',
        });

      expect(res.status).toBe(201);
      const sub = res.body.data.subscription;
      expect(sub.plan_id).toBe(activePlan.id);
      expect(sub.template_id).toBe(template.id);
      expect(sub.lines.length).toBe(1);
      expect(sub.lines[0].unit_price).toBe('1000.00');
      expect(sub.lines[0].variant_adjustment).toBe('560.00');
      expect(sub.lines[0].amount).toBe('3120.00'); // 2 x 1560.00 = 3120.00
      expect(sub.valid_until).toBe(addDays(toDateOnly(new Date()), 15));
    });

    it('rejects create when template_id is sent alongside plan_id or lines (400)', async () => {
      const template = mock.seedQuotationTemplate({
        id: 'd0000000-0000-4000-8000-000000000003',
        name: 'Template',
        plan_id: activePlan.id,
        validity_days: 10,
      });

      const res = await request(app)
        .post('/api/v1/subscriptions')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          customer_id: customer1Id,
          template_id: template.id,
          plan_id: activePlan.id, // Ambiguous!
          start_date: '2026-06-01',
          expiry_date: '2026-12-01',
          payment_terms: 'immediate',
        });

      expect(res.status).toBe(400);
    });

    it('rejects create when expiry_date is before start_date (400)', async () => {
      const res = await request(app)
        .post('/api/v1/subscriptions')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          customer_id: customer1Id,
          plan_id: activePlan.id,
          start_date: '2026-06-01',
          expiry_date: '2026-05-31', // Before start!
          payment_terms: 'immediate',
          lines: [{ product_id: baseProduct.id, quantity: 2 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.errors.some((e) => e.issue.includes('expiry_date') || e.field === 'expiry_date')).toBe(true);
    });

    it('rejects create when quantity is below plan minimum (400)', async () => {
      // activePlan has min_quantity = 2
      const res = await request(app)
        .post('/api/v1/subscriptions')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          customer_id: customer1Id,
          plan_id: activePlan.id,
          start_date: '2026-06-01',
          expiry_date: '2026-12-01',
          payment_terms: 'immediate',
          lines: [{ product_id: baseProduct.id, quantity: 1 }], // Below min 2
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/minimum quantity/i);
    });

    it('rejects create with non-existent or non-customer user (400)', async () => {
      // staff user is not a customer
      const res = await request(app)
        .post('/api/v1/subscriptions')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          customer_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', // staffId, not customer
          plan_id: activePlan.id,
          start_date: '2026-06-01',
          expiry_date: '2026-12-01',
          payment_terms: 'immediate',
          lines: [{ product_id: baseProduct.id, quantity: 2 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/customer role/i);
    });
  });

  // ---------------------------------------------------------------------------
  // STEP 7 Required Case 4 & 5: Editing & Ownership Scoping
  // ---------------------------------------------------------------------------
  describe('Subscription Editing & Customer Ownership Isolation', () => {
    let subDraft;
    let subActive;

    beforeEach(async () => {
      // Create sub for customer1
      const resDraft = await request(app)
        .post('/api/v1/subscriptions')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          customer_id: customer1Id,
          plan_id: activePlan.id,
          start_date: '2026-06-01',
          expiry_date: '2026-12-01',
          payment_terms: 'immediate',
          lines: [{ product_id: baseProduct.id, quantity: 2 }],
        });
      subDraft = resDraft.body.data.subscription;

      // Seed an active sub for customer2
      subActive = mock.seedSubscription({
        id: '88888888-8888-4888-8888-888888888882',
        subscription_number: 'SUB-202606-ACT002',
        customer_id: customer2Id,
        plan_id: activePlan.id,
        start_date: '2026-06-01',
        expiry_date: '2026-12-01',
        status: 'active',
      });
      mock.seedSubscriptionLine({
        subscription_id: subActive.id,
        product_id: baseProduct.id,
        quantity: 2,
        unit_price: '1000.00',
        amount: '2000.00',
      });
    });

    it('allows staff to edit subscription in draft status (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/subscriptions/${subDraft.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          payment_terms: '30_days',
          expiry_date: '2026-12-31',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.subscription.payment_terms).toBe('30_days');
      expect(res.body.data.subscription.expiry_date).toBe('2026-12-31');
    });

    it('rejects editing active subscription with 409 Conflict', async () => {
      const res = await request(app)
        .patch(`/api/v1/subscriptions/${subActive.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ payment_terms: '30_days' });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/cannot be edited in 'active'/i);
    });

    it('rejects PATCH payload attempting to modify status or number (400)', async () => {
      const res = await request(app)
        .patch(`/api/v1/subscriptions/${subDraft.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'active' });

      expect(res.status).toBe(400);
      expect(res.body.errors.some((e) => e.issue.includes('status') || e.issue.includes('subscription'))).toBe(true);
    });

    it('customer sees ONLY their own subscriptions in list', async () => {
      const res1 = await request(app)
        .get('/api/v1/subscriptions')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res1.status).toBe(200);
      expect(res1.body.data.items.length).toBe(1);
      expect(res1.body.data.items[0].customer_id).toBe(customer1Id);

      // Customer passing another customer_id is ignored
      const resSpoofed = await request(app)
        .get(`/api/v1/subscriptions?customer_id=${customer2Id}`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(resSpoofed.status).toBe(200);
      expect(resSpoofed.body.data.items.length).toBe(1);
      expect(resSpoofed.body.data.items[0].customer_id).toBe(customer1Id);
    });

    it('customer gets 404 Not Found when trying to read another customer subscription', async () => {
      // Customer 1 tries to read Customer 2's subscription
      const res = await request(app)
        .get(`/api/v1/subscriptions/${subActive.id}`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('staff and admin can view any subscription', async () => {
      const res = await request(app)
        .get(`/api/v1/subscriptions/${subActive.id}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.subscription.id).toBe(subActive.id);
    });

    it('rejects customer trying to create subscription (403)', async () => {
      const res = await request(app)
        .post('/api/v1/subscriptions')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          customer_id: customer1Id,
          plan_id: activePlan.id,
          start_date: '2026-06-01',
          expiry_date: '2026-12-01',
          payment_terms: 'immediate',
          lines: [{ product_id: baseProduct.id, quantity: 2 }],
        });

      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // STEP 7 Required Case 6 & 7: Lifecycle Happy Path & Invalid Transitions
  // ---------------------------------------------------------------------------
  describe('Subscription Lifecycle Transitions (Draft -> Quotation -> Confirmed -> Active -> Closed)', () => {
    let subId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/subscriptions')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          customer_id: customer1Id,
          plan_id: activePlan.id,
          start_date: '2026-06-01',
          expiry_date: '2026-12-01',
          payment_terms: 'immediate',
          valid_until: '2026-12-31',
          lines: [{ product_id: baseProduct.id, quantity: 2 }],
        });
      subId = res.body.data.subscription.id;
    });

    it('progresses full happy path from draft to closed with activation setting next_billing_date', async () => {
      // 1. send_quotation: draft -> quotation (Staff)
      const qRes = await request(app)
        .post(`/api/v1/subscriptions/${subId}/transition`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ action: 'send_quotation' });
      expect(qRes.status).toBe(200);
      expect(qRes.body.data.subscription.status).toBe('quotation');

      // 2. confirm: quotation -> confirmed (Staff)
      const cRes = await request(app)
        .post(`/api/v1/subscriptions/${subId}/transition`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ action: 'confirm' });
      expect(cRes.status).toBe(200);
      expect(cRes.body.data.subscription.status).toBe('confirmed');

      // 3. activate: confirmed -> active (Staff) sets next_billing_date = start_date
      const aRes = await request(app)
        .post(`/api/v1/subscriptions/${subId}/transition`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ action: 'activate' });
      expect(aRes.status).toBe(200);
      expect(aRes.body.data.subscription.status).toBe('active');
      expect(aRes.body.data.subscription.next_billing_date).toBe('2026-06-01');

      // 4. close: active -> closed (Staff)
      const clRes = await request(app)
        .post(`/api/v1/subscriptions/${subId}/transition`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ action: 'close' });
      expect(clRes.status).toBe(200);
      expect(clRes.body.data.subscription.status).toBe('closed');
    });

    it('rejects invalid jump transitions (draft -> active) with 409', async () => {
      const res = await request(app)
        .post(`/api/v1/subscriptions/${subId}/transition`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ action: 'activate' });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/not allowed for subscription in status 'draft'/i);
    });

    it('rejects closed subscription from transitioning anywhere with 409', async () => {
      // Cancel/close draft
      await request(app)
        .post(`/api/v1/subscriptions/${subId}/transition`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ action: 'close' });

      // Attempt transition on closed subscription
      const res = await request(app)
        .post(`/api/v1/subscriptions/${subId}/transition`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ action: 'activate' });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/closed subscription cannot be modified/i);
    });

    it('rejects confirm if valid_until has passed (409)', async () => {
      // Send quotation
      await request(app)
        .post(`/api/v1/subscriptions/${subId}/transition`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ action: 'send_quotation' });

      // Set valid_until to yesterday in mock
      const sub = mock.subscriptionsTable.get(subId);
      sub.valid_until = '2020-01-01';

      const res = await request(app)
        .post(`/api/v1/subscriptions/${subId}/transition`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ action: 'confirm' });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/expired/i);
    });
  });

  // ---------------------------------------------------------------------------
  // STEP 7 Required Case 8, 9, 10: Plan Restrictions, Concurrency & Renewal
  // ---------------------------------------------------------------------------
  describe('Plan Policy Enforcement, Concurrency, and Renewal', () => {
    let subRestricted;
    let subActive;

    beforeEach(async () => {
      // Seed active sub under restrictedPlan
      subRestricted = mock.seedSubscription({
        id: '88888888-8888-4888-8888-888888888810',
        subscription_number: 'SUB-202606-RES010',
        customer_id: customer1Id,
        plan_id: restrictedPlan.id,
        status: 'active',
        expiry_date: '2026-08-31',
        is_paused: false,
      });

      // Seed active sub under activePlan
      subActive = mock.seedSubscription({
        id: '88888888-8888-4888-8888-888888888820',
        subscription_number: 'SUB-202606-ACT020',
        customer_id: customer1Id,
        plan_id: activePlan.id,
        status: 'active',
        expiry_date: '2026-08-31',
        is_paused: false,
      });
    });

    it('rejects pause, renew, and early close when plan flag is false (403)', async () => {
      // Staff tries early close on restrictedPlan -> 403
      const closeRes = await request(app)
        .post(`/api/v1/subscriptions/${subRestricted.id}/transition`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ action: 'close' });
      expect(closeRes.status).toBe(403);
      expect(closeRes.body.message).toMatch(/early close/i);

      // Customer tries pause on restrictedPlan -> 403
      const pauseRes = await request(app)
        .post(`/api/v1/portal/subscriptions/${subRestricted.id}/pause`)
        .set('Authorization', `Bearer ${customer1Token}`);
      expect(pauseRes.status).toBe(403);
      expect(pauseRes.body.message).toMatch(/pausing/i);

      // Customer tries renew on restrictedPlan -> 403
      const renewRes = await request(app)
        .post(`/api/v1/portal/subscriptions/${subRestricted.id}/renew`)
        .set('Authorization', `Bearer ${customer1Token}`);
      expect(renewRes.status).toBe(403);
      expect(renewRes.body.message).toMatch(/renewal/i);
    });

    it('allows customer pause, resume, renew on own subscription when plan permits', async () => {
      // 1. Pause via portal
      const pauseRes = await request(app)
        .post(`/api/v1/portal/subscriptions/${subActive.id}/pause`)
        .set('Authorization', `Bearer ${customer1Token}`);
      expect(pauseRes.status).toBe(200);
      expect(pauseRes.body.data.subscription.is_paused).toBe(true);

      // 2. Resume via transition
      const resumeRes = await request(app)
        .post(`/api/v1/subscriptions/${subActive.id}/transition`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ action: 'resume' });
      expect(resumeRes.status).toBe(200);
      expect(resumeRes.body.data.subscription.is_paused).toBe(false);

      // 3. Renew: monthly from Aug 31 clamped to Sep 30
      const renewRes = await request(app)
        .post(`/api/v1/portal/subscriptions/${subActive.id}/renew`)
        .set('Authorization', `Bearer ${customer1Token}`);
      expect(renewRes.status).toBe(200);
      expect(renewRes.body.data.subscription.expiry_date).toBe('2026-09-30');
    });

    it('simulates concurrent transition conflict returning 409 for loser', async () => {
      // Fire two close requests almost simultaneously on subActive
      const req1 = request(app)
        .post(`/api/v1/subscriptions/${subActive.id}/transition`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ action: 'close' });

      const req2 = request(app)
        .post(`/api/v1/subscriptions/${subActive.id}/transition`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ action: 'close' });

      const [res1, res2] = await Promise.all([req1, req2]);

      // Exactly one succeeds with 200, the other fails with 409 Conflict
      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 409]);
    });
  });

  // ---------------------------------------------------------------------------
  // STEP 7 Required Case 11: Auto-Close Manual Job
  // ---------------------------------------------------------------------------
  describe('Auto-Close Manual Admin Job', () => {
    it('closes only expired active subscriptions with auto_close=true', async () => {
      // Seed expired sub with auto_close=true
      const expiredAuto = mock.seedSubscription({
        id: '88888888-8888-4888-8888-888888888850',
        subscription_number: 'SUB-202601-EXP050',
        customer_id: customer1Id,
        plan_id: autoClosePlan.id,
        status: 'active',
        expiry_date: '2026-01-01', // Expired
      });

      // Seed expired sub with auto_close=false
      const expiredNoAuto = mock.seedSubscription({
        id: '88888888-8888-4888-8888-888888888851',
        subscription_number: 'SUB-202601-EXP051',
        customer_id: customer1Id,
        plan_id: restrictedPlan.id, // auto_close: false
        status: 'active',
        expiry_date: '2026-01-01', // Expired
      });

      const res = await request(app)
        .post('/api/v1/subscriptions/auto-close')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.closed_ids).toContain(expiredAuto.id);
      expect(res.body.data.closed_ids).not.toContain(expiredNoAuto.id);

      // Verify DB state
      expect(mock.subscriptionsTable.get(expiredAuto.id).status).toBe('closed');
      expect(mock.subscriptionsTable.get(expiredNoAuto.id).status).toBe('active');
    });

    it('rejects non-admin from running auto-close job (403)', async () => {
      const res = await request(app)
        .post('/api/v1/subscriptions/auto-close')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
    });
  });
});
