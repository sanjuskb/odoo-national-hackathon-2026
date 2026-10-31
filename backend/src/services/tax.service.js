'use strict';

const { parseMoney } = require('../utils/money');

/**
 * Pure integer-only rounding division (half-up).
 * (n + denominator / 2) / denominator
 */
function roundHalfUpDiv(n, denominator) {
  const bigN = BigInt(n);
  const bigD = BigInt(denominator);
  if (bigN < 0n || bigD <= 0n) {
    throw new RangeError('roundHalfUpDiv expects non-negative amount and positive denominator');
  }
  return (bigN + bigD / 2n) / bigD;
}

/**
 * Calculates line tax using integer arithmetic only.
 * Converts ratePercent to basis points (hundredths of a percent, e.g. 18.00% -> 1800 bps).
 * Formula: round half-up of (netMinor * rateBps) / 10000
 *
 * @param {number|bigint|string} netMinor Net amount in minor units (integer cents/paise)
 * @param {string|number} ratePercent Tax rate percentage (e.g. "18.00" or 18)
 * @returns {number} Tax in integer minor units
 */
function calculateLineTax(netMinor, ratePercent) {
  const net = BigInt(netMinor);
  if (net < 0n) {
    throw new RangeError('Net amount must be non-negative');
  }

  // Parse rate into basis points (hundredths of a percent, 1% = 100 bps, 18.00% = 1800 bps)
  const rateBps = BigInt(parseMoney(ratePercent));
  if (rateBps < 0n || rateBps > 10000n) {
    throw new RangeError('Tax rate must be between 0% and 100%');
  }

  if (rateBps === 0n || net === 0n) {
    return 0;
  }

  const tax = roundHalfUpDiv(net * rateBps, 10000n);
  return Number(tax);
}

module.exports = {
  calculateLineTax,
  roundHalfUpDiv,
};
