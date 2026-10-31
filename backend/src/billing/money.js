/**
 * Deterministic Financial Decimal & Integer-Cents Arithmetic.
 * 
 * Invariant: Financial amounts are computed internally as integer minor units (cents)
 * to completely eliminate JavaScript IEEE-754 floating-point drift (e.g. 0.1 + 0.2 != 0.3).
 * Outputs are formatted as exact two-decimal-place strings (e.g. "49.00", "53.90").
 */

/**
 * Custom error class for financial arithmetic violations.
 */
class FinancialCalculationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'FinancialCalculationError';
    this.code = details.code || 'FINANCIAL_CALCULATION_ERROR';
    this.details = details;
  }
}

/**
 * Parse a decimal string or number into integer cents.
 * Handles inputs with up to 4 decimal places, rounding to nearest cent (half-up).
 * 
 * @param {string|number} value - e.g. "49.00", "19.99", 560
 * @returns {number} Integer cents (e.g. 4900, 1999, 56000)
 */
function toCents(value) {
  if (value === undefined || value === null || value === '') {
    throw new FinancialCalculationError('Value cannot be null or empty', { code: 'INVALID_MONEY_VALUE' });
  }

  const str = String(value).trim();
  // Validates positive or zero decimal strings (e.g., "0", "12", "12.3", "12.34", "12.3456")
  if (!/^\d+(\.\d+)?$/.test(str)) {
    throw new FinancialCalculationError(`Invalid money format: "${str}". Must be a non-negative decimal string.`, {
      code: 'INVALID_MONEY_FORMAT',
      value: str
    });
  }

  const parts = str.split('.');
  const whole = parseInt(parts[0], 10);
  const fractionStr = parts[1] || '';

  // Pad or truncate fraction to 4 digits for sub-cent precision evaluation
  const paddedFraction = (fractionStr + '0000').slice(0, 4);
  const subCents = parseInt(paddedFraction, 10); // e.g. .5000 -> 5000, .5050 -> 5050

  // Half-up rounding from 4-decimal precision into integer cents (100 sub-units per cent)
  const centsFromFraction = Math.floor((subCents + 50) / 100);

  const totalCents = (whole * 100) + centsFromFraction;
  if (!Number.isSafeInteger(totalCents)) {
    throw new FinancialCalculationError('Monetary amount exceeds safe integer precision', { code: 'INTEGER_OVERFLOW' });
  }

  return totalCents;
}

/**
 * Format integer cents into an exact two-decimal-place string.
 * 
 * @param {number} cents - Integer cents (e.g. 4900, 5)
 * @returns {string} e.g. "49.00", "0.05"
 */
function fromCents(cents) {
  if (typeof cents !== 'number' || !Number.isInteger(cents)) {
    throw new FinancialCalculationError(`Cents must be an integer, received: ${cents}`, { code: 'INVALID_CENTS' });
  }

  if (cents < 0) {
    throw new FinancialCalculationError(`Negative monetary amounts are not permitted: ${cents}`, { code: 'NEGATIVE_AMOUNT_REJECTED' });
  }

  const whole = Math.floor(cents / 100);
  const remainder = cents % 100;
  const remainderStr = remainder < 10 ? `0${remainder}` : `${remainder}`;
  return `${whole}.${remainderStr}`;
}

/**
 * Multiply an integer quantity by a unit price in cents.
 * 
 * @param {number} quantity - Must be an integer >= 1
 * @param {number} unitPriceCents - Non-negative integer cents
 * @returns {number} Integer cents
 */
function multiplyQuantity(quantity, unitPriceCents) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new FinancialCalculationError(`Quantity must be a positive integer >= 1, received: ${quantity}`, {
      code: 'INVALID_QUANTITY'
    });
  }
  if (!Number.isInteger(unitPriceCents) || unitPriceCents < 0) {
    throw new FinancialCalculationError(`Unit price cents must be non-negative integer, received: ${unitPriceCents}`, {
      code: 'INVALID_UNIT_PRICE'
    });
  }

  const result = quantity * unitPriceCents;
  if (!Number.isSafeInteger(result)) {
    throw new FinancialCalculationError('Multiplication result exceeds safe integer precision', { code: 'INTEGER_OVERFLOW' });
  }
  return result;
}

/**
 * Calculate percentage amount on a base cents figure with half-up rounding.
 * e.g. calculatePercentage(1000, 10.0) -> 100 (10% of $10.00 is $1.00)
 * 
 * @param {number} baseCents - Non-negative integer cents
 * @param {number|string} ratePercentage - e.g. 10.0, "18.5"
 * @returns {number} Calculated integer cents
 */
function calculatePercentage(baseCents, ratePercentage) {
  if (!Number.isInteger(baseCents) || baseCents < 0) {
    throw new FinancialCalculationError(`Base cents must be non-negative integer, received: ${baseCents}`, {
      code: 'INVALID_BASE_AMOUNT'
    });
  }

  const rate = typeof ratePercentage === 'string' ? parseFloat(ratePercentage) : ratePercentage;
  if (typeof rate !== 'number' || isNaN(rate) || rate < 0) {
    throw new FinancialCalculationError(`Percentage rate must be a non-negative number, received: ${ratePercentage}`, {
      code: 'INVALID_PERCENTAGE_RATE'
    });
  }

  if (rate === 0 || baseCents === 0) {
    return 0;
  }

  // Exact half-up rounding: (baseCents * rate) / 100
  // e.g. baseCents=4900, rate=10 -> 4900 * 10 / 100 = 490
  // e.g. baseCents=1999, rate=8.25 -> 1999 * 825 / 10000 = 164.9175 -> 165 cents
  const rateBps = Math.round(rate * 100); // 8.25% -> 825 bps
  const cents = Math.floor((baseCents * rateBps + 5000) / 10000);

  return cents;
}

module.exports = {
  FinancialCalculationError,
  toCents,
  fromCents,
  multiplyQuantity,
  calculatePercentage,
};

