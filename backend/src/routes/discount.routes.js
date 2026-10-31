'use strict';

const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const {
  createDiscountSchema,
  updateDiscountSchema,
  listDiscountsQuerySchema,
} = require('../validators/discount.validators');
const {
  listDiscounts,
  getDiscount,
  createDiscount,
  updateDiscount,
} = require('../controllers/discount.controller');

const router = express.Router();

router.get(
  '/',
  authenticate,
  requireRole(['admin', 'staff']),
  validate(listDiscountsQuerySchema, 'query'),
  listDiscounts
);

router.get(
  '/:id',
  authenticate,
  requireRole(['admin', 'staff']),
  getDiscount
);

router.post(
  '/',
  authenticate,
  requireRole(['admin']),
  validate(createDiscountSchema),
  createDiscount
);

router.patch(
  '/:id',
  authenticate,
  requireRole(['admin']),
  validate(updateDiscountSchema),
  updateDiscount
);

module.exports = router;
