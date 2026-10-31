'use strict';

const subscriptionsRepo = require('../repositories/subscriptions.repository');
const subscriptionLinesRepo = require('../repositories/subscriptionLines.repository');
const discountsRepo = require('../repositories/discounts.repository');
const { calculateInvoicePreview } = require('../services/invoiceCalculator.service');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/response');

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getBillingPreview(req, res, next) {
  try {
    const { subscription_id } = req.query;
    if (!subscription_id || !uuidRegex.test(subscription_id)) {
      throw new AppError('Valid subscription_id query parameter is required', 400);
    }

    const subscription = await subscriptionsRepo.findById(subscription_id);
    if (!subscription) {
      throw new AppError('Subscription not found', 404);
    }

    // Closed subscriptions cannot be billed
    if (subscription.status === 'closed') {
      throw new AppError('Subscription is closed and cannot be billed', 409);
    }

    const lines = await subscriptionLinesRepo.findBySubscriptionId(subscription.id);
    if (!lines || !lines.length) {
      throw new AppError('Subscription has no lines', 400);
    }

    // Fetch active discount rules
    const { items: activeDiscounts } = await discountsRepo.list({ is_active: true, page_size: 1000 });

    const previewDate = subscription.next_billing_date || new Date();
    const preview = calculateInvoicePreview({
      lines,
      discounts: activeDiscounts,
      date: previewDate,
    });

    return sendSuccess(
      res,
      {
        invoice_preview: {
          subscription_id: subscription.id,
          customer_id: subscription.customer_id,
          preview_date: previewDate,
          ...preview,
        },
      },
      'Billing preview generated successfully'
    );
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getBillingPreview,
};
