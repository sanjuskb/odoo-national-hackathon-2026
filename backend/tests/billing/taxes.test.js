/**
 * Unit Tests for Deterministic Tax Calculation.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

const { calculateTaxes, TaxCalculationError } = require('../../src/billing/taxes');

describe('Tax Calculation Precision', () => {
  test('Calculates single tax rule accurately', () => {
    // 10% tax on $49.00 (4900 cents) = 490 cents ($4.90)
    const { totalTaxCents, breakdown } = calculateTaxes(4900, [
      { name: 'Standard GST', rate_percentage: '10.00' },
    ]);

    assert.strictEqual(totalTaxCents, 490);
    assert.strictEqual(breakdown.length, 1);
    assert.strictEqual(breakdown[0].amount, '4.90');
    assert.strictEqual(breakdown[0].name, 'Standard GST');
  });

  test('Calculates combined tax rules accurately', () => {
    // 5% GST + 9.975% QST on $100.00 (10000 cents)
    const { totalTaxCents, breakdown } = calculateTaxes(10000, [
      { name: 'Federal GST', rate_percentage: 5.0 },
      { name: 'Provincial QST', rate_percentage: 9.975 },
    ]);

    // 5% of 100 = 500 cents ($5.00)
    // 9.975% of 100 = 997.5 -> 998 cents ($9.98)
    assert.strictEqual(totalTaxCents, 1498);
    assert.strictEqual(breakdown[0].amount, '5.00');
    assert.strictEqual(breakdown[1].amount, '9.98');
  });

  test('Handles zero taxable amount and empty rules', () => {
    assert.strictEqual(calculateTaxes(0, [{ name: 'Tax', rate: 10 }]).totalTaxCents, 0);
    assert.strictEqual(calculateTaxes(5000, []).totalTaxCents, 0);
  });

  test('Rejects negative taxable cents', () => {
    assert.throws(() => calculateTaxes(-100, []), TaxCalculationError);
  });
});

