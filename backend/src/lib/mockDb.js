'use strict';

const { createSupabaseMock } = require('../../tests/mocks/supabase.mock');
const { setInjectedClients } = require('./supabase');

let mockInstance = null;

function initMockDb() {
  if (mockInstance) {
    return mockInstance;
  }

  const mock = createSupabaseMock();

  // 1. Seed Core Demonstration Accounts
  // Admin account
  mock.seedUser({
    id: 'user-admin-01',
    email: 'admin@brightloop.local',
    password: 'AdminPassword123!',
    full_name: 'Sanju Lead Architect (Admin)',
    role: 'admin',
  });

  // Staff account
  mock.seedUser({
    id: 'user-staff-01',
    email: 'staff@brightloop.local',
    password: 'StaffPassword123!',
    full_name: 'Amarnadh Support Specialist (Staff)',
    role: 'staff',
  });

  // Customer account
  mock.seedUser({
    id: 'user-customer-01',
    email: 'customer@brightloop.local',
    password: 'CustomerPassword123!',
    full_name: 'Acme Global Services (Customer)',
    role: 'customer',
  });

  // 2. Seed Products (conforms to Odoo Hackathon Problem Statement)
  const productCore = mock.seedProduct({
    id: 'prod-saas-core',
    name: 'Brightloop SaaS Base Platform',
    type: 'service',
    sales_price: 1000.0,
    cost_price: 250.0,
    notes: 'Base platform fee for subscription billing and ledger system',
  });

  const productCloud = mock.seedProduct({
    id: 'prod-odoo-erp',
    name: 'Enterprise Cloud Infrastructure',
    type: 'service',
    sales_price: 2500.0,
    cost_price: 800.0,
    notes: 'Multi-tenant cloud container cluster with automated backups',
  });

  const productSupport = mock.seedProduct({
    id: 'prod-support-tier',
    name: 'Priority 24/7 Support Escalation',
    type: 'service',
    sales_price: 500.0,
    cost_price: 100.0,
    notes: 'Guaranteed under-1-hour response SLA from senior engineers',
  });

  // 3. Seed Product Variants (+560 Odoo Variant requirement)
  const variantOdoo = mock.seedVariant({
    id: 'var-odoo-560',
    product_id: productCore.id,
    name: 'Odoo ERP Connector Addon',
    price_adjustment: 560.0,
  });

  mock.seedVariant({
    id: 'var-enterprise-ha',
    product_id: productCloud.id,
    name: 'High Availability Multi-AZ Replica',
    price_adjustment: 1200.0,
  });

  // 4. Seed Recurring Plans
  const planMonthly = mock.seedPlan({
    id: 'plan-monthly-core',
    product_id: productCore.id,
    price: 1560.0,
    frequency: 'monthly',
    min_quantity: 1,
    auto_close: false,
    allow_early_close: true,
    allow_pause: true,
    allow_renew: true,
  });

  mock.seedPlan({
    id: 'plan-annual-enterprise',
    product_id: productCore.id,
    price: 15000.0,
    frequency: 'yearly',
    min_quantity: 1,
    auto_close: false,
    allow_early_close: true,
    allow_pause: true,
    allow_renew: true,
  });

  mock.seedPlan({
    id: 'plan-weekly-starter',
    product_id: productCore.id,
    price: 400.0,
    frequency: 'weekly',
    min_quantity: 1,
    auto_close: false,
    allow_early_close: true,
    allow_pause: true,
    allow_renew: true,
  });

  // 5. Seed Tax Rules
  const taxGst = mock.seedTaxRule({
    id: 'tax-gst-18',
    name: 'GST 18% (Standard)',
    rate_percent: 18.0,
    rate: 18.0,
    description: 'Standard Goods & Services Tax',
    is_active: true,
  });

  mock.seedTaxRule({
    id: 'tax-vat-5',
    name: 'VAT 5% (Reduced)',
    rate_percent: 5.0,
    rate: 5.0,
    description: 'Reduced rate VAT',
    is_active: true,
  });

  // 6. Seed Discount Rules
  const discount10 = mock.seedDiscountRule({
    id: 'disc-welcome-10',
    name: 'Welcome Hackathon 10% Discount',
    kind: 'percentage',
    type: 'percentage',
    value: 10.0,
    scope: 'subscription',
    is_active: true,
  });

  // 7. Seed Quotation Templates
  mock.seedQuotationTemplate({
    id: 'tmpl-standard-core',
    name: 'Standard SaaS Subscription Blueprint',
    plan_id: planMonthly.id,
    validity_days: 30,
  });

  // 8. Seed Subscriptions
  const subActive = mock.seedSubscription({
    id: 'sub-demo-001',
    subscription_number: 'SUB-202610-000001',
    customer_id: 'user-customer-01',
    plan_id: planMonthly.id,
    start_date: '2026-10-01',
    expiry_date: '2027-10-01',
    payment_terms: 'immediate',
    status: 'active',
    next_billing_date: '2026-11-01',
    billing_anchor_date: '2026-10-01',
    is_paused: false,
  });

  mock.seedSubscriptionLine({
    id: 'subline-demo-001',
    subscription_id: subActive.id,
    product_id: productCore.id,
    variant_id: variantOdoo.id,
    quantity: 3,
    unit_price: '1000.00',
    variant_adjustment: '560.00',
    tax_id: taxGst.id,
    tax_rate_percent: '18.00',
    amount: '4680.00',
    description: 'Brightloop SaaS Base Platform + Odoo ERP Connector Addon',
  });

  // 9. Seed Invoices
  const invConfirmed = mock.seedInvoice({
    id: 'inv-demo-001',
    invoice_number: 'INV-2026-000001',
    subscription_id: subActive.id,
    customer_id: 'user-customer-01',
    billing_period_start: '2026-10-01',
    billing_period_end: '2026-10-31',
    currency: 'INR',
    subtotal: '4680.00',
    discount_total: '468.00',
    tax_total: '758.16',
    total: '4970.16',
    status: 'confirmed',
    due_date: '2026-11-15',
    created_at: '2026-10-01T10:00:00.000Z',
  });

  mock.seedInvoiceLine({
    id: 'invline-demo-001',
    invoice_id: invConfirmed.id,
    product_id: productCore.id,
    description: 'Brightloop SaaS Base Platform x 3 with Odoo ERP Connector',
    quantity: 3,
    unit_price: '1000.00',
    variant_adjustment: '560.00',
    tax_percent: '18.00',
    base_amount: '4680.00',
    discount_amount: '468.00',
    tax_amount: '758.16',
    line_total: '4970.16',
  });

  // 10. Seed Partial Payment
  mock.seedPayment({
    id: 'pmt-demo-001',
    payment_number: 'PAY-2026-000001',
    invoice_id: invConfirmed.id,
    amount: '2000.00',
    payment_method: 'bank_transfer',
    status: 'completed',
    payment_date: '2026-10-05T14:30:00.000Z',
  });

  // Register summary report RPC
  mock.registerRpc('get_finance_summary_report', async () => {
    return [
      {
        active_subscriptions_count: 1,
        paused_subscriptions_count: 0,
        total_invoiced_revenue: '4970.16',
        total_collected_revenue: '2000.00',
        total_outstanding_balance: '2970.16',
        total_overdue_balance: '0.00',
      },
    ];
  });

  // Inject into Supabase factory
  setInjectedClients({
    admin: mock.adminClient,
    publicClient: mock.publicClient,
  });

  mockInstance = mock;
  return mockInstance;
}

function getMockDb() {
  if (!mockInstance) {
    return initMockDb();
  }
  return mockInstance;
}

module.exports = {
  initMockDb,
  getMockDb,
};

