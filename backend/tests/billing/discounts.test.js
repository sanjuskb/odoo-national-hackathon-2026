/**
 * Unit Tests for Discount Rules & Eligibility.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

const {
  evaluateDiscountEligibility,
  calculateDiscountAmount,
  DiscountRuleError,
} = require('../../src/billing/discounts');

describe('Discount Eligibility Evaluation', () => {
  test('Eligible when within date window, min quantity, and min amount', () => {
    const rule = {
      id: 'd1',
      type: 'percentage',
      value: 10,
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      min_amount: '30.00',
      min_quantity: 2,
      max_uses: 10,
      used_count: 5,
    };

    const ctx = {
      billingDate: '2026-06-01',
      subtotalCents: 5000, // $50.00
      totalQuantity: 3,
    };

    const res = evaluateDiscountEligibility(rule, ctx);
    assert.strictEqual(res.eligible, true);
  });

  test('Ineligible when expired or not yet active', () => {
    const futureRule = { id: 'd2', start_date: '2026-07-01' };
    const expiredRule = { id: 'd3', end_date: '2026-03-31' };

    assert.strictEqual(evaluateDiscountEligibility(futureRule, { billingDate: '2026-05-01' }).eligible, false);
    assert.strictEqual(evaluateDiscountEligibility(expiredRule, { billingDate: '2026-05-01' }).eligible, false);
  });

  test('Ineligible when usage cap is reached', () => {
    const cappedRule = { id: 'd4', max_uses: 5, used_count: 5 };
    assert.strictEqual(evaluateDiscountEligibility(cappedRule, { billingDate: '2026-05-01' }).eligible, false);
  });

  test('Ineligible when minimum amount or quantity is not met', () => {
    const minRule = { id: 'd5', min_amount: '100.00', min_quantity: 5 };
    assert.strictEqual(evaluateDiscountEligibility(minRule, { subtotalCents: 5000, totalQuantity: 6 }).eligible, false);
    assert.strictEqual(evaluateDiscountEligibility(minRule, { subtotalCents: 15000, totalQuantity: 3 }).eligible, false);
  });
});

describe('Discount Amount Calculation & Caps', () => {
  test('Fixed discount calculates exact cents and caps at base amount', () => {
    const fixedRule = { type: 'fixed', value: '25.00' };

    // $25 discount on $100 base -> 2500 cents
    assert.strictEqual(calculateDiscountAmount(fixedRule, 10000), 2500);

    // $25 discount on $10 base -> capped at 1000 cents ($10.00, never negative)
    assert.strictEqual(calculateDiscountAmount(fixedRule, 1000), 1000);
  });

  test('Percentage discount calculates exact half-up cents', () => {
    const pctRule = { type: 'percentage', value: '15.00' };

    // 15% of $50.00 (5000 cents) = 750 cents ($7.50)
    assert.strictEqual(calculateDiscountAmount(pctRule, 5000), 750);
  });

  test('Rejects invalid discount types and percentages > 100%', () => {
    assert.throws(() => calculateDiscountAmount({ type: 'unknown', value: 10 }, 5000), DiscountRuleError);
    assert.throws(() => calculateDiscountAmount({ type: 'percentage', value: 150 }, 5000), DiscountRuleError);
    assert.throws(() => calculateDiscountAmount({ type: 'percentage', value: -10 }, 5000), DiscountRuleError);
  });
});

