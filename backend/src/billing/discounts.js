/**
 * Deterministic Discount Calculation & Eligibility Verification.
 * 
 * Supports:
 * - Fixed and percentage discounts.
 * - Product-scoped and whole-subscription-scoped discounts.
 * - Eligibility evaluation (date window, minimum amount, minimum quantity, usage caps).
 * - Strict financial safety: discounts are capped at the eligible base amount and never yield negative values.
 */

const { toCents, fromCents, calculatePercentage } = require('./money');

class DiscountRuleError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'DiscountRuleError';
    this.code = details.code || 'INVALID_DISCOUNT_RULE';
    this.details = details;
  }
}

/**
 * Check if a discount rule is eligible for a given billing event.
 * 
 * @param {Object} discount - Discount rule definition
 * @param {Object} context - Billing context { billingDate, subtotalCents, totalQuantity }
 * @returns {{ eligible: boolean, reason?: string }}
 */
function evaluateDiscountEligibility(discount, context) {
  if (!discount) {
    return { eligible: false, reason: 'NO_DISCOUNT_PROVIDED' };
  }

  const { billingDate, subtotalCents = 0, totalQuantity = 0 } = context;

  // 1. Date window check
  if (discount.start_date && billingDate) {
    if (billingDate < discount.start_date) {
      return { eligible: false, reason: 'DISCOUNT_NOT_YET_ACTIVE' };
    }
  }
  if (discount.end_date && billingDate) {
    if (billingDate > discount.end_date) {
      return { eligible: false, reason: 'DISCOUNT_EXPIRED' };
    }
  }

  // 2. Max usage count check
  if (typeof discount.max_uses === 'number' && typeof discount.used_count === 'number') {
    if (discount.used_count >= discount.max_uses) {
      return { eligible: false, reason: 'DISCOUNT_MAX_USES_REACHED' };
    }
  }

  // 3. Minimum amount check
  if (discount.min_amount) {
    const minAmountCents = toCents(discount.min_amount);
    if (subtotalCents < minAmountCents) {
      return { eligible: false, reason: 'SUBTOTAL_BELOW_MINIMUM_AMOUNT' };
    }
  }

  // 4. Minimum quantity check
  if (typeof discount.min_quantity === 'number') {
    if (totalQuantity < discount.min_quantity) {
      return { eligible: false, reason: 'QUANTITY_BELOW_MINIMUM' };
    }
  }

  return { eligible: true };
}

/**
 * Calculate the discount amount in cents for an eligible rule against a base amount.
 * 
 * @param {Object} discount - { type: 'fixed'|'percentage', value: string|number, scope: 'product'|'subscription' }
 * @param {number} baseAmountCents - Eligible line or subtotal amount in cents
 * @returns {number} Capped discount amount in cents (never exceeds baseAmountCents)
 */
function calculateDiscountAmount(discount, baseAmountCents) {
  if (!discount || baseAmountCents <= 0) {
    return 0;
  }

  const type = (discount.type || '').toLowerCase();
  if (type !== 'fixed' && type !== 'percentage') {
    throw new DiscountRuleError(`Unsupported discount type: "${discount.type}". Must be "fixed" or "percentage".`, {
      code: 'UNSUPPORTED_DISCOUNT_TYPE',
    });
  }

  let calculatedCents = 0;

  if (type === 'percentage') {
    const percentage = typeof discount.value === 'string' ? parseFloat(discount.value) : discount.value;
    if (typeof percentage !== 'number' || isNaN(percentage) || percentage < 0 || percentage > 100) {
      throw new DiscountRuleError(`Percentage discount must be between 0 and 100, received: ${discount.value}`, {
        code: 'INVALID_PERCENTAGE_VALUE',
      });
    }
    calculatedCents = calculatePercentage(baseAmountCents, percentage);
  } else if (type === 'fixed') {
    const fixedCents = toCents(discount.value);
    calculatedCents = fixedCents;
  }

  // Critical Financial Invariant: Discount can never exceed base amount (no negative money)
  return Math.min(calculatedCents, baseAmountCents);
}

module.exports = {
  DiscountRuleError,
  evaluateDiscountEligibility,
  calculateDiscountAmount,
};

