/**
 * Unit Tests for Financial Precision & Money Utilities.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

const {
  toCents,
  fromCents,
  multiplyQuantity,
  calculatePercentage,
  FinancialCalculationError,
} = require('../../src/billing/money');

describe('Financial Arithmetic & Money Precision', () => {
  test('toCents converts decimal strings accurately', () => {
    assert.strictEqual(toCents('0'), 0);
    assert.strictEqual(toCents('0.00'), 0);
    assert.strictEqual(toCents('0.05'), 5);
    assert.strictEqual(toCents('19.99'), 1999);
    assert.strictEqual(toCents('49.00'), 4900);
    assert.strictEqual(toCents('560.00'), 56000);
    assert.strictEqual(toCents(560), 56000);
    assert.strictEqual(toCents('12.3456'), 1235); // Half-up rounding on 4-decimal precision
  });

  test('toCents rejects invalid formats and negatives', () => {
    assert.throws(() => toCents('-10.00'), FinancialCalculationError);
    assert.throws(() => toCents('abc'), FinancialCalculationError);
    assert.throws(() => toCents(''), FinancialCalculationError);
    assert.throws(() => toCents(null), FinancialCalculationError);
    assert.throws(() => toCents('10.20.30'), FinancialCalculationError);
  });

  test('fromCents formats integer cents to exact two-decimal string', () => {
    assert.strictEqual(fromCents(0), '0.00');
    assert.strictEqual(fromCents(5), '0.05');
    assert.strictEqual(fromCents(50), '0.50');
    assert.strictEqual(fromCents(1999), '19.99');
    assert.strictEqual(fromCents(4900), '49.00');
    assert.strictEqual(fromCents(123456), '1234.56');
  });

  test('fromCents rejects negative amounts and non-integers', () => {
    assert.throws(() => fromCents(-100), FinancialCalculationError);
    assert.throws(() => fromCents(12.34), FinancialCalculationError);
    assert.throws(() => fromCents('100'), FinancialCalculationError);
  });

  test('multiplyQuantity multiplies positive integer quantity by price cents', () => {
    assert.strictEqual(multiplyQuantity(1, 4900), 4900);
    assert.strictEqual(multiplyQuantity(3, 1999), 5997);
    assert.strictEqual(multiplyQuantity(100, 50), 5000);

    // Rejection of invalid quantities
    assert.throws(() => multiplyQuantity(0, 4900), FinancialCalculationError);
    assert.throws(() => multiplyQuantity(-1, 4900), FinancialCalculationError);
    assert.throws(() => multiplyQuantity(1.5, 4900), FinancialCalculationError);
  });

  test('calculatePercentage handles exact half-up rounding', () => {
    // 10% on $100.00 (10000 cents) = $10.00 (1000 cents)
    assert.strictEqual(calculatePercentage(10000, 10.0), 1000);
    // 10% on $49.00 (4900 cents) = $4.90 (490 cents)
    assert.strictEqual(calculatePercentage(4900, 10.0), 490);
    // 8.25% on $19.99 (1999 cents) = 164.9175 -> 165 cents ($1.65)
    assert.strictEqual(calculatePercentage(1999, 8.25), 165);
    // 0% yields 0
    assert.strictEqual(calculatePercentage(4900, 0), 0);
    // 100% yields exact base
    assert.strictEqual(calculatePercentage(4900, 100), 4900);
  });
});

