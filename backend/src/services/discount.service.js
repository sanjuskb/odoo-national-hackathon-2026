'use strict';

const { parseMoney } = require('../utils/money');
const { toDateOnly } = require('../utils/dates');
const { roundHalfUpDiv } = require('./tax.service');

/**
 * Checks if a discount rule is eligible for given context and date.
 *
 * @param {object} discount Discount rule entity
 * @param {object} context { lines: Array<{ product_id, quantity, amount | netMinor, ... }> }
 * @param {string|Date} date Evaluation date (YYYY-MM-DD or Date object)
 * @returns {boolean}
 */
function isDiscountEligible(discount, context = {}, date = new Date()) {
  if (!discount) return false;

  // Active check
  if (discount.is_active === false) return false;

  // Date range check (inclusive)
  const evalDate = toDateOnly(date);
  const startDate = discount.start_date || discount.valid_from;
  if (startDate && toDateOnly(startDate) > evalDate) return false;

  const endDate = discount.end_date || discount.valid_until;
  if (endDate && toDateOnly(endDate) < evalDate) return false;

  // Usage cap check
  const maxUses = discount.max_uses;
  const usedCount = discount.used_count || 0;
  if (maxUses !== null && maxUses !== undefined) {
    if (usedCount >= maxUses) return false;
  }

  // Scope matching & line aggregation
  const lines = context.lines || [];
  if (!lines.length) return false;

  const scope = discount.scope || 'subscription';
  const productIds = discount.product_ids || [];

  if (scope === 'product' && (!productIds || !productIds.length)) {
    return false;
  }

  const matchingLines = lines.filter((l) => {
    if (scope === 'subscription') return true;
    const prodId = l.product_id || l.productId;
    return productIds.includes(prodId);
  });

  if (!matchingLines.length) return false;

  // Calculate matching base amount and quantity
  let matchingBaseMinor = 0;
  let matchingQty = 0;

  for (const line of matchingLines) {
    const qty = parseInt(line.quantity, 10) || 0;
    matchingQty += qty;

    let lineNetMinor = 0;
    if (line.netMinor !== undefined) {
      lineNetMinor = Number(line.netMinor);
    } else if (line.amount !== undefined) {
      lineNetMinor = parseMoney(line.amount);
    } else if (line.baseAmount !== undefined) {
      lineNetMinor = parseMoney(line.baseAmount);
    } else if (line.unit_price !== undefined) {
      const unit = parseMoney(line.unit_price);
      const adj = parseMoney(line.variant_adjustment || '0.00');
      lineNetMinor = (unit + adj) * qty;
    }
    matchingBaseMinor += lineNetMinor;
  }

  if (matchingBaseMinor <= 0) return false;

  // Minimum amount check
  if (discount.min_amount !== null && discount.min_amount !== undefined) {
    const minAmountMinor = parseMoney(discount.min_amount);
    if (matchingBaseMinor < minAmountMinor) return false;
  }

  // Minimum quantity check
  if (discount.min_quantity !== null && discount.min_quantity !== undefined) {
    if (matchingQty < parseInt(discount.min_quantity, 10)) return false;
  }

  return true;
}

/**
 * Computes discount reduction in minor units for a given base amount.
 * Never exceeds baseMinor.
 *
 * @param {object} discount
 * @param {number|bigint} baseMinor
 * @returns {number}
 */
function computeDiscountAmount(discount, baseMinor) {
  const base = BigInt(baseMinor);
  if (base <= 0n) return 0;

  const kind = discount.kind || discount.type || 'percentage';
  let desired = 0n;

  if (kind === 'percentage') {
    const bps = BigInt(parseMoney(discount.value));
    desired = roundHalfUpDiv(base * bps, 10000n);
  } else if (kind === 'fixed') {
    desired = BigInt(parseMoney(discount.value));
  } else {
    throw new TypeError(`Unknown discount kind '${kind}'`);
  }

  const capped = desired < base ? desired : base;
  return Number(capped);
}

