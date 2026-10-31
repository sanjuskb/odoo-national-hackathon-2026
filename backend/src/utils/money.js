const AppError = require('./AppError');

/**
 * Validates and converts a money value (string or number with up to 2 decimal places)
 * into integer minor units (paise / cents).
 * NEVER performs floating point arithmetic.
 *
 * @param {string | number} value
 * @returns {number} integer minor units
 */
function parseMoney(value) {
  if (value === null || value === undefined || value === '') {
    throw new AppError('Money value is required', 400, 'INVALID_MONEY');
  }

  let str;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new AppError('Money value must be a finite number', 400, 'INVALID_MONEY');
    }
    if (value < 0) {
      throw new AppError('Money value cannot be negative', 400, 'INVALID_MONEY');
    }
    str = value.toString();
  } else if (typeof value === 'string') {
    str = value.trim();
    if (str.startsWith('-')) {
      throw new AppError('Money value cannot be negative', 400, 'INVALID_MONEY');
    }
  } else {
    throw new AppError('Money value must be a string or number', 400, 'INVALID_MONEY');
  }

  // Check for more than 2 decimal places
  if (/^\d+\.\d{3,}$/.test(str)) {
    throw new AppError('Money value cannot have more than 2 decimal places', 400, 'INVALID_MONEY');
  }

  // Must match integer or decimal with up to 2 digits
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    throw new AppError(`Invalid money format: "${str}". Must be a valid positive decimal`, 400, 'INVALID_MONEY');
  }

  const [intPart, decPart = ''] = str.split('.');
  const decPadded = decPart.padEnd(2, '0');
  const minor = parseInt(intPart, 10) * 100 + parseInt(decPadded, 10);

  if (!Number.isSafeInteger(minor)) {
    throw new AppError('Money value exceeds maximum safe representation', 400, 'INVALID_MONEY');
  }

  return minor;
}

/**
 * Round half-up to nearest integer minor unit
 *
 * @param {number} value
 * @returns {number}
 */
function roundMoney(value) {
  return Math.floor(value + 0.5);
}

/**
 * Formats an integer minor unit into a 2-decimal string (e.g. 156000 -> "1560.00").
 *
 * @param {number} minor integer minor units
 * @returns {string} formatted decimal string
 */
function formatMoney(minor) {
  if (typeof minor !== 'number' || !Number.isFinite(minor)) {
    throw new AppError('Minor unit must be a finite number', 400, 'INVALID_MONEY');
  }

  const rounded = roundMoney(minor);
  const sign = rounded < 0 ? '-' : '';
  const abs = Math.abs(rounded);
  const units = Math.floor(abs / 100);
  const cents = abs % 100;

  return `${sign}${units}.${cents.toString().padStart(2, '0')}`;
}

/**
 * Add two money values in minor units.
 *
 * @param {number | string} a
 * @param {number | string} b
 * @returns {number} integer minor units
 */
function addMoney(a, b) {
  const minorA = Number.isInteger(a) && a >= 0 ? a : parseMoney(a);
  const minorB = Number.isInteger(b) && b >= 0 ? b : parseMoney(b);
  return minorA + minorB;
}

/**
 * Multiply minor units by an integer or decimal quantity, rounding half-up.
 *
 * @param {number | string} minor
 * @param {number} quantity
 * @returns {number} integer minor units
 */
function multiplyMoney(minor, quantity) {
  const m = Number.isInteger(minor) && minor >= 0 ? minor : parseMoney(minor);
  const q = Number(quantity);

  if (!Number.isFinite(q) || q < 0) {
    throw new AppError('Quantity must be a non-negative number', 400, 'INVALID_QUANTITY');
  }

  return roundMoney(m * q);
}

module.exports = {
  parseMoney,
  roundMoney,
  formatMoney,
  addMoney,
  multiplyMoney,
};
