/**
 * Unit Tests for Brightloop Deterministic Invoice Generation Engine.
 * 
 * Tests all 14 required cases using Node.js native test runner (node:test).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

const {
  generateInvoice,
  calculateBillingPeriod,
  toCents,
  fromCents,
  multiplyQuantity,
  calculatePercentage,
  isLeapYear,
  getDaysInMonth,
  FinancialCalculationError,
  BillingPeriodError,
  InvoiceValidationError,
} = require('../../src/billing');

// Standard reusable test fixtures
const baseSubscription = {
  id: 'sub-001',
  customer_id: 'cust-101',
  status: 'active',
  plan: {
    id: 'plan-pro',
    name: 'Professional Plan',
    frequency: 'monthly',
  },
  lines: [
    {
      product_id: 'prod-001',
      product_name: 'Professional Subscription Seat',
      quantity: 1,
      unit_price: '49.00',
    },
  ],
};

describe('1. Billing Periods (Daily, Weekly, Monthly, Yearly)', () => {
  test('Case 1: Daily billing period', () => {
    const inv = generateInvoice({
      subscription: baseSubscription,
      billingPeriodStart: '2026-03-01',
      billingFrequency: 'daily',
    });

    assert.strictEqual(inv.billing_frequency, 'daily');
    assert.strictEqual(inv.billing_period_start, '2026-03-01');
    assert.strictEqual(inv.billing_period_end, '2026-03-01');
    assert.strictEqual(inv.next_billing_date, '2026-03-02');
    assert.strictEqual(inv.idempotency_key, 'sub-001:2026-03-01');
  });

  test('Case 2: Weekly billing period', () => {
    const inv = generateInvoice({
      subscription: baseSubscription,
      billingPeriodStart: '2026-03-01',
      billingFrequency: 'weekly',
    });

    assert.strictEqual(inv.billing_frequency, 'weekly');
    assert.strictEqual(inv.billing_period_start, '2026-03-01');
    // 7 days duration: March 1 through March 7
    assert.strictEqual(inv.billing_period_end, '2026-03-07');
    assert.strictEqual(inv.next_billing_date, '2026-03-08');
  });

  test('Case 3: Monthly billing period', () => {
    const inv = generateInvoice({
      subscription: baseSubscription,
      billingPeriodStart: '2026-03-15',
      billingFrequency: 'monthly',
    });

    assert.strictEqual(inv.billing_frequency, 'monthly');
    assert.strictEqual(inv.billing_period_start, '2026-03-15');
    assert.strictEqual(inv.billing_period_end, '2026-04-14');
    assert.strictEqual(inv.next_billing_date, '2026-04-15');
  });

  test('Case 4: Yearly billing period', () => {
    const inv = generateInvoice({
      subscription: baseSubscription,
      billingPeriodStart: '2026-06-01',
      billingFrequency: 'yearly',
    });

    assert.strictEqual(inv.billing_frequency, 'yearly');
    assert.strictEqual(inv.billing_period_start, '2026-06-01');
    assert.strictEqual(inv.billing_period_end, '2027-05-31');
    assert.strictEqual(inv.next_billing_date, '2027-06-01');
  });
});

describe('2. Date Boundaries and Leap Years', () => {
  test('Case 5: Month-end date boundaries (Jan 31 -> Feb 28 in non-leap year)', () => {
    const p1 = calculateBillingPeriod({
      frequency: 'monthly',
      startDate: '2026-01-31',
      anchorDay: 31,
    });
    // Feb 2026 has 28 days
    assert.strictEqual(p1.billing_period_start, '2026-01-31');
    assert.strictEqual(p1.billing_period_end, '2026-02-27');
    assert.strictEqual(p1.next_billing_date, '2026-02-28');

    // Next cycle: Feb 28 -> restores to anchor day 31 in March
    const p2 = calculateBillingPeriod({
      frequency: 'monthly',
      startDate: '2026-02-28',
      anchorDay: 31,
    });
    assert.strictEqual(p2.billing_period_start, '2026-02-28');
    assert.strictEqual(p2.billing_period_end, '2026-03-30');
    assert.strictEqual(p2.next_billing_date, '2026-03-31');

    // August 31 (31 days) -> September 30 (30 days)
    const p3 = calculateBillingPeriod({
      frequency: 'monthly',
      startDate: '2026-08-31',
      anchorDay: 31,
    });
    assert.strictEqual(p3.billing_period_start, '2026-08-31');
    assert.strictEqual(p3.billing_period_end, '2026-09-29');
    assert.strictEqual(p3.next_billing_date, '2026-09-30');
  });

  test('Case 6: Leap-year handling (Feb 29 on leap years vs Feb 28 on non-leap)', () => {
    // 2024 is a leap year
    assert.strictEqual(isLeapYear(2024), true);
    assert.strictEqual(getDaysInMonth(2024, 2), 29);

    // 2026 is non-leap
    assert.strictEqual(isLeapYear(2026), false);
    assert.strictEqual(getDaysInMonth(2026, 2), 28);

    // 2028 is a leap year
    assert.strictEqual(isLeapYear(2028), true);
    assert.strictEqual(getDaysInMonth(2028, 2), 29);

    // 2100 is non-leap century year
    assert.strictEqual(isLeapYear(2100), false);
    assert.strictEqual(getDaysInMonth(2100, 2), 28);

    // Monthly billing on leap year Jan 31, 2024 -> Feb 29, 2024
    const pLeap = calculateBillingPeriod({
      frequency: 'monthly',
      startDate: '2024-01-31',
      anchorDay: 31,
    });
    assert.strictEqual(pLeap.next_billing_date, '2024-02-29');
    assert.strictEqual(pLeap.billing_period_end, '2024-02-28');

    // Yearly billing starting Feb 29, 2024 -> Feb 28, 2025
    const pYearLeap = calculateBillingPeriod({
      frequency: 'yearly',
      startDate: '2024-02-29',
      anchorDay: 29,
    });
    assert.strictEqual(pYearLeap.next_billing_date, '2025-02-28');
  });
});

describe('3. Calculations: Quantities, Discounts, Taxes, and Precision', () => {
  test('Case 7: Quantity multiplied by unit price', () => {
    const sub = {
      ...baseSubscription,
      lines: [
        { product_id: 'p1', product_name: 'Item A', quantity: 5, unit_price: '19.99' },
        { product_id: 'p2', product_name: 'Item B', quantity: 3, unit_price: '50.00' },
      ],
    };

    const inv = generateInvoice({ subscription: sub, billingPeriodStart: '2026-04-01' });

    // 5 * 19.99 = 99.95
    assert.strictEqual(inv.lines[0].subtotal, '99.95');
    // 3 * 50.00 = 150.00
    assert.strictEqual(inv.lines[1].subtotal, '150.00');
    // Total subtotal = 99.95 + 150.00 = 249.95
    assert.strictEqual(inv.subtotal, '249.95');
  });

  test('Case 8: Discount calculations (fixed, percentage, product-scoped, capped)', () => {
    // Percentage discount: 20% off whole subscription
    const inv1 = generateInvoice({
      subscription: baseSubscription, // $49.00
      billingPeriodStart: '2026-04-01',
      availableDiscounts: [
        { id: 'disc-20', type: 'percentage', value: '20.00', scope: 'subscription' },
      ],
    });
    // 20% of 49.00 = 9.80
    assert.strictEqual(inv1.total_discount, '9.80');
    assert.strictEqual(inv1.total_amount, '39.20'); // 49.00 - 9.80

    // Fixed discount: $15.00 off
    const inv2 = generateInvoice({
      subscription: baseSubscription,
      billingPeriodStart: '2026-04-01',
      availableDiscounts: [
        { id: 'disc-15', type: 'fixed', value: '15.00', scope: 'subscription' },
      ],
    });
    assert.strictEqual(inv2.total_discount, '15.00');
    assert.strictEqual(inv2.total_amount, '34.00'); // 49.00 - 15.00

    // Discount capped at subtotal (never yields negative total)
    const inv3 = generateInvoice({
      subscription: baseSubscription, // $49.00
      billingPeriodStart: '2026-04-01',
      availableDiscounts: [
        { id: 'disc-huge', type: 'fixed', value: '100.00', scope: 'subscription' },
      ],
    });
    assert.strictEqual(inv3.total_discount, '49.00'); // Capped at $49.00
    assert.strictEqual(inv3.total_amount, '0.00');

    // Product-scoped discount
    const subMulti = {
      ...baseSubscription,
      lines: [
        { product_id: 'prod-target', product_name: 'Target Item', quantity: 1, unit_price: '50.00' },
        { product_id: 'prod-other', product_name: 'Other Item', quantity: 1, unit_price: '50.00' },
      ],
    };
    const inv4 = generateInvoice({
      subscription: subMulti,
      billingPeriodStart: '2026-04-01',
      availableDiscounts: [
        { id: 'disc-prod', type: 'fixed', value: '20.00', scope: 'product', product_ids: ['prod-target'] },
      ],
    });
    assert.strictEqual(inv4.lines[0].discount_amount, '20.00');
    assert.strictEqual(inv4.lines[0].line_total, '30.00');
    assert.strictEqual(inv4.lines[1].discount_amount, '0.00');
    assert.strictEqual(inv4.lines[1].line_total, '50.00');
    assert.strictEqual(inv4.total_discount, '20.00');
    assert.strictEqual(inv4.total_amount, '80.00');

    // Expired discount should not apply
    const inv5 = generateInvoice({
      subscription: baseSubscription,
      billingPeriodStart: '2026-04-01',
      availableDiscounts: [
        { id: 'disc-exp', type: 'percentage', value: '50.00', end_date: '2026-03-31' },
      ],
    });
    assert.strictEqual(inv5.total_discount, '0.00');
    assert.strictEqual(inv5.total_amount, '49.00');
  });

  test('Case 9: Tax calculations (percentage rate, combined rules, tax-exclusive)', () => {
    // 10% Standard GST on $49.00
    const inv1 = generateInvoice({
      subscription: baseSubscription,
      billingPeriodStart: '2026-04-01',
      taxRules: [{ name: 'Standard GST', rate_percentage: '10.00' }],
    });
    // 10% of 49.00 = 4.90
    assert.strictEqual(inv1.subtotal, '49.00');
    assert.strictEqual(inv1.total_tax, '4.90');
    assert.strictEqual(inv1.total_amount, '53.90'); // 49.00 + 4.90

    // Multiple combined tax rules (5% Federal + 7% State on $100.00)
    const sub100 = {
      ...baseSubscription,
      lines: [{ product_id: 'p1', product_name: 'Plan', quantity: 1, unit_price: '100.00' }],
    };
    const inv2 = generateInvoice({
      subscription: sub100,
      billingPeriodStart: '2026-04-01',
      taxRules: [
        { name: 'Federal Tax', rate_percentage: '5.00' },
        { name: 'State Tax', rate_percentage: '7.00' },
      ],
    });
    assert.strictEqual(inv2.total_tax, '12.00'); // 5.00 + 7.00
    assert.strictEqual(inv2.total_amount, '112.00');
    assert.strictEqual(inv2.lines[0].taxes.length, 2);

    // Tax computed on discounted taxable amount
    const inv3 = generateInvoice({
      subscription: sub100, // $100
      billingPeriodStart: '2026-04-01',
      availableDiscounts: [{ type: 'fixed', value: '20.00', scope: 'subscription' }], // Net = $80
      taxRules: [{ name: 'GST', rate_percentage: '10.00' }],
    });
    // 10% of $80.00 = $8.00
    assert.strictEqual(inv3.total_discount, '20.00');
    assert.strictEqual(inv3.total_tax, '8.00');
    assert.strictEqual(inv3.total_amount, '88.00'); // 100 - 20 + 8
  });

  test('Case 10: Rounding precision and floating-point drift elimination', () => {
    // 0.1 + 0.2 in standard JS float is 0.30000000000000004
    // Our integer cents arithmetic must produce exact 0.30
    const c1 = toCents('0.10');
    const c2 = toCents('0.20');
    assert.strictEqual(fromCents(c1 + c2), '0.30');

    // Fractional cent tax: $19.99 with 8.25% tax
    // 19.99 * 8.25% = 1.649175 -> rounds half-up to $1.65
    const taxCents = calculatePercentage(toCents('19.99'), 8.25);
    assert.strictEqual(fromCents(taxCents), '1.65');

    // 3 items @ 33.33 = 99.99
    const lineCents = multiplyQuantity(3, toCents('33.33'));
    assert.strictEqual(fromCents(lineCents), '99.99');
  });
});

describe('4. Defensive Validation and Edge Cases', () => {
  test('Case 11: Invalid input rejection', () => {
    // Missing subscription
    assert.throws(() => generateInvoice({}), InvoiceValidationError);

    // Empty lines
    assert.throws(
      () => generateInvoice({ subscription: { ...baseSubscription, lines: [] } }),
      InvoiceValidationError
    );

    // Negative quantity
    assert.throws(
      () =>
        generateInvoice({
          subscription: {
            ...baseSubscription,
            lines: [{ product_id: 'p1', quantity: -1, unit_price: '10.00' }],
          },
        }),
      InvoiceValidationError
    );

    // Zero quantity
    assert.throws(
      () =>
        generateInvoice({
          subscription: {
            ...baseSubscription,
            lines: [{ product_id: 'p1', quantity: 0, unit_price: '10.00' }],
          },
        }),
      InvoiceValidationError
    );

    // Negative unit price
    assert.throws(
      () =>
        generateInvoice({
          subscription: {
            ...baseSubscription,
            lines: [{ product_id: 'p1', quantity: 1, unit_price: '-10.00' }],
          },
          billingPeriodStart: '2026-04-01',
        }),
      FinancialCalculationError
    );

    // Invalid frequency
    assert.throws(
      () =>
        generateInvoice({
          subscription: baseSubscription,
          billingFrequency: 'biweekly',
        }),
      InvoiceValidationError
    );

    // Malformed date
    assert.throws(
      () =>
        generateInvoice({
          subscription: baseSubscription,
          billingPeriodStart: '2026-02-31', // Feb 31 does not exist
        }),
      BillingPeriodError
    );

    // Closed subscription cannot be invoiced
    assert.throws(
      () =>
        generateInvoice({
          subscription: { ...baseSubscription, status: 'closed' },
          billingPeriodStart: '2026-04-01',
        }),
      InvoiceValidationError
    );
  });

  test('Case 12: Zero-value edge cases where permitted', () => {
    // 100% discount produces valid $0.00 total
    const invFree = generateInvoice({
      subscription: baseSubscription, // $49.00
      billingPeriodStart: '2026-04-01',
      availableDiscounts: [{ type: 'percentage', value: '100.00', scope: 'subscription' }],
    });
    assert.strictEqual(invFree.total_discount, '49.00');
    assert.strictEqual(invFree.total_amount, '0.00');
    assert.strictEqual(invFree.outstanding_balance, '0.00');

    // Zero tax rate produces 0.00 tax
    const invZeroTax = generateInvoice({
      subscription: baseSubscription,
      billingPeriodStart: '2026-04-01',
      taxRules: [{ name: 'Zero Tax', rate_percentage: '0.00' }],
    });
    assert.strictEqual(invZeroTax.total_tax, '0.00');
    assert.strictEqual(invZeroTax.total_amount, '49.00');

    // Unit price of $0.00 (free tier / complimentary item)
    const subFreeTier = {
      ...baseSubscription,
      lines: [{ product_id: 'p-free', product_name: 'Free Trial', quantity: 1, unit_price: '0.00' }],
    };
    const invComplimentary = generateInvoice({
      subscription: subFreeTier,
      billingPeriodStart: '2026-04-01',
    });
    assert.strictEqual(invComplimentary.subtotal, '0.00');
    assert.strictEqual(invComplimentary.total_amount, '0.00');
  });
});

describe('5. Idempotency and Multi-Period Orchestration', () => {
  test('Case 13: Repeated invoice-generation requests (idempotency key generation and duplicate detection)', () => {
    // First generation
    const inv1 = generateInvoice({
      subscription: baseSubscription,
      billingPeriodStart: '2026-11-01',
      billingFrequency: 'monthly',
    });

    assert.strictEqual(inv1.idempotency_key, 'sub-001:2026-11-01');
    assert.strictEqual(inv1.is_duplicate, false);

    // Repeated generation using existingInvoiceKeys registry
    const registeredKeys = new Set(['sub-001:2026-11-01']);
    const duplicateRun = generateInvoice({
      subscription: baseSubscription,
      billingPeriodStart: '2026-11-01',
      billingFrequency: 'monthly',
      existingInvoiceKeys: registeredKeys,
    });

    assert.strictEqual(duplicateRun.is_duplicate, true);
    assert.strictEqual(duplicateRun.status, 'duplicate_skipped');
    assert.strictEqual(duplicateRun.idempotency_key, 'sub-001:2026-11-01');
  });

  test('Case 14: Same subscription with different billing periods', () => {
    // Cycle 1: November 2026
    const invNov = generateInvoice({
      subscription: baseSubscription,
      billingPeriodStart: '2026-11-01',
      billingFrequency: 'monthly',
    });

    // Cycle 2: December 2026
    const invDec = generateInvoice({
      subscription: baseSubscription,
      billingPeriodStart: '2026-12-01',
      billingFrequency: 'monthly',
    });

    // Cycle 3: January 2027
    const invJan = generateInvoice({
      subscription: baseSubscription,
      billingPeriodStart: '2027-01-01',
      billingFrequency: 'monthly',
    });

    // Distinct idempotency keys
    assert.strictEqual(invNov.idempotency_key, 'sub-001:2026-11-01');
    assert.strictEqual(invDec.idempotency_key, 'sub-001:2026-12-01');
    assert.strictEqual(invJan.idempotency_key, 'sub-001:2027-01-01');

    // Seamless period continuity
    assert.strictEqual(invNov.next_billing_date, '2026-12-01');
    assert.strictEqual(invDec.next_billing_date, '2027-01-01');
    assert.strictEqual(invJan.next_billing_date, '2027-02-01');

    // All distinct, non-conflicting documents
    assert.strictEqual(invNov.is_duplicate, false);
    assert.strictEqual(invDec.is_duplicate, false);
    assert.strictEqual(invJan.is_duplicate, false);
  });
});
