/**
 * Brightloop Deterministic Invoice Generation Engine.
 * 
 * Primary Owner: Sanju (@sanjuskb)
 * Collaborators: Amarnath (Express API integration), Harsha (Supabase schema/persistence)
 * 
 * Core Invariants:
 * 1. Financial Precision: Exact integer-cents arithmetic with half-up rounding. Zero floating-point drift.
 * 2. Idempotency Key: Stable identity composite of `${subscription_id}:${billing_period_start}`.
 * 3. Bounded Period: Full calendar date coverage for daily, weekly, monthly, and yearly cycles.
 * 4. Zero/Negative Guard: Line and invoice totals are strictly non-negative.
 * 5. Deterministic Auditing: Every monetary field returned as exact two-decimal string.
 * 6. Proportional Discount Allocation: Whole-subscription discounts are proportionally distributed across lines
 *    so line-level taxable amounts and taxes reconcile exactly to invoice grand totals.
 */

const { toCents, fromCents, multiplyQuantity, FinancialCalculationError } = require('./money');
const { calculateBillingPeriod, BillingPeriodError } = require('./billing-period');
const { evaluateDiscountEligibility, calculateDiscountAmount, DiscountRuleError } = require('./discounts');
const { calculateTaxes, TaxCalculationError } = require('./taxes');
const { validateInvoiceGenerationInput, InvoiceValidationError } = require('./validator');

class InvoiceEngineError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'InvoiceEngineError';
    this.code = details.code || 'INVOICE_GENERATION_FAILED';
    this.details = details;
  }
}

/**
 * Generate a deterministic invoice from a subscription record and billing parameters.
 * 
 * @param {Object} options
 * @param {Object} options.subscription - Subscription entity with customer_id, lines, plan
 * @param {string} [options.billingPeriodStart] - ISO/YYYY-MM-DD start date (defaults to next_billing_date or start_date)
 * @param {string} [options.billingFrequency] - 'daily' | 'weekly' | 'monthly' | 'yearly'
 * @param {string} [options.issueDate] - YYYY-MM-DD issue date (defaults to billingPeriodStart)
 * @param {number} [options.paymentTermsDays=15] - Days until invoice is due
 * @param {Array<Object>} [options.availableDiscounts=[]] - Discount rules to evaluate
 * @param {Array<Object>} [options.taxRules=[]] - Tax rules to apply
 * @param {string} [options.currency='USD'] - ISO currency code
 * @param {Set<string>|Array<string>} [options.existingInvoiceKeys] - Registered keys for duplicate checking
 * @returns {Object} Deterministic invoice document
 */
