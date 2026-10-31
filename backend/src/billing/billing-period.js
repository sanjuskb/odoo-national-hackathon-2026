/**
 * Billing Period & Calendar Date Orchestration.
 * 
 * Invariants:
 * - Operates strictly on calendar dates (YYYY-MM-DD) in UTC to prevent timezone/DST skew.
 * - Supports daily, weekly, monthly, and yearly recurring frequencies.
 * - Preserves subscription billing anchor day on month-end clamping (e.g. Jan 31 -> Feb 28 -> Mar 31).
 * - Accurately accounts for leap years (e.g. Feb 29 in 2024/2028 vs Feb 28 in 2026).
 */

const VALID_FREQUENCIES = Object.freeze(['daily', 'weekly', 'monthly', 'yearly']);

class BillingPeriodError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'BillingPeriodError';
    this.code = details.code || 'INVALID_BILLING_PERIOD';
    this.details = details;
  }
}

/**
 * Determine if a given Gregorian year is a leap year.
 * 
 * @param {number} year - Gregorian year (e.g. 2024, 2026, 2000, 2100)
 * @returns {boolean}
 */
function isLeapYear(year) {
  if (!Number.isInteger(year)) {
    throw new BillingPeriodError(`Invalid year: ${year}`, { code: 'INVALID_YEAR' });
  }
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Get the exact number of days in a given month of a year.
 * 
 * @param {number} year 
 * @param {number} month - 1-based (1 = January, 12 = December)
 * @returns {number} Days in month (28, 29, 30, or 31)
 */
function getDaysInMonth(year, month) {
  if (month < 1 || month > 12) {
    throw new BillingPeriodError(`Invalid month: ${month}. Must be between 1 and 12.`, { code: 'INVALID_MONTH' });
  }
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if ([4, 6, 9, 11].includes(month)) {
    return 30;
  }
  return 31;
}

/**
 * Parse an ISO date or YYYY-MM-DD string into a validated { year, month, day } record.
 * 
 * @param {string} dateStr - e.g. "2026-01-31" or "2026-01-31T00:00:00.000Z"
 * @returns {{ year: number, month: number, day: number, formatted: string }}
 */
function parseDateParts(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    throw new BillingPeriodError(`Invalid date string: ${dateStr}`, { code: 'INVALID_DATE_FORMAT' });
  }

  // Extract YYYY-MM-DD prefix
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    throw new BillingPeriodError(`Date must match YYYY-MM-DD format, received: "${dateStr}"`, {
      code: 'INVALID_DATE_FORMAT',
      date: dateStr,
    });
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12) {
    throw new BillingPeriodError(`Month out of range (1-12) in date: "${dateStr}"`, { code: 'INVALID_MONTH' });
  }

  const maxDays = getDaysInMonth(year, month);
  if (day < 1 || day > maxDays) {
    throw new BillingPeriodError(
      `Day ${day} is invalid for month ${month} of year ${year} (max days: ${maxDays}) in date: "${dateStr}"`,
      { code: 'INVALID_DAY' }
    );
  }

  const mm = month < 10 ? `0${month}` : `${month}`;
  const dd = day < 10 ? `0${day}` : `${day}`;
  return { year, month, day, formatted: `${year}-${mm}-${dd}` };
}

/**
 * Format { year, month, day } to "YYYY-MM-DD".
 */
function formatDate(year, month, day) {
  const mm = month < 10 ? `0${month}` : `${month}`;
  const dd = day < 10 ? `0${day}` : `${day}`;
  return `${year}-${mm}-${dd}`;
}

/**
 * Add or subtract days from a calendar date.
 */
function addDays(year, month, day, daysToAdd) {
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + daysToAdd);
  return {
    year: utcDate.getUTCFullYear(),
    month: utcDate.getUTCMonth() + 1,
    day: utcDate.getUTCDate(),
    formatted: formatDate(utcDate.getUTCFullYear(), utcDate.getUTCMonth() + 1, utcDate.getUTCDate()),
  };
}

