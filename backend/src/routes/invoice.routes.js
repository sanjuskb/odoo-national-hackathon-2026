'use strict';

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const {
  idParamSchema,
  listInvoicesQuerySchema,
} = require('../validators/invoice.validators');
const { createPaymentSchema } = require('../validators/payment.validators');
const {
  listInvoices,
  getInvoice,
  confirmInvoice,
  cancelInvoice,
  sendInvoice,
  printInvoice,
} = require('../controllers/invoice.controller');
const {
  recordPayment,
  listInvoicePayments,
} = require('../controllers/payment.controller');

// List invoices (Admin & Staff see all or filtered; Customer sees own only)
router.get(
  '/',
  authenticate,
  requireRole(['admin', 'staff', 'customer']),
  validate(listInvoicesQuerySchema, 'query'),
  listInvoices
);

// Get single invoice with lines, payments, and financials
router.get(
  '/:id',
  authenticate,
  requireRole(['admin', 'staff', 'customer']),
  validate(idParamSchema, 'params'),
  getInvoice
);

// Confirm draft invoice -> confirmed
router.post(
  '/:id/confirm',
  authenticate,
  requireRole(['admin', 'staff']),
  validate(idParamSchema, 'params'),
  confirmInvoice
);

// Cancel invoice (draft or confirmed with 0 payments) -> cancelled
router.post(
  '/:id/cancel',
  authenticate,
  requireRole(['admin', 'staff']),
  validate(idParamSchema, 'params'),
  cancelInvoice
);

// Send invoice via email (confirmed or paid)
router.post(
  '/:id/send',
  authenticate,
  requireRole(['admin', 'staff']),
  validate(idParamSchema, 'params'),
  sendInvoice
);

// Print invoice (JSON or HTML with ?format=html)
router.get(
  '/:id/print',
  authenticate,
  requireRole(['admin', 'staff', 'customer']),
  validate(idParamSchema, 'params'),
  printInvoice
);

// Record payment on invoice (Staff & Admin only)
router.post(
  '/:id/payments',
  authenticate,
  requireRole(['admin', 'staff']),
  validate(idParamSchema, 'params'),
  validate(createPaymentSchema),
  recordPayment
);

// List payments for an invoice (Customer sees own; Staff & Admin see any)
router.get(
  '/:id/payments',
  authenticate,
  requireRole(['admin', 'staff', 'customer']),
  validate(idParamSchema, 'params'),
  listInvoicePayments
);

module.exports = router;
