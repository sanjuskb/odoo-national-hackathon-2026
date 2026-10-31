'use strict';

const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const { getBillingPreview } = require('../controllers/billingPreview.controller');

const router = express.Router();

router.get(
  '/preview',
  authenticate,
  requireRole(['admin', 'staff']),
  getBillingPreview
);

module.exports = router;
