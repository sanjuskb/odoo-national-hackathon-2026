'use strict';

const express = require('express');
const router = express.Router();
const quotationTemplateController = require('../controllers/quotationTemplate.controller');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const {
  createQuotationTemplateSchema,
  updateQuotationTemplateSchema,
} = require('../validators/quotationTemplate.validators');

// All quotation template endpoints require authentication and staff or admin role.
// Customers receive 403 Forbidden.
router.get(
  '/',
  authenticate,
  requireRole(['admin', 'staff']),
  quotationTemplateController.listTemplates
);

router.get(
  '/:id',
  authenticate,
  requireRole(['admin', 'staff']),
  quotationTemplateController.getTemplate
);

router.post(
  '/',
  authenticate,
  requireRole('admin'),
  validate(createQuotationTemplateSchema),
  quotationTemplateController.createTemplate
);

router.patch(
  '/:id',
  authenticate,
  requireRole('admin'),
  validate(updateQuotationTemplateSchema),
  quotationTemplateController.updateTemplate
);

module.exports = router;

