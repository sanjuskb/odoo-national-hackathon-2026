'use strict';

const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const {
  createTaxSchema,
  updateTaxSchema,
  listTaxesQuerySchema,
} = require('../validators/tax.validators');
const {
  listTaxes,
  getTax,
  createTax,
  updateTax,
} = require('../controllers/tax.controller');

const router = express.Router();

router.get(
  '/',
  authenticate,
  requireRole(['admin', 'staff']),
  validate(listTaxesQuerySchema, 'query'),
  listTaxes
);

router.get(
  '/:id',
  authenticate,
  requireRole(['admin', 'staff']),
  getTax
);

router.post(
  '/',
  authenticate,
  requireRole(['admin']),
  validate(createTaxSchema),
  createTax
);

router.patch(
  '/:id',
  authenticate,
  requireRole(['admin']),
  validate(updateTaxSchema),
  updateTax
);

module.exports = router;
