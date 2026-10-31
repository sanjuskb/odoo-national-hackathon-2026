'use strict';

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { listPaymentsQuerySchema } = require('../validators/payment.validators');
const { listPayments } = require('../controllers/payment.controller');

// List all payments across invoices (Staff & Admin only; Customer gets 403)
router.get(
  '/',
  authenticate,
  requireRole(['admin', 'staff']),
  validate(listPaymentsQuerySchema, 'query'),
  listPayments
);

module.exports = router;