/**
 * Calculate the next billing date for a monthly cycle, preserving anchor day when clamped.
 * 
 * e.g.:
 * - start = 2026-01-31, anchor = 31 -> next = 2026-02-28 (clamped)
 * - start = 2026-02-28, anchor = 31 -> next = 2026-03-31 (restored to anchor)
 * - start = 2024-01-31, anchor = 31 -> next = 2024-02-29 (leap year clamped)
 */
function getNextMonthlyDate(year, month, anchorDay) {
  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  const maxDays = getDaysInMonth(nextYear, nextMonth);
  const nextDay = Math.min(anchorDay, maxDays);
  return { year: nextYear, month: nextMonth, day: nextDay, formatted: formatDate(nextYear, nextMonth, nextDay) };
}

/**
 * Calculate the next billing date for a yearly cycle, accounting for leap year Feb 29.
 */
function getNextYearlyDate(year, month, anchorDay) {
  const nextYear = year + 1;
  const maxDays = getDaysInMonth(nextYear, month);
  const nextDay = Math.min(anchorDay, maxDays);
  return { year: nextYear, month, day: nextDay, formatted: formatDate(nextYear, month, nextDay) };
}

/**
 * Compute the complete billing period and key dates for a recurring subscription.
 * 
 * @param {Object} options
 * @param {string} options.frequency - 'daily' | 'weekly' | 'monthly' | 'yearly'
 * @param {string} options.startDate - Billing period start date (YYYY-MM-DD or ISO)
 * @param {number} [options.anchorDay] - Original subscription anchor day (e.g. 31), defaults to startDate's day
 * @param {string} [options.issueDate] - Invoice issue date, defaults to startDate
 * @param {number} [options.paymentTermsDays=15] - Payment terms in days (e.g. 15 for Net-15, 0 for due on receipt)
 * @returns {Object} Calculated billing period descriptor
 */
function calculateBillingPeriod({
  frequency,
  startDate,
  anchorDay = null,
  issueDate = null,
  paymentTermsDays = 15,
}) {
  if (!frequency || !VALID_FREQUENCIES.includes(frequency.toLowerCase())) {
    throw new BillingPeriodError(
      `Invalid frequency: "${frequency}". Must be one of: ${VALID_FREQUENCIES.join(', ')}`,
      { code: 'INVALID_BILLING_FREQUENCY', validFrequencies: VALID_FREQUENCIES }
    );
  }

  const freq = frequency.toLowerCase();
  const startParts = parseDateParts(startDate);
  const anchor = (typeof anchorDay === 'number' && anchorDay >= 1 && anchorDay <= 31)
    ? anchorDay
    : startParts.day;

  let nextStartParts;

  switch (freq) {
    case 'daily':
      nextStartParts = addDays(startParts.year, startParts.month, startParts.day, 1);
      break;

    case 'weekly':
      nextStartParts = addDays(startParts.year, startParts.month, startParts.day, 7);
      break;

    case 'monthly':
      nextStartParts = getNextMonthlyDate(startParts.year, startParts.month, anchor);
      break;

    case 'yearly':
      nextStartParts = getNextYearlyDate(startParts.year, startParts.month, anchor);
      break;
  }

  // The billing period end (inclusive) is the calendar day immediately preceding the next period start
  const endParts = addDays(nextStartParts.year, nextStartParts.month, nextStartParts.day, -1);

  // Issue date defaults to start date unless specified
  const effectiveIssueParts = issueDate ? parseDateParts(issueDate) : startParts;

  // Due date = issue date + payment terms days
  const terms = Number.isInteger(paymentTermsDays) && paymentTermsDays >= 0 ? paymentTermsDays : 15;
  const dueParts = addDays(
    effectiveIssueParts.year,
    effectiveIssueParts.month,
    effectiveIssueParts.day,
    terms
  );

  return {
    frequency: freq,
    billing_period_start: startParts.formatted,
    billing_period_end: endParts.formatted,
    next_billing_date: nextStartParts.formatted,
    issue_date: effectiveIssueParts.formatted,
    due_date: dueParts.formatted,
    anchor_day: anchor,
    payment_terms_days: terms,
  };
}

module.exports = {
  VALID_FREQUENCIES,
  BillingPeriodError,
  isLeapYear,
  getDaysInMonth,
  parseDateParts,
  calculateBillingPeriod,
};

