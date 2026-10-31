'use strict';

const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const AppError = require('../utils/AppError');

// Customer self-service portal: thin wrappers around subscription controller
router.get(
  '/subscriptions',
  authenticate,
  requireRole('customer'),
  subscriptionController.listSubscriptions
);

router.post(
  '/subscriptions/:id/:action',
  authenticate,
  requireRole('customer'),
  (req, res, next) => {
    const validActions = ['pause', 'resume', 'close', 'renew'];
    if (!validActions.includes(req.params.action)) {
      return next(new AppError(`Invalid portal action: ${req.params.action}`, 400));
    }
    req.body = { ...req.body, action: req.params.action };
    return subscriptionController.transitionSubscription(req, res, next);
  }
);

module.exports = router;

