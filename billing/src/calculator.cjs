'use strict';

// Pure financial calculations owned by Sanju. Uses integer minor currency units.
// No Supabase connection, LLM dependency, gateway, or mutable storage.
const MONEY = /^(0|[1-9][0-9]*)(?:\.([0-9]{1,2}))?$/;
function cents(value, label = 'amount') {
  if (typeof value !== 'string' && typeof value !== 'number') throw new TypeError(label + ' must be a decimal string');
  const match = MONEY.exec(String(value));
  if (!match) throw new RangeError(label + ' must be a nonnegative decimal with at most two places');
  return BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0'));
}
function money(amount) {
  if (amount < 0n) throw new RangeError('Negative money is not supported');
  return (amount / 100n).toString() + '.' + (amount % 100n).toString().padStart(2, '0');
}
function bps(percentage, label) {
  const n = cents(percentage, label);
  if (n > 10000n) throw new RangeError(label + ' must be <= 100 percent');
  return n;
}
function roundDiv(n, denominator) {
  if (n < 0n || denominator <= 0n) throw new RangeError('roundDiv expects nonnegative amount and positive denominator');
  return (n + denominator / 2n) / denominator;
}
function assertDate(date, field) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new TypeError(field + ' must be YYYY-MM-DD');
  const value = new Date(date + 'T00:00:00.000Z');
  if (Number.isNaN(value.getTime()) || value.toISOString().slice(0, 10) !== date) throw new RangeError(field + ' invalid date');
  return date;
}
function positiveInteger(value, name) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new RangeError(name + ' must be a positive safe integer');
  return value;
}
function eligibleRule(rule, lines, period) {
  if (!rule || typeof rule.id !== 'string' || !rule.id) throw new TypeError('Discount rule ID required');
  if (rule.validFrom && assertDate(rule.validFrom, 'validFrom') > period) return false;
  if (rule.validUntil && assertDate(rule.validUntil, 'validUntil') < period) return false;
  if (rule.maxUses !== undefined && rule.maxUses !== null) {
    if (!Number.isSafeInteger(rule.maxUses) || rule.maxUses < 0 ||
        !Number.isSafeInteger(rule.usedCount) || rule.usedCount < 0) throw new RangeError('Invalid discount usage counters');
    if (rule.usedCount >= rule.maxUses) return false;
  }
  if (rule.scope !== 'subscription' && rule.scope !== 'product') throw new TypeError('Discount scope must be subscription or product');
  if (rule.scope === 'product' && (!Array.isArray(rule.productIds) || !rule.productIds.length)) throw new TypeError('Product discount requires productIds');
  const matching = lines.filter(line => rule.scope === 'subscription' || rule.productIds.includes(line.productId));
  const amount = matching.reduce((sum, line) => sum + line.remaining, 0n);
  const qty = matching.reduce((sum, line) => sum + line.quantity, 0);
  if (amount === 0n) return false;
  if (rule.minAmount !== undefined && amount < cents(rule.minAmount, 'minAmount')) return false;
  if (rule.minQuantity !== undefined && qty < positiveInteger(rule.minQuantity, 'minQuantity')) return false;
  return true;
}
function applyDiscount(rule, lines) {
  if (rule.kind !== 'fixed' && rule.kind !== 'percentage') throw new TypeError('Discount kind must be fixed or percentage');
  const matching = lines.filter(line => rule.scope === 'subscription' || rule.productIds.includes(line.productId));
  const available = matching.reduce((sum, line) => sum + line.remaining, 0n);
  if (available === 0n) return 0n;
  const raw = rule.kind === 'fixed'
    ? cents(rule.value, 'discount value')
    : roundDiv(available * bps(rule.value, 'discount percentage'), 10000n);
  const desired = raw < available ? raw : available;
  let allocated = 0n;
  for (let i = 0; i < matching.length; i++) {
    const line = matching[i];
    const share = i === matching.length - 1 ? desired - allocated : (desired * line.remaining) / available;
    line.remaining -= share;
    line.discount += share;
    allocated += share;
  }
  return desired;
}
function calculateInvoice(input) {
  if (!input || typeof input !== 'object') throw new TypeError('Invoice input is required');
  const {subscriptionId, customerId, periodStart, currency, lines: given, discounts = [], policy} = input;
  if (typeof subscriptionId !== 'string' || !subscriptionId || typeof customerId !== 'string' || !customerId) throw new TypeError('Subscription and customer IDs required');
  assertDate(periodStart, 'periodStart');
  if (typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency)) throw new TypeError('Explicit ISO currency code required');
  if (!policy || !['inclusive','exclusive'].includes(policy.taxMode) || !['best','all'].includes(policy.discountStacking) || policy.rounding !== 'half-up') {
    throw new TypeError('Approve explicit taxMode (inclusive/exclusive), discountStacking (best/all) and rounding (half-up) policy');
  }
  if (!Array.isArray(given) || given.length === 0) throw new TypeError('At least one invoice line required');
  if (!Array.isArray(discounts)) throw new TypeError('discounts must be an array');
  const rows = given.map((row, index) => {
    if (!row || !row.productId || !row.title) throw new TypeError('Line ' + index + ' requires productId and title');
    const quantity = positiveInteger(row.quantity, 'quantity');
    const unit = cents(row.unitPrice, 'unitPrice');
    const adjustment = cents(row.variantAdjustment === undefined ? '0.00' : row.variantAdjustment, 'variantAdjustment');
    if (row.taxPercent === undefined) throw new TypeError('Every line requires an explicitly configured taxPercent');
    const rate = bps(row.taxPercent, 'taxPercent');
    const base = (unit + adjustment) * BigInt(quantity);
    return {productId: row.productId, title: row.title, quantity, unit, adjustment, rate, base, discount: 0n, remaining: base};
  });
  const subtotal = rows.reduce((sum, row) => sum + row.base, 0n);
  const candidateRules = discounts.filter(rule => eligibleRule(rule, rows, periodStart));
  if (new Set(candidateRules.map(r => r.id)).size !== candidateRules.length) throw new TypeError('Duplicate discount rule IDs');
  const appliedDiscounts = [];
  if (policy.discountStacking === 'best') {
    const offers = candidateRules.map(rule => {
      const probe = rows.map(r => ({...r}));
      return {rule, reduction: applyDiscount(rule, probe)};
    }).sort((a,b) => a.reduction === b.reduction ? a.rule.id.localeCompare(b.rule.id) : a.reduction > b.reduction ? -1 : 1);
    if (offers.length && offers[0].reduction > 0n) {
      const chosen = offers[0];
      applyDiscount(chosen.rule, rows);
      appliedDiscounts.push({id: chosen.rule.id, amount: money(chosen.reduction)});
    }
  } else {
    for (const rule of candidateRules) {
      if (!eligibleRule(rule, rows, periodStart)) continue;
      const reduction = applyDiscount(rule, rows);
      if (reduction > 0n) appliedDiscounts.push({id: rule.id, amount: money(reduction)});
    }
  }
  let taxTotal = 0n;
  const lineResults = rows.map(row => {
    const tax = policy.taxMode === 'inclusive'
      ? row.remaining - roundDiv(row.remaining * 10000n, 10000n + row.rate)
      : roundDiv(row.remaining * row.rate, 10000n);
    taxTotal += tax;
    return {
      productId: row.productId, title: row.title, quantity: row.quantity,
      unitPrice: money(row.unit), variantAdjustment: money(row.adjustment),
      taxPercent: money(row.rate), baseAmount: money(row.base),
      discountAmount: money(row.discount), taxAmount: money(tax),
      lineTotal: money(policy.taxMode === 'inclusive' ? row.remaining : row.remaining + tax)
    };
  });
  const discountTotal = rows.reduce((sum, row) => sum + row.discount, 0n);
  const total = policy.taxMode === 'inclusive' ? subtotal - discountTotal : subtotal - discountTotal + taxTotal;
  return {
    subscriptionId, customerId, billingPeriodStart: periodStart, currency,
    taxMode: policy.taxMode, invoiceLines: lineResults,
    subtotal: money(subtotal), discountTotal: money(discountTotal),
    taxTotal: money(taxTotal), total: money(total), appliedDiscounts
  };
}
module.exports = {calculateInvoice, cents, money, bps, assertDate, roundDiv};