function generateInvoice({
  subscription,
  billingPeriodStart = null,
  billingFrequency = null,
  issueDate = null,
  paymentTermsDays = 15,
  availableDiscounts = [],
  taxRules = [],
  currency = 'USD',
  existingInvoiceKeys = null,
}) {
  // 1. Validate complete input contract
  validateInvoiceGenerationInput({ subscription, billingPeriodStart, billingFrequency });

  const freq = (
    billingFrequency ||
    (subscription.plan && subscription.plan.frequency) ||
    subscription.billing_frequency ||
    'monthly'
  ).toLowerCase();

  const startDate = billingPeriodStart || subscription.next_billing_date || subscription.start_date;
  const anchorDay = subscription.anchor_day || (subscription.start_date ? parseInt(subscription.start_date.slice(8, 10), 10) : null);

  // 2. Compute canonical billing period and calendar dates
  const period = calculateBillingPeriod({
    frequency: freq,
    startDate,
    anchorDay,
    issueDate,
    paymentTermsDays,
  });

  // 3. Define stable idempotency identity
  const idempotencyKey = `${subscription.id}:${period.billing_period_start}`;

  // 4. In-memory idempotency check (Application layer check; Harsha enforces DB UNIQUE)
  if (existingInvoiceKeys) {
    const isDuplicate = existingInvoiceKeys instanceof Set
      ? existingInvoiceKeys.has(idempotencyKey)
      : Array.isArray(existingInvoiceKeys) && existingInvoiceKeys.includes(idempotencyKey);

    if (isDuplicate) {
      return {
        idempotency_key: idempotencyKey,
        is_duplicate: true,
        status: 'duplicate_skipped',
        reason: 'INVOICE_ALREADY_EXISTS_FOR_PERIOD',
        subscription_id: subscription.id,
        billing_period_start: period.billing_period_start,
      };
    }
  }

  // 5. Calculate Line Items
  const rawLines = subscription.lines || subscription.subscription_lines || [];
  let invoiceSubtotalCents = 0;
  let totalQuantity = 0;

  // First pass: compute raw line subtotals
  const preparedLines = rawLines.map((line, index) => {
    const qty = line.quantity;
    const unitPriceCents = toCents(line.unit_price);
    const lineSubtotalCents = multiplyQuantity(qty, unitPriceCents);

    invoiceSubtotalCents += lineSubtotalCents;
    totalQuantity += qty;

    return {
      index,
      product_id: line.product_id || (line.product && line.product.id) || `item-${index + 1}`,
      product_name: line.product_name || (line.product && line.product.name) || (subscription.plan && subscription.plan.name) || 'Subscription Item',
      variant_id: line.variant_id || (line.variant && line.variant.id) || null,
      quantity: qty,
      unitPriceCents,
      lineSubtotalCents,
      discountCents: 0,
      taxCents: 0,
      lineTotalCents: 0,
      discountsApplied: [],
      taxesApplied: [],
    };
  });

  // 6. Evaluate and Apply Discounts
  let invoiceTotalDiscountCents = 0;
  let wholeSubscriptionDiscountCents = 0;
  const appliedInvoiceDiscounts = [];

  const discountContext = {
    billingDate: period.billing_period_start,
    subtotalCents: invoiceSubtotalCents,
    totalQuantity,
  };

  for (const discountRule of availableDiscounts) {
    const { eligible } = evaluateDiscountEligibility(discountRule, discountContext);
    if (!eligible) {
      continue;
    }

    const scope = (discountRule.scope || 'subscription').toLowerCase();

    if (scope === 'product') {
      const targetProductIds = Array.isArray(discountRule.product_ids) ? discountRule.product_ids : [];
      for (const line of preparedLines) {
        if (targetProductIds.includes(line.product_id)) {
          const remainingLineCents = line.lineSubtotalCents - line.discountCents;
          const discCents = calculateDiscountAmount(discountRule, remainingLineCents);
          line.discountCents += discCents;
          invoiceTotalDiscountCents += discCents;
          line.discountsApplied.push({
            code: discountRule.code || discountRule.id,
            description: discountRule.name || discountRule.description || 'Product Discount',
            amount: fromCents(discCents),
          });
        }
      }
    } else {
      // Whole subscription discount
      const remainingSubtotalCents = invoiceSubtotalCents - invoiceTotalDiscountCents;
      const discCents = calculateDiscountAmount(discountRule, remainingSubtotalCents);
      invoiceTotalDiscountCents += discCents;
      wholeSubscriptionDiscountCents += discCents;

      appliedInvoiceDiscounts.push({
        code: discountRule.code || discountRule.id,
        description: discountRule.name || discountRule.description || 'Subscription Discount',
        amount: fromCents(discCents),
      });
    }
  }

  // If there are whole-subscription discounts, allocate them proportionally across lines
  if (wholeSubscriptionDiscountCents > 0 && invoiceSubtotalCents > 0) {
    let allocatedSoFar = 0;
    for (let i = 0; i < preparedLines.length; i++) {
      const line = preparedLines[i];
      let lineShare = 0;
      if (i === preparedLines.length - 1) {
        // Last line absorbs remainder to prevent 1-cent rounding discrepancies
        lineShare = wholeSubscriptionDiscountCents - allocatedSoFar;
      } else {
        lineShare = Math.round(wholeSubscriptionDiscountCents * (line.lineSubtotalCents / invoiceSubtotalCents));
        allocatedSoFar += lineShare;
      }
      line.discountCents = Math.min(line.lineSubtotalCents, line.discountCents + lineShare);
    }
  }

  // 7. Calculate Taxes and Finalize Line Totals
  let invoiceTotalTaxCents = 0;
  const finalLines = preparedLines.map((line) => {
    // Net taxable amount for this line after discount
    const netTaxableCents = Math.max(0, line.lineSubtotalCents - line.discountCents);
    const { totalTaxCents, breakdown } = calculateTaxes(netTaxableCents, taxRules);

    line.taxCents = totalTaxCents;
    invoiceTotalTaxCents += totalTaxCents;
    line.taxesApplied = breakdown;

    // Line total = Subtotal - Discount + Tax
    line.lineTotalCents = netTaxableCents + totalTaxCents;

    return {
      product_id: line.product_id,
      product_name: line.product_name,
      variant_id: line.variant_id,
      quantity: line.quantity,
      unit_price: fromCents(line.unitPriceCents),
      subtotal: fromCents(line.lineSubtotalCents),
      discount_amount: fromCents(line.discountCents),
      taxable_amount: fromCents(netTaxableCents),
      tax_amount: fromCents(line.taxCents),
      line_total: fromCents(line.lineTotalCents),
      taxes: line.taxesApplied,
      discounts: line.discountsApplied,
    };
  });

  // 8. Compute Grand Totals & Financial Invariants
  const finalPayableCents = Math.max(0, invoiceSubtotalCents - invoiceTotalDiscountCents + invoiceTotalTaxCents);

  // Consolidated tax breakdown
  const { breakdown: invoiceTaxBreakdown } = calculateTaxes(
    Math.max(0, invoiceSubtotalCents - invoiceTotalDiscountCents),
    taxRules
  );

  return {
    idempotency_key: idempotencyKey,
    is_duplicate: false,
    subscription_id: subscription.id,
    customer_id: subscription.customer_id,
    status: 'draft',
    currency: String(currency || 'USD').toUpperCase(),
    billing_frequency: period.frequency,
    billing_period_start: period.billing_period_start,
    billing_period_end: period.billing_period_end,
    next_billing_date: period.next_billing_date,
    issue_date: period.issue_date,
    due_date: period.due_date,
    subtotal: fromCents(invoiceSubtotalCents),
    total_discount: fromCents(invoiceTotalDiscountCents),
    total_tax: fromCents(invoiceTotalTaxCents),
    total_amount: fromCents(finalPayableCents),
    amount_paid: '0.00',
    outstanding_balance: fromCents(finalPayableCents),
    lines: finalLines,
    taxes: invoiceTaxBreakdown,
    discounts: appliedInvoiceDiscounts,
    metadata: {
      generated_by: 'SanjuDeterministicBillingEngine',
      version: '1.0.0',
      anchor_day: period.anchor_day,
      payment_terms_days: period.payment_terms_days,
    },
  };
}

module.exports = {
  InvoiceEngineError,
  generateInvoice,
};
