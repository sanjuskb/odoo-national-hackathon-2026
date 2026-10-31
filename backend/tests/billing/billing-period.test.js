/**
 * Unit Tests for Billing Period Orchestration & Calendar Logic.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

const {
  isLeapYear,
  getDaysInMonth,
  parseDateParts,
  calculateBillingPeriod,
  BillingPeriodError,
} = require('../../src/billing/billing-period');

describe('Calendar and Leap Year Utilities', () => {
  test('isLeapYear correctly determines leap years', () => {
    assert.strictEqual(isLeapYear(2024), true);
    assert.strictEqual(isLeapYear(2028), true);
    assert.strictEqual(isLeapYear(2000), true); // 400-year rule
    assert.strictEqual(isLeapYear(2025), false);
    assert.strictEqual(isLeapYear(2026), false);
    assert.strictEqual(isLeapYear(2100), false); // 100-year rule
  });

  test('getDaysInMonth returns correct days across leap and non-leap years', () => {
    assert.strictEqual(getDaysInMonth(2026, 1), 31);
    assert.strictEqual(getDaysInMonth(2026, 2), 28);
    assert.strictEqual(getDaysInMonth(2024, 2), 29); // Leap Feb
    assert.strictEqual(getDaysInMonth(2026, 4), 30);
    assert.strictEqual(getDaysInMonth(2026, 12), 31);
  });

  test('parseDateParts validates date structure', () => {
    const p = parseDateParts('2026-03-15');
    assert.strictEqual(p.year, 2026);
    assert.strictEqual(p.month, 3);
    assert.strictEqual(p.day, 15);
    assert.strictEqual(p.formatted, '2026-03-15');

    assert.throws(() => parseDateParts('not-a-date'), BillingPeriodError);
    assert.throws(() => parseDateParts('2026-13-01'), BillingPeriodError); // Invalid month 13
    assert.throws(() => parseDateParts('2026-02-29'), BillingPeriodError); // Feb 29 on non-leap year
  });
});

describe('Billing Period Boundaries & Anchor Preservation', () => {
  test('Daily billing period', () => {
    const p = calculateBillingPeriod({ frequency: 'daily', startDate: '2026-03-01' });
    assert.strictEqual(p.billing_period_start, '2026-03-01');
    assert.strictEqual(p.billing_period_end, '2026-03-01');
    assert.strictEqual(p.next_billing_date, '2026-03-02');
  });

  test('Weekly billing period', () => {
    const p = calculateBillingPeriod({ frequency: 'weekly', startDate: '2026-03-01' });
    assert.strictEqual(p.billing_period_start, '2026-03-01');
    assert.strictEqual(p.billing_period_end, '2026-03-07');
    assert.strictEqual(p.next_billing_date, '2026-03-08');
  });

  test('Monthly billing preserves anchor day on month-end clamping', () => {
    // January 31 -> February 28
    const jan = calculateBillingPeriod({ frequency: 'monthly', startDate: '2026-01-31', anchorDay: 31 });
    assert.strictEqual(jan.next_billing_date, '2026-02-28');

    // February 28 -> March 31 (anchor restored)
    const feb = calculateBillingPeriod({ frequency: 'monthly', startDate: '2026-02-28', anchorDay: 31 });
    assert.strictEqual(feb.next_billing_date, '2026-03-31');

    // March 31 -> April 30 (clamped)
    const mar = calculateBillingPeriod({ frequency: 'monthly', startDate: '2026-03-31', anchorDay: 31 });
    assert.strictEqual(mar.next_billing_date, '2026-04-30');

    // April 30 -> May 31 (anchor restored)
    const apr = calculateBillingPeriod({ frequency: 'monthly', startDate: '2026-04-30', anchorDay: 31 });
    assert.strictEqual(apr.next_billing_date, '2026-05-31');
  });

  test('Yearly billing handles leap day Feb 29 gracefully', () => {
    const p = calculateBillingPeriod({ frequency: 'yearly', startDate: '2024-02-29', anchorDay: 29 });
    assert.strictEqual(p.billing_period_start, '2024-02-29');
    assert.strictEqual(p.next_billing_date, '2025-02-28'); // Non-leap year clamp
  });

  test('Payment terms calculation', () => {
    const p = calculateBillingPeriod({
      frequency: 'monthly',
      startDate: '2026-04-01',
      issueDate: '2026-04-01',
      paymentTermsDays: 30, // Net-30
    });
    assert.strictEqual(p.issue_date, '2026-04-01');
    assert.strictEqual(p.due_date, '2026-05-01');
  });
});

