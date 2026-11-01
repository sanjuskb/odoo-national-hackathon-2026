'use strict';

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { listPaymentsQuerySchema } = require('../validators/payment.validators');
const { listPayments, recordPayment } = require('../controllers/payment.controller');

// List all payments across invoices (Staff & Admin only; Customer gets 403)
router.get(
  '/',
  authenticate,
  requireRole(['admin', 'staff']),
  validate(listPaymentsQuerySchema, 'query'),
  listPayments
);

// Record payment on invoice directly via /payments endpoint
router.post(
  '/',
  authenticate,
  requireRole(['admin', 'staff']),
  recordPayment
);

module.exports = router;

