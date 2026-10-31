'use strict';

/**
 * Pure UTC Date Helpers for Brightloop Subscriptions
 */

/**
 * Normalises an input (Date, ISO string, or YYYY-MM-DD string) to a UTC date-only string 'YYYY-MM-DD'.
 * Throws TypeError or RangeError on invalid input.
 * @param {string|Date} value
 * @returns {string} YYYY-MM-DD
 */
function toDateOnly(value) {
  if (!value) {
    throw new TypeError('Date value is required');
  }

  let d;
  if (value instanceof Date) {
    d = value;
  } else if (typeof value === 'string') {
    // If already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      d = new Date(`${value}T00:00:00.000Z`);
    } else {
      d = new Date(value);
    }
  } else {
    throw new TypeError('Invalid date input: must be string or Date object');
  }

  if (Number.isNaN(d.getTime())) {
    throw new RangeError('Invalid date value');
  }

  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets the number of days in a given year and month (1-based month).
 * @param {number} year
 * @param {number} month 1-12
 * @returns {number}
 */
function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Adds n days to a date in UTC.
 * @param {string|Date} date
 * @param {number} n
 * @returns {string} YYYY-MM-DD
 */
function addDays(date, n) {
  if (!Number.isSafeInteger(n)) {
    throw new TypeError('Days to add must be a safe integer');
  }
  const dateStr = toDateOnly(date);
  const [year, month, day] = dateStr.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + n));
  return toDateOnly(utc);
}

/**
 * Adds a recurrence period to a date in UTC.
 * Frequencies: 'daily', 'weekly', 'monthly', 'yearly'.
 * Clamps month-end days when target month has fewer days (e.g., Jan 31 + 1 month -> Feb 28/29).
 * @param {string|Date} date
 * @param {string} frequency
 * @param {number} count Default 1
 * @returns {string} YYYY-MM-DD
 */
function addPeriod(date, frequency, count = 1) {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new TypeError('Period count must be a non-negative integer');
  }
  if (count === 0) {
    return toDateOnly(date);
  }

  const dateStr = toDateOnly(date);
  const [year, month, day] = dateStr.split('-').map(Number);

  switch (frequency) {
    case 'daily':
      return addDays(dateStr, count * 1);

    case 'weekly':
      return addDays(dateStr, count * 7);

    case 'monthly': {
      const totalMonths = (year * 12) + (month - 1) + count;
      const targetYear = Math.floor(totalMonths / 12);
      const targetMonth = (totalMonths % 12) + 1;
      const maxDays = daysInMonth(targetYear, targetMonth);
      const targetDay = Math.min(day, maxDays);

      const yStr = String(targetYear).padStart(4, '0');
      const mStr = String(targetMonth).padStart(2, '0');
      const dStr = String(targetDay).padStart(2, '0');
      return `${yStr}-${mStr}-${dStr}`;
    }

    case 'yearly': {
      const targetYear = year + count;
      const maxDays = daysInMonth(targetYear, month);
      const targetDay = Math.min(day, maxDays);

      const yStr = String(targetYear).padStart(4, '0');
      const mStr = String(month).padStart(2, '0');
      const dStr = String(targetDay).padStart(2, '0');
      return `${yStr}-${mStr}-${dStr}`;
    }

    default:
      throw new RangeError(`Unsupported frequency: ${frequency}`);
  }
}

module.exports = {
  toDateOnly,
  addDays,
  addPeriod,
  daysInMonth,
};
