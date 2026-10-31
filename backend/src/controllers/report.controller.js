'use strict';

const reportsRepo = require('../repositories/reports.repository');
const reportsService = require('../services/reports.service');
const reportCache = require('../utils/reportCache');
const { toDateOnly } = require('../utils/dates');
const { sendSuccess } = require('../utils/response');

async function getSummary(req, res, next) {
  try {
    const isRefresh = req.query.refresh === 'true';
    const cacheKey = reportCache.normalizeKey('summary', req.query);

    if (!isRefresh) {
      const cached = reportCache.get(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return sendSuccess(res, cached, 'Financial summary retrieved successfully');
      }
    }

    const { from, to, customer_id, plan_id } = req.query;
    const today = req.query.today || toDateOnly(new Date());

    const summary = await reportsRepo.getSummaryReport({
      from,
      to,
      customer_id,
      plan_id,
      today,
    });

    reportCache.set(cacheKey, summary);
    res.setHeader('X-Cache', 'MISS');
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
    const isRefresh = req.query.refresh === 'true';
    const cacheKey = reportCache.normalizeKey('subscriptions', req.query);

    if (!isRefresh) {
      const cached = reportCache.get(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return sendSuccess(res, cached, 'Subscription report retrieved successfully');
      }
    }

    const { customer_id, plan_id } = req.query;

    const counts = await reportsRepo.countSubscriptionsByStatus({
      customer_id,
      plan_id,
    });

    const data = { counts };
    reportCache.set(cacheKey, data);
    res.setHeader('X-Cache', 'MISS');
    return sendSuccess(res, data, 'Subscription report retrieved successfully');
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
