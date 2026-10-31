'use strict';

const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  transitionSubscriptionSchema,
} = require('../validators/subscription.validators');

// GET /api/v1/subscriptions - Staff & Admin see all; Customer sees only own
router.get('/', authenticate, subscriptionController.listSubscriptions);

// POST /api/v1/subscriptions/auto-close - Admin only (manual batch job, not automated scheduler)
// Placed before /:id to avoid route collision
router.post('/auto-close', authenticate, requireRole('admin'), subscriptionController.autoCloseSubscriptions);

// GET /api/v1/subscriptions/:id - Staff & Admin see any; Customer sees only own (404 otherwise)
router.get('/:id', authenticate, subscriptionController.getSubscription);

// POST /api/v1/subscriptions - Staff and Admin only; Customer gets 403
router.post(
  '/',
  authenticate,
  requireRole(['admin', 'staff']),
  validate(createSubscriptionSchema),
  subscriptionController.createSubscription
);

// PATCH /api/v1/subscriptions/:id - Staff and Admin only (draft or quotation status only)
router.patch(
  '/:id',
  authenticate,
  requireRole(['admin', 'staff']),
  validate(updateSubscriptionSchema),
  subscriptionController.updateSubscription
);

// POST /api/v1/subscriptions/:id/transition - Role-aware lifecycle transition
router.post(
  '/:id/transition',
  authenticate,
  validate(transitionSubscriptionSchema),
  subscriptionController.transitionSubscription
);

module.exports = router;
