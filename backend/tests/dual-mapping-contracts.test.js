import { describe, it, expect } from 'vitest';
import { mapInvoiceFromDb } from '../src/repositories/invoices.repository.js';
import { mapInvoiceLineFromDb } from '../src/repositories/invoiceLines.repository.js';
import { mapPaymentFromDb } from '../src/repositories/payments.repository.js';
import { mapSubscriptionFromDb } from '../src/repositories/subscriptions.repository.js';

describe('Harsha Core Database Schema Contract & Dual-Mapping', () => {
  it('maps invoice with Harsha billing_period_end_exclusive and currency', () => {
    const dbRow = {
      id: 'inv-harsha-001',
      subscription_id: 'sub-001',
      customer_id: 'cust-001',
      billing_period_start: '2026-11-01',
      billing_period_end_exclusive: '2026-12-01',
      currency: 'INR',
      invoice_number: 'INV-202611-000001',
      subtotal: '1000.00',
      discount_total: '100.00',
      tax_total: '162.00',
      total: '1062.00',
      status: 'confirmed',
      due_date: '2026-11-15',
    };

    const mapped = mapInvoiceFromDb(dbRow);

    expect(mapped.billing_period_end_exclusive).toBe('2026-12-01');
    expect(mapped.billing_period_end).toBe('2026-12-01');
    expect(mapped.currency).toBe('INR');
    expect(mapped.total).toBe('1062.00');
  });

  it('maps invoice lines with Harsha tax_percent column', () => {
    const lineRow = {
      id: 'line-harsha-001',
      invoice_id: 'inv-001',
      product_id: 'prod-001',
      description: 'Pro Plan Monthly',
      quantity: 1,
      unit_price: '1000.00',
      variant_adjustment: '0.00',
      tax_percent: '18.00',
      base_amount: '1000.00',
      discount_amount: '0.00',
      tax_amount: '180.00',
      line_total: '1180.00',
    };

    const mapped = mapInvoiceLineFromDb(lineRow);

    expect(mapped.tax_percent).toBe('18.00');
    expect(mapped.tax_rate_percent).toBe('18.00');
    expect(mapped.line_total).toBe('1180.00');
  });

  it('maps payment with Harsha paid_at and external_reference columns', () => {
    const paymentRow = {
      id: 'pmt-harsha-001',
      invoice_id: 'inv-001',
      amount: '500.00',
      method: 'bank_transfer',
      paid_at: '2026-11-05T10:30:00.000Z',
      external_reference: 'TXN-RAZORPAY-9988',
      note: 'Payment received via net banking',
      created_at: '2026-11-05T10:30:00.000Z',
    };

    const mapped = mapPaymentFromDb(paymentRow);

    expect(mapped.paid_at).toBe('2026-11-05T10:30:00.000Z');
    expect(mapped.payment_date).toBe('2026-11-05T10:30:00.000Z');
    expect(mapped.external_reference).toBe('TXN-RAZORPAY-9988');
    expect(mapped.reference).toBe('TXN-RAZORPAY-9988');
    expect(mapped.amount).toBe('500.00');
  });

  it('maps subscription with Harsha status=paused seamlessly', () => {
    const subRow = {
      id: 'sub-harsha-001',
      subscription_number: 'SUB-202611-000001',
      customer_id: 'cust-001',
      plan_id: 'plan-001',
      start_date: '2026-11-01',
      expiry_date: '2027-11-01',
      payment_terms: 'net30',
      status: 'paused',
      next_billing_date: '2026-12-01',
      billing_anchor_date: '2026-11-01',
    };

    const mapped = mapSubscriptionFromDb(subRow, []);

    expect(mapped.status).toBe('paused');
    expect(mapped.is_paused).toBe(true);
  });
});
