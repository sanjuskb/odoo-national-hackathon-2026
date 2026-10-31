'use strict';

const { parseMoney, formatMoney, roundMoney } = require('../utils/money');
const { toDateOnly } = require('../utils/dates');
const AppError = require('../utils/AppError');

/**
 * Normalises an invoice total or payment amount to integer minor units (paise/cents).
 * Accepts decimal strings ('4970.16'), numbers (4970.16), or integer minor units.
 *
 * @param {string|number} value
 * @returns {number} integer minor units
 */
function toMinorUnits(value) {
  if (value === null || value === undefined || value === '') {
    throw new AppError('Amount is required', 400, 'INVALID_AMOUNT');
  }
  return parseMoney(value);
}

/**
 * Computes financial balance, paid amounts, overdue state, and computed status
 * for an invoice given its payment ledger.
 *
 * All arithmetic is performed in integer minor units (no floating point errors).
 *
 * @param {object} invoice
 * @param {Array<object>} payments
 * @param {string|Date} [today]
 * @returns {object}
 */
function computeInvoiceFinancials(invoice, payments = [], today = toDateOnly(new Date())) {
  if (!invoice) {
    throw new AppError('Invoice is required to compute financials', 400);
  }

  const invoiceTotalMinor = toMinorUnits(invoice.total);
  const todayStr = toDateOnly(today);

  let paidMinor = 0;
  if (Array.isArray(payments)) {
    for (const p of payments) {
      if (p && p.amount !== undefined && p.amount !== null) {
        paidMinor += toMinorUnits(p.amount);
      }
    }
  }

  // Balance due never goes below zero
  const balanceDueMinor = Math.max(0, invoiceTotalMinor - paidMinor);

  // Overdue if confirmed, past due date, and has outstanding balance
  const dueDateStr = invoice.due_date ? toDateOnly(invoice.due_date) : null;
  const isOverdue = Boolean(
    invoice.status === 'confirmed' &&
    balanceDueMinor > 0 &&
    dueDateStr &&
    dueDateStr < todayStr
  );

  let computedStatus = invoice.status;
  if (invoice.status === 'cancelled') {
    computedStatus = 'cancelled';
  } else if (invoice.status === 'draft') {
    computedStatus = 'draft';
  } else if (invoice.status === 'confirmed') {
    if (balanceDueMinor === 0 && invoiceTotalMinor > 0) {
      computedStatus = 'paid';
    } else if (isOverdue) {
      computedStatus = 'overdue';
    } else {
      computedStatus = 'confirmed';
    }
  } else if (invoice.status === 'paid') {
    computedStatus = 'paid';
  }

  return {
    total_minor: invoiceTotalMinor,
    total: formatMoney(invoiceTotalMinor),
    paid_amount_minor: paidMinor,
    paid_amount: formatMoney(paidMinor),
    balance_due_minor: balanceDueMinor,
    balance_due: formatMoney(balanceDueMinor),
    is_overdue: isOverdue,
    computed_status: computedStatus,
  };
}

/**
 * Validates whether a lifecycle transition action can be performed on the invoice.
 *
 * @param {object} invoice
 * @param {string} action 'confirm' | 'cancel' | 'send' | 'print' | 'pay'
 * @param {object} [options]
 * @param {Array<object>} [options.payments]
 * @returns {{ allowed: boolean, reason?: string, statusCode?: number }}
 */
function canTransition(invoice, action, { payments = [] } = {}) {
  if (!invoice) {
    return { allowed: false, reason: 'Invoice not found', statusCode: 404 };
  }

  const status = invoice.status;

  switch (action) {
    case 'confirm':
      if (status !== 'draft') {
        return {
          allowed: false,
          reason: `Only draft invoices can be confirmed; current status is '${status}'`,
          statusCode: 409,
        };
      }
      return { allowed: true };

    case 'cancel':
      if (status === 'draft') {
        return { allowed: true };
      }
      if (status === 'confirmed') {
        let paidMinor = 0;
        for (const p of payments) {
          if (p && p.amount !== undefined && p.amount !== null) {
            paidMinor += toMinorUnits(p.amount);
          }
        }
        if (paidMinor > 0 || payments.length > 0) {
          return {
            allowed: false,
            reason: 'Cannot cancel invoice with recorded payments',
            statusCode: 409,
          };
        }
        return { allowed: true };
      }
      if (status === 'paid') {
        return {
          allowed: false,
          reason: 'Cannot cancel a paid invoice',
          statusCode: 409,
        };
      }
      if (status === 'cancelled') {
        return {
          allowed: false,
          reason: 'Invoice is already cancelled',
          statusCode: 409,
        };
      }
      return {
        allowed: false,
        reason: `Cannot cancel invoice in '${status}' status`,
        statusCode: 409,
      };

    case 'send':
      if (status !== 'confirmed' && status !== 'paid') {
        return {
          allowed: false,
          reason: `Only confirmed or paid invoices can be sent; current status is '${status}'`,
          statusCode: 400,
        };
      }
      return { allowed: true };

    case 'print':
      // Any valid invoice can be rendered / printed
      return { allowed: true };

    case 'pay':
      if (status === 'draft') {
        return {
          allowed: false,
          reason: 'Cannot record payment on a draft invoice',
          statusCode: 400,
        };
      }
      if (status === 'cancelled') {
        return {
          allowed: false,
          reason: 'Cannot record payment on a cancelled invoice',
          statusCode: 400,
        };
      }
      if (status === 'paid') {
        return {
          allowed: false,
          reason: 'Invoice is already fully paid',
          statusCode: 400,
        };
      }
      if (status === 'confirmed') {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: `Cannot record payment for invoice in '${status}' status`,
        statusCode: 400,
      };

    default:
      return {
        allowed: false,
        reason: `Unknown action '${action}'`,
        statusCode: 400,
      };
  }
}

/**
 * Validates a proposed payment amount against the invoice balance.
 *
 * @param {object} invoice
 * @param {Array<object>} payments
 * @param {string|number} amount
 * @returns {{ amountMinor: number, amountFormatted: string, willPayInFull: boolean }}
 */
function validatePaymentAmount(invoice, payments, amount) {
  const amountMinor = toMinorUnits(amount);
  if (amountMinor <= 0) {
    throw new AppError('Payment amount must be greater than zero', 400, 'INVALID_AMOUNT');
  }

  const financials = computeInvoiceFinancials(invoice, payments);
  if (amountMinor > financials.balance_due_minor) {
    throw new AppError(
      `Payment amount of ${formatMoney(amountMinor)} exceeds remaining balance due of ${financials.balance_due}`,
      400,
      'OVERPAYMENT_NOT_ALLOWED'
    );
  }

  const willPayInFull = amountMinor === financials.balance_due_minor;

  return {
    amountMinor,
    amountFormatted: formatMoney(amountMinor),
    willPayInFull,
  };
}

module.exports = {
  toMinorUnits,
  computeInvoiceFinancials,
  canTransition,
  validatePaymentAmount,
};
