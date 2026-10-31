/**
 * Input Validation & Invariant Guard for Invoice Generation.
 * 
 * Enforces strict validation on incoming subscription, line item, plan,
 * discount, and tax data structures before any financial calculation begins.
 */

const { VALID_FREQUENCIES, parseDateParts } = require('./billing-period');

class InvoiceValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'InvoiceValidationError';
    this.code = details.code || 'VALIDATION_FAILED';
    this.field = details.field;
    this.details = details;
  }
}

/**
 * Validate subscription input payload.
 * 
 * @param {Object} input - Invoice generation input
 */
function validateInvoiceGenerationInput(input) {
  if (!input || typeof input !== 'object') {
    throw new InvoiceValidationError('Input payload must be a non-null object', { code: 'INVALID_PAYLOAD' });
  }

  const { subscription, billingPeriodStart, billingFrequency } = input;

  if (!subscription || typeof subscription !== 'object') {
    throw new InvoiceValidationError('Subscription object is required', { field: 'subscription', code: 'MISSING_SUBSCRIPTION' });
  }

  if (!subscription.id || typeof subscription.id !== 'string' || !subscription.id.trim()) {
    throw new InvoiceValidationError('Subscription must have a valid non-empty id', {
      field: 'subscription.id',
      code: 'INVALID_SUBSCRIPTION_ID',
    });
  }

  if (!subscription.customer_id || typeof subscription.customer_id !== 'string' || !subscription.customer_id.trim()) {
    throw new InvoiceValidationError('Subscription must have a valid non-empty customer_id', {
      field: 'subscription.customer_id',
      code: 'INVALID_CUSTOMER_ID',
    });
  }

  // Lifecycle check: only active subscriptions can be invoiced
  const status = (subscription.status || '').toLowerCase();
  if (status && !['active', 'confirmed'].includes(status)) {
    throw new InvoiceValidationError(
      `Subscription ${subscription.id} has status "${status}". Only active or confirmed subscriptions can be invoiced.`,
      { field: 'subscription.status', code: 'SUBSCRIPTION_NOT_ACTIVE', status }
    );
  }

  // Frequency check
  const frequency = billingFrequency || (subscription.plan && subscription.plan.frequency) || subscription.billing_frequency;
  if (!frequency || !VALID_FREQUENCIES.includes(String(frequency).toLowerCase())) {
    throw new InvoiceValidationError(
      `Billing frequency "${frequency}" is invalid. Must be one of: ${VALID_FREQUENCIES.join(', ')}`,
      { field: 'billingFrequency', code: 'INVALID_BILLING_FREQUENCY' }
    );
  }

  // Date check
  const startDate = billingPeriodStart || subscription.next_billing_date || subscription.start_date;
  if (!startDate) {
    throw new InvoiceValidationError('Billing period start date is required', {
      field: 'billingPeriodStart',
      code: 'MISSING_BILLING_START_DATE',
    });
  }
  parseDateParts(startDate); // Throws BillingPeriodError if format or calendar day is invalid

  // Lines check
  const lines = subscription.lines || subscription.subscription_lines;
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new InvoiceValidationError('Subscription must contain at least one line item', {
      field: 'subscription.lines',
      code: 'EMPTY_LINE_ITEMS',
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || typeof line !== 'object') {
      throw new InvoiceValidationError(`Line item at index ${i} is invalid`, {
        field: `subscription.lines[${i}]`,
        code: 'INVALID_LINE_ITEM',
      });
    }

    const qty = line.quantity;
    if (!Number.isInteger(qty) || qty < 1) {
      throw new InvoiceValidationError(`Line item [${i}] quantity must be an integer >= 1, received: ${qty}`, {
        field: `subscription.lines[${i}].quantity`,
        code: 'INVALID_QUANTITY',
      });
    }

    const price = line.unit_price;
    if (price === undefined || price === null || price === '') {
      throw new InvoiceValidationError(`Line item [${i}] unit_price is required`, {
        field: `subscription.lines[${i}].unit_price`,
        code: 'MISSING_UNIT_PRICE',
      });
    }
  }

  return true;
}

module.exports = {
  InvoiceValidationError,
  validateInvoiceGenerationInput,
};

