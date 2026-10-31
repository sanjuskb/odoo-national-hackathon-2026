const AppError = require('../utils/AppError');

/**
 * Checks whether a plan is currently available for subscription on a given date.
 * Pure function: compares available_from and available_until boundaries.
 *
 * @param {object} plan
 * @param {Date | string | number} [targetDate=new Date()]
 * @returns {boolean}
 */
function isPlanAvailable(plan, targetDate = new Date()) {
  if (!plan) return false;

  const date = targetDate instanceof Date ? targetDate : new Date(targetDate);
  if (Number.isNaN(date.getTime())) {
    throw new AppError('Invalid comparison date', 400, 'INVALID_DATE');
  }

  if (plan.available_from) {
    const fromDate = new Date(plan.available_from);
    if (!Number.isNaN(fromDate.getTime()) && date < fromDate) {
      return false;
    }
  }

  if (plan.available_until) {
    const untilDate = new Date(plan.available_until);
    if (!Number.isNaN(untilDate.getTime()) && date > untilDate) {
      return false;
    }
  }

  return true;
}

/**
 * Validates that an ordered quantity meets plan requirements.
 * Pure function: throws AppError(400) if quantity is invalid.
 *
 * @param {object} plan
 * @param {number} quantity
 * @returns {boolean}
 */
function validateQuantityForPlan(plan, quantity) {
  if (!plan) throw new AppError('Plan is required for quantity validation', 400, 'INVALID_PLAN');

  const q = Number(quantity);
  if (!Number.isInteger(q) || q <= 0) {
    throw new AppError('Quantity must be a positive integer', 400, 'INVALID_QUANTITY');
  }

  const minQ = plan.min_quantity ?? 1;
  if (q < minQ) {
    throw new AppError(`Quantity (${q}) cannot be less than plan minimum quantity (${minQ})`, 400, 'MINIMUM_QUANTITY_NOT_MET');
  }

  return true;
}

/**
 * Evaluates whether an administrative or customer lifecycle action
 * is permitted by the plan's policy flags.
 *
 * @param {object} plan
 * @param {'close_early' | 'pause' | 'renew'} action
 * @returns {boolean}
 */
function canPerform(plan, action) {
  if (!plan) return false;

  switch (action) {
    case 'close_early':
      return Boolean(plan.allow_early_close);
    case 'pause':
      return Boolean(plan.allow_pause);
    case 'renew':
      return Boolean(plan.allow_renew);
    default:
      return false;
  }
}

/**
 * Checks whether an expiring plan should automatically close at its end date.
 *
 * @param {object} plan
 * @param {Date | string | number} [today=new Date()]
 * @returns {boolean}
 */
function shouldAutoClose(plan, today = new Date()) {
  if (!plan || !plan.auto_close) {
    return false;
  }

  if (!plan.available_until) {
    return false;
  }

  const now = today instanceof Date ? today : new Date(today);
  const until = new Date(plan.available_until);

  return now >= until;
}

module.exports = {
  isPlanAvailable,
  validateQuantityForPlan,
  canPerform,
  shouldAutoClose,
};
