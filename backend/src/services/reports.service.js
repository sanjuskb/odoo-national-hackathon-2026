'use strict';

const { toDateOnly } = require('../utils/dates');
const { formatMoney, parseMoney } = require('../utils/money');
const AppError = require('../utils/AppError');

/**
 * Calculates whole days between two UTC date strings 'YYYY-MM-DD'.
 *
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 * @returns {number} whole days
 */
function daysBetween(startDate, endDate) {
  const sStr = toDateOnly(startDate);
  const eStr = toDateOnly(endDate);

  const [y1, m1, d1] = sStr.split('-').map(Number);
  const [y2, m2, d2] = eStr.split('-').map(Number);

  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);

  const diffMs = utc2 - utc1;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Validates date range.
 * If both from and to are provided, ensures from <= to.
 *
 * @param {string|null} from
 * @param {string|null} to
 */
function validateDateRange(from, to) {
  if (from && to) {
    const fromStr = toDateOnly(from);
    const toStr = toDateOnly(to);
    if (fromStr > toStr) {
      throw new AppError('"from" date must be on or before "to" date', 400, 'INVALID_DATE_RANGE');
    }
  }
}

/**
 * Determines if an invoice is overdue as of a given UTC date.
 *
 * Strict definition:
 * status === 'confirmed' AND due_date < today (strictly less; due today is NOT overdue) AND balance_due > 0.
 *
 * @param {object} invoice
 * @param {number} balanceDueMinor
 * @param {string|Date} [today]
 * @returns {boolean}
 */
function isInvoiceOverdue(invoice, balanceDueMinor, today = toDateOnly(new Date())) {
  if (!invoice || invoice.status !== 'confirmed') return false;
  if (!invoice.due_date) return false;
  if (balanceDueMinor <= 0) return false;

  const todayStr = toDateOnly(today);
  const dueDateStr = toDateOnly(invoice.due_date);

  return dueDateStr < todayStr;
}

/**
 * Computes whole days overdue for an invoice as of today.
 * Returns 0 if not overdue.
 *
 * @param {string|Date} dueDate
 * @param {string|Date} [today]
 * @returns {number} positive integer whole days overdue
 */
function computeDaysOverdue(dueDate, today = toDateOnly(new Date())) {
  if (!dueDate) return 0;
  const todayStr = toDateOnly(today);
  const dueDateStr = toDateOnly(dueDate);

  if (dueDateStr >= todayStr) return 0;
  return daysBetween(dueDateStr, todayStr);
}

/**
 * Assembles the financial summary report object.
 * All money amounts formatted as 2-decimal strings.
 */
function assembleSummaryReport({
  activeSubscriptions,
  pausedSubscriptions,
  revenueInvoicedMinor,
  revenueCollectedMinor,
  outstandingMinor,
  overdueCount,
  overdueAmountMinor,
  today = toDateOnly(new Date()),
  filters = {},
}) {
  return {
    active_subscriptions: activeSubscriptions,
    paused_subscriptions: pausedSubscriptions,
    revenue_invoiced: formatMoney(revenueInvoicedMinor),
    revenue_collected: formatMoney(revenueCollectedMinor),
    outstanding_balance: formatMoney(outstandingMinor),
    overdue_count: overdueCount,
    overdue_amount: formatMoney(overdueAmountMinor),
    as_of: toDateOnly(today),
    filters: {
      from: filters.from || null,
      to: filters.to || null,
      customer_id: filters.customer_id || null,
      plan_id: filters.plan_id || null,
    },
  };
}

module.exports = {
  daysBetween,
  validateDateRange,
  isInvoiceOverdue,
  computeDaysOverdue,
  assembleSummaryReport,
};
