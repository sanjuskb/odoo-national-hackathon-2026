'use strict';

const { parseMoney, formatMoney } = require('../utils/money');
const { calculateLineTax } = require('./tax.service');
const {
  isDiscountEligible,
  computeDiscountAmount,
  selectBestDiscount,
  allocateDiscountToLines,
} = require('./discount.service');

/**
 * Calculates a complete deterministic invoice preview.
 *
 * @param {object} params
 * @param {Array<object>} params.lines Array of subscription lines
 * @param {Array<object>} params.discounts Array of active discount rules
 * @param {string|Date} params.date Evaluation date
 * @returns {object} Calculated invoice preview with line breakdown and totals
 */
function calculateInvoicePreview({ lines = [], discounts = [], date = new Date() }) {
  if (!lines.length) {
    return {
      lines: [],
      subtotal: '0.00',
      discount_total: '0.00',
      tax_total: '0.00',
      total: '0.00',
      selected_discount_id: null,
    };
  }

  // 1. Calculate line net amounts
  const preparedLines = lines.map((l, index) => {
    const qty = parseInt(l.quantity, 10);
    const unitMinor = parseMoney(l.unit_price !== undefined ? l.unit_price : (l.unitPrice || '0.00'));
    const adjMinor = parseMoney(l.variant_adjustment !== undefined ? l.variant_adjustment : (l.variantAdjustment || '0.00'));
    const effectivePriceMinor = unitMinor + adjMinor;
    const netMinor = effectivePriceMinor * qty;

    const taxRate = l.tax_rate_percent !== undefined ? l.tax_rate_percent : (l.taxPercent || '0.00');

    return {
      index,
      product_id: l.product_id || l.productId,
      description: l.description || l.title || '',
      quantity: qty,
      unitPriceMinor: unitMinor,
      adjustmentMinor: adjMinor,
      effectivePriceMinor,
      netMinor,
      tax_rate_percent: formatMoney(parseMoney(taxRate)),
      discountMinor: 0,
    };
  });

  const subtotalMinor = preparedLines.reduce((sum, l) => sum + l.netMinor, 0);

  // 2. Select best eligible discount (no stacking)
  const bestDiscount = selectBestDiscount(discounts, preparedLines, date);

  if (bestDiscount) {
    const scope = bestDiscount.scope || 'subscription';
    const productIds = bestDiscount.product_ids || [];

    const eligibleLines = preparedLines.filter((l) => {
      if (scope === 'subscription') return true;
      return productIds.includes(l.product_id);
    });

    const matchingBaseMinor = eligibleLines.reduce((sum, l) => sum + l.netMinor, 0);
    const totalDiscountMinor = computeDiscountAmount(bestDiscount, matchingBaseMinor);

    const allocations = allocateDiscountToLines(
      eligibleLines.map((l) => l.netMinor),
      totalDiscountMinor
    );

    for (let i = 0; i < eligibleLines.length; i++) {
      eligibleLines[i].discountMinor = allocations[i];
    }
  }

  // 3. Calculate line taxes on discounted net and line totals
  let taxTotalMinor = 0;
  let discountTotalMinor = 0;

  const resultLines = preparedLines.map((l) => {
    discountTotalMinor += l.discountMinor;
    const discountedNetMinor = l.netMinor - l.discountMinor;
    const lineTaxMinor = calculateLineTax(discountedNetMinor, l.tax_rate_percent);
    taxTotalMinor += lineTaxMinor;
    const lineTotalMinor = discountedNetMinor + lineTaxMinor;

    return {
      product_id: l.product_id,
      description: l.description,
      quantity: l.quantity,
      unit_price: formatMoney(l.effectivePriceMinor),
      base_unit_price: formatMoney(l.unitPriceMinor),
      variant_adjustment: formatMoney(l.adjustmentMinor),
      tax_rate_percent: l.tax_rate_percent,
      net: formatMoney(l.netMinor),
      discount_allocated: formatMoney(l.discountMinor),
      tax: formatMoney(lineTaxMinor),
      total: formatMoney(lineTotalMinor),
    };
  });

  const grandTotalMinor = subtotalMinor - discountTotalMinor + taxTotalMinor;

  return {
    lines: resultLines,
    subtotal: formatMoney(subtotalMinor),
    discount_total: formatMoney(discountTotalMinor),
    tax_total: formatMoney(taxTotalMinor),
    total: formatMoney(grandTotalMinor),
    selected_discount_id: bestDiscount ? bestDiscount.id : null,
  };
}

module.exports = {
  calculateInvoicePreview,
};

