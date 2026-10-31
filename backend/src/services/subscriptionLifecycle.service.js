'use strict';

const AppError = require('../utils/AppError');
const { toDateOnly, addPeriod } = require('../utils/dates');
const { isPlanAvailable, canPerform } = require('./plan.service');

const STATUSES = {
  DRAFT: 'draft',
  QUOTATION: 'quotation',
  CONFIRMED: 'confirmed',
  ACTIVE: 'active',
  CLOSED: 'closed',
};

const ALLOWED_ACTIONS_BY_STATUS = {
  [STATUSES.DRAFT]: ['send_quotation', 'close'],
  [STATUSES.QUOTATION]: ['confirm', 'close'],
  [STATUSES.CONFIRMED]: ['activate', 'close'],
  [STATUSES.ACTIVE]: ['close', 'pause', 'resume', 'renew'],
  [STATUSES.CLOSED]: [],
};

const CUSTOMER_ALLOWED_ACTIONS = ['close', 'pause', 'resume', 'renew'];

function getAllowedActions(status) {
  return ALLOWED_ACTIONS_BY_STATUS[status] || [];
}

/**
 * Validates and computes lifecycle transitions.
 * Pure logic function: throws AppError on violation, returns updates payload on success.
 */
function evaluateTransition({
  subscription,
  action,
  plan,
  userRole = 'staff',
  asOfDate = new Date(),
}) {
  if (!subscription) {
    throw new AppError('Subscription is required', 400);
  }

  const currentStatus = subscription.status;

  if (currentStatus === STATUSES.CLOSED) {
    throw new AppError('A closed subscription cannot be modified or transitioned', 409);
  }

  const allowedActions = getAllowedActions(currentStatus);
  if (!allowedActions.includes(action)) {
    throw new AppError(
      `Action '${action}' is not allowed for subscription in status '${currentStatus}'. Allowed actions: ${allowedActions.join(', ') || 'none'}`,
      409
    );
  }

  // Customer authorization check
  if (userRole === 'customer') {
    if (!CUSTOMER_ALLOWED_ACTIONS.includes(action)) {
      throw new AppError(`Customers are not authorized to perform '${action}'`, 403);
    }
  }

  const todayStr = toDateOnly(asOfDate);
  let targetStatus = currentStatus;
  const updates = {};

  switch (action) {
    case 'send_quotation': {
      if (!subscription.lines || subscription.lines.length === 0) {
        throw new AppError('Cannot send quotation with no subscription lines', 400);
      }
      targetStatus = STATUSES.QUOTATION;
      break;
    }

    case 'confirm': {
      if (subscription.valid_until) {
        const validUntilStr = toDateOnly(subscription.valid_until);
        if (validUntilStr < todayStr) {
          throw new AppError(`Quotation validity period expired on ${validUntilStr}`, 409);
        }
      }
      targetStatus = STATUSES.CONFIRMED;
      break;
    }

    case 'activate': {
      if (plan) {
        const checkDate = subscription.start_date || todayStr;
        if (!isPlanAvailable(plan, checkDate)) {
          throw new AppError('Associated plan is not available on subscription start date', 400);
        }
      }
      targetStatus = STATUSES.ACTIVE;
      updates.next_billing_date = subscription.start_date || todayStr;
      updates.billing_anchor_date = subscription.start_date || todayStr;
      updates.is_paused = false;
      break;
    }

    case 'close': {
      if (currentStatus === STATUSES.ACTIVE) {
        // Early close from active state
        if (userRole !== 'admin') {
          if (!canPerform(plan, 'close_early')) {
            throw new AppError('Plan policy does not permit early close', 403);
          }
        }
      }
      targetStatus = STATUSES.CLOSED;
      break;
    }

    case 'pause': {
      if (subscription.is_paused) {
        throw new AppError('Subscription is already paused', 409);
      }
      if (!canPerform(plan, 'pause')) {
        throw new AppError('Plan policy does not permit pausing', 403);
      }
      targetStatus = STATUSES.ACTIVE;
      updates.is_paused = true;
      break;
    }

    case 'resume': {
      if (!subscription.is_paused) {
        throw new AppError('Subscription is not paused', 409);
      }
      targetStatus = STATUSES.ACTIVE;
      updates.is_paused = false;
      break;
    }

    case 'renew': {
      if (!canPerform(plan, 'renew')) {
        throw new AppError('Plan policy does not permit renewal', 403);
      }
      if (!subscription.expiry_date) {
        throw new AppError('Subscription has no expiry_date to renew', 400);
      }
      if (!plan || !plan.frequency) {
        throw new AppError('Plan frequency is required for renewal', 400);
      }
      targetStatus = STATUSES.ACTIVE;
      updates.expiry_date = addPeriod(subscription.expiry_date, plan.frequency, 1);
      break;
    }

    default:
      throw new AppError(`Unknown action: ${action}`, 400);
  }

  return {
    targetStatus,
    updates,
  };
}

module.exports = {
  STATUSES,
  ALLOWED_ACTIONS_BY_STATUS,
  CUSTOMER_ALLOWED_ACTIONS,
  getAllowedActions,
  evaluateTransition,
};

