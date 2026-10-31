/**
 * Deterministic Tax Calculation Service.
 * 
 * Invariants:
 * - Operates in tax-exclusive mode (tax is computed on the post-discount taxable base).
 * - Precision: each tax component rounds half-up to integer cents.
 * - Supports single or combined tax rules (e.g. GST, VAT, State/Federal).
 */

const { calculatePercentage, toCents, fromCents } = require('./money');

class TaxCalculationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'TaxCalculationError';
    this.code = details.code || 'INVALID_TAX_RULE';
    this.details = details;
  }
}

/**
 * Calculate tax for a taxable amount given a set of tax rules.
 * 
 * @param {number} taxableCents - Non-negative integer cents
 * @param {Array<Object>} taxRules - Array of { name, rate_percentage }
 * @returns {{ totalTaxCents: number, breakdown: Array<{ name: string, rate_percentage: string, amount: string }> }}
 */
function calculateTaxes(taxableCents, taxRules = []) {
  if (!Number.isInteger(taxableCents) || taxableCents < 0) {
    throw new TaxCalculationError(`Taxable cents must be a non-negative integer, received: ${taxableCents}`, {
      code: 'INVALID_TAXABLE_AMOUNT',
    });
  }

  if (taxableCents === 0 || !Array.isArray(taxRules) || taxRules.length === 0) {
    return { totalTaxCents: 0, breakdown: [] };
  }

  let totalTaxCents = 0;
  const breakdown = [];

  for (const rule of taxRules) {
    if (!rule || !rule.name) {
      continue;
    }
    const rate = rule.rate_percentage !== undefined ? rule.rate_percentage : rule.rate;
    const taxCents = calculatePercentage(taxableCents, rate);
    totalTaxCents += taxCents;

    breakdown.push({
      name: String(rule.name),
      rate_percentage: String(rate),
      amount: fromCents(taxCents),
    });
  }

  return { totalTaxCents, breakdown };
}

module.exports = {
  TaxCalculationError,
  calculateTaxes,
};

