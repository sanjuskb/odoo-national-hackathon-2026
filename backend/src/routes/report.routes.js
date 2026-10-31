'use strict';

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const {
  reportSummaryQuerySchema,
  overdueInvoicesQuerySchema,
  paymentsReportQuerySchema,
  subscriptionsReportQuerySchema,
} = require('../validators/report.validators');
const {
  getSummary,
  getOverdueInvoices,
  getPaymentsReport,
  getSubscriptionsReport,
} = require('../controllers/report.controller');

// All report endpoints are strictly restricted to admin and staff.
// Customer role receives 403 Forbidden. Unauthenticated receives 401 Unauthorized.
router.use(authenticate, requireRole(['admin', 'staff']));

// 1. Financial summary report
router.get(
  '/summary',
  validate(reportSummaryQuerySchema, 'query'),
  getSummary
);

// 2. Overdue invoices report
router.get(
  '/overdue-invoices',
  validate(overdueInvoicesQuerySchema, 'query'),
  getOverdueInvoices
);

// 3. Payments report with aggregate totals
router.get(
  '/payments',
  validate(paymentsReportQuerySchema, 'query'),
  getPaymentsReport
);

// 4. Subscriptions status distribution
router.get(
  '/subscriptions',
  validate(subscriptionsReportQuerySchema, 'query'),
  getSubscriptionsReport
);

module.exports = router;
