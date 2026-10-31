'use strict';

const reportsRepo = require('../repositories/reports.repository');
const reportsService = require('../services/reports.service');
const { toDateOnly } = require('../utils/dates');
const { sendSuccess } = require('../utils/response');

async function getSummary(req, res, next) {
  try {
    const { from, to, customer_id, plan_id } = req.query;
    const today = req.query.today || toDateOnly(new Date());

    const [
      subCounts,
      invoicedTotalMinor,
      collectedData,
      outstandingData,
    ] = await Promise.all([
      reportsRepo.countSubscriptionsByStatus({ customer_id, plan_id }),
      reportsRepo.getInvoicedTotal({ from, to, customer_id, plan_id }),
      reportsRepo.getCollectedTotal({ from, to, customer_id }),
      reportsRepo.getOutstandingAndOverdue({ customer_id, plan_id, today }),
    ]);

    const summary = reportsService.assembleSummaryReport({
      activeSubscriptions: subCounts.active,
      pausedSubscriptions: subCounts.paused,
      revenueInvoicedMinor: invoicedTotalMinor,
      revenueCollectedMinor: collectedData.totalMinor,
      outstandingMinor: outstandingData.outstandingMinor,
      overdueCount: outstandingData.overdueCount,
      overdueAmountMinor: outstandingData.overdueAmountMinor,
      today,
      filters: { from, to, customer_id, plan_id },
    });

    return sendSuccess(res, summary, 'Financial summary retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function getOverdueInvoices(req, res, next) {
  try {
    const { from, to, customer_id, plan_id, page } = req.query;
    const limit = req.query.limit || req.query.page_size || 20;
    const today = req.query.today || toDateOnly(new Date());

    const result = await reportsRepo.listOverdueInvoices({
      customer_id,
      plan_id,
      from,
      to,
      page,
      limit,
      today,
    });

    return sendSuccess(res, result, 'Overdue invoices retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function getPaymentsReport(req, res, next) {
  try {
    const { from, to, method, invoice_id, customer_id, page } = req.query;
    const limit = req.query.limit || req.query.page_size || 20;

    const result = await reportsRepo.listPaymentsReport({
      from,
      to,
      method,
      invoice_id,
      customer_id,
      page,
      limit,
    });

    return sendSuccess(res, result, 'Payments report retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function getSubscriptionsReport(req, res, next) {
  try {
    const { customer_id, plan_id } = req.query;

    const counts = await reportsRepo.countSubscriptionsByStatus({
      customer_id,
      plan_id,
    });

    return sendSuccess(res, { counts }, 'Subscription report retrieved successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSummary,
  getOverdueInvoices,
  getPaymentsReport,
  getSubscriptionsReport,
};