/**
 * Selects the single best discount offering the largest monetary saving.
 * NO stacking. Ties broken deterministically by lowest discount ID.
 *
 * @param {Array<object>} discounts
 * @param {Array<object>} lines
 * @param {string|Date} date
 * @returns {object|null} The winning discount or null if none produces savings
 */
function selectBestDiscount(discounts = [], lines = [], date = new Date()) {
  if (!discounts.length || !lines.length) return null;

  const context = { lines };
  const eligible = discounts.filter((d) => isDiscountEligible(d, context, date));
  if (!eligible.length) return null;

  const evaluated = [];

  for (const disc of eligible) {
    const scope = disc.scope || 'subscription';
    const productIds = disc.product_ids || [];

    // Calculate base for this discount
    let baseMinor = 0;
    for (const line of lines) {
      const prodId = line.product_id || line.productId;
      if (scope === 'subscription' || productIds.includes(prodId)) {
        let lineNet = 0;
        if (line.netMinor !== undefined) {
          lineNet = Number(line.netMinor);
        } else if (line.amount !== undefined) {
          lineNet = parseMoney(line.amount);
        } else if (line.unit_price !== undefined) {
          const unit = parseMoney(line.unit_price);
          const adj = parseMoney(line.variant_adjustment || '0.00');
          lineNet = (unit + adj) * (parseInt(line.quantity, 10) || 1);
        }
        baseMinor += lineNet;
      }
    }

    const saving = computeDiscountAmount(disc, baseMinor);
    if (saving > 0) {
      evaluated.push({
        discount: disc,
        saving,
        id: String(disc.id || ''),
      });
    }
  }

  if (!evaluated.length) return null;

  // Sort by saving descending; tie-break: id ascending
  evaluated.sort((a, b) => {
    if (a.saving !== b.saving) {
      return b.saving - a.saving;
    }
    return a.id.localeCompare(b.id);
  });

  return evaluated[0].discount;
}

/**
 * Spreads discount across eligible lines proportionally with integer arithmetic.
 * Any remainder cents are given to the largest line deterministically,
 * ensuring sum of allocations exactly equals discountMinor.
 *
 * @param {Array<number>} lineNetsMinor Net amounts of lines in minor units
 * @param {number} discountMinor Total discount to allocate in minor units
 * @returns {Array<number>} Array of allocated discount minor units per line
 */
function allocateDiscountToLines(lineNetsMinor = [], discountMinor = 0) {
  if (!lineNetsMinor.length) return [];
  if (discountMinor <= 0) return lineNetsMinor.map(() => 0);

  const totalBase = lineNetsMinor.reduce((sum, n) => sum + Math.max(0, n), 0);
  if (totalBase <= 0) return lineNetsMinor.map(() => 0);

  const cappedDiscount = Math.min(discountMinor, totalBase);
  const allocations = new Array(lineNetsMinor.length).fill(0);

  let allocatedSum = 0;
  for (let i = 0; i < lineNetsMinor.length; i++) {
    const net = Math.max(0, lineNetsMinor[i]);
    const share = Math.floor((cappedDiscount * net) / totalBase);
    allocations[i] = share;
    allocatedSum += share;
  }

  let remainder = cappedDiscount - allocatedSum;

  if (remainder > 0) {
    // Sort indices by line net descending, tie-break by index ascending
    const indices = lineNetsMinor.map((net, idx) => ({ net, idx }));
    indices.sort((a, b) => {
      if (b.net !== a.net) return b.net - a.net;
      return a.idx - b.idx;
    });

    let r = 0;
    while (remainder > 0) {
      allocations[indices[r % indices.length].idx] += 1;
      remainder--;
      r++;
    }
  }

  return allocations;
}

module.exports = {
  isDiscountEligible,
  computeDiscountAmount,
  selectBestDiscount,
  allocateDiscountToLines,
};
