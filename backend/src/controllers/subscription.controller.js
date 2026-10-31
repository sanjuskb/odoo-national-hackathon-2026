'use strict';

const crypto = require('crypto');
const subscriptionsRepo = require('../repositories/subscriptions.repository');
const subscriptionLinesRepo = require('../repositories/subscriptionLines.repository');
const quotationTemplatesRepo = require('../repositories/quotationTemplates.repository');
const plansRepo = require('../repositories/plans.repository');
const productsRepo = require('../repositories/products.repository');
const variantsRepo = require('../repositories/variants.repository');
const taxesRepo = require('../repositories/taxes.repository');
const roleStore = require('../services/roleStore');
const { computeUnitPrice } = require('../services/pricing.service');
const { parseMoney, formatMoney, multiplyMoney } = require('../utils/money');
const { toDateOnly, addDays } = require('../utils/dates');
const { isPlanAvailable, validateQuantityForPlan, shouldAutoClose } = require('../services/plan.service');
const { evaluateTransition, STATUSES } = require('../services/subscriptionLifecycle.service');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/response');

/**
 * Generates subscription number.
 * TEMPORARY - replace with a database sequence if Harsha provides one.
 * Format: SUB-<YYYYMM>-<6 random uppercase alphanumeric characters>
 */
function generateSubscriptionNumber() {
  const ym = new Date().toISOString().slice(0, 7).replace('-', '');
  const rand = crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
  return `SUB-${ym}-${rand}`;
}

/**
 * Validates and prepares subscription line items with server-side price computation.
 */
async function prepareLines(lines, plan) {
  const prepared = [];

  for (const line of lines) {
    if (!validateQuantityForPlan(plan, line.quantity)) {
      throw new AppError(
        `Quantity ${line.quantity} for product '${line.product_id}' is below plan minimum quantity of ${plan.min_quantity}`,
        400
      );
    }

    const product = await productsRepo.findById(line.product_id);
    if (!product) {
      throw new AppError(`Product '${line.product_id}' not found`, 400);
    }

    let variant = null;
    if (line.variant_id) {
      variant = await variantsRepo.findById(line.variant_id);
      if (!variant) {
        throw new AppError(`Variant '${line.variant_id}' not found`, 400);
      }
      if (variant.product_id !== line.product_id) {
        throw new AppError(`Variant '${line.variant_id}' does not belong to product '${line.product_id}'`, 400);
      }
    }

    let taxRule = null;
    if (line.tax_id) {
      taxRule = await taxesRepo.findById(line.tax_id);
      if (!taxRule) {
        throw new AppError(`Tax rule '${line.tax_id}' not found`, 400);
      }
    }

    // Server-side unit price calculation: client-sent prices are completely ignored
    // pricing.base_price = product base price (e.g. 1000.00)
    // pricing.adjustment = variant delta (e.g. 560.00 or 0.00)
    // pricing.unit_price = total unit price (base + adjustment = 1560.00)
    const pricing = computeUnitPrice(product, variant);
    const unitPriceMinor = parseMoney(pricing.unit_price);
    const amountMinor = multiplyMoney(unitPriceMinor, line.quantity);
    const amount = formatMoney(amountMinor);

    const description = variant ? `${product.name} (${variant.name})` : product.name;
    const basePrice = pricing.base_price;
    const variantAdjustment = pricing.adjustment || '0.00';
    const taxRatePercent = taxRule ? formatMoney(parseMoney(taxRule.rate_percent || taxRule.rate)) : '0.00';

    prepared.push({
      product_id: line.product_id,
      variant_id: line.variant_id || null,
      quantity: line.quantity,
      unit_price: basePrice, // Store product base price to avoid double-counting in billing
      tax_id: line.tax_id || null,
      amount, // quantity * (base + variant adjustment)
      description,
      variant_adjustment: variantAdjustment, // Store variant adjustment separately (default '0.00')
      tax_rate_percent: taxRatePercent, // Snapshot of tax rule rate
    });
  }

  return prepared;
}

/**
 * Validates that customer_id belongs to an existing customer.
 */
async function validateCustomer(customerId) {
  const role = await roleStore.getRole(customerId);
  if (!role) {
    throw new AppError(`Customer '${customerId}' not found`, 400);
  }
  if (role !== 'customer') {
    throw new AppError(`User '${customerId}' does not have the customer role`, 400);
  }
}

async function listSubscriptions(req, res, next) {
  try {
    const filters = { ...req.query };

    // Customers see ONLY their own subscriptions; customer-supplied customer_id filter is ignored
    if (req.user.role === 'customer') {
      filters.customer_id = req.user.id;
    }

    const result = await subscriptionsRepo.list(filters);
    return sendSuccess(res, result, 'Subscriptions retrieved');
  } catch (err) {
    next(err);
  }
}

async function getSubscription(req, res, next) {
  try {
    const subscription = await subscriptionsRepo.findById(req.params.id);
    if (!subscription) {
      throw new AppError('Subscription not found', 404);
    }

    // Customers only see their own subscriptions; return 404 to avoid revealing existence
    if (req.user.role === 'customer' && subscription.customer_id !== req.user.id) {
      throw new AppError('Subscription not found', 404);
    }

    return sendSuccess(res, { subscription }, 'Subscription retrieved');
  } catch (err) {
    next(err);
  }
}

async function createSubscription(req, res, next) {
  try {
    const { customer_id, start_date, expiry_date, payment_terms, template_id } = req.body;
    let { plan_id, lines, valid_until } = req.body;

    await validateCustomer(customer_id);

    // If template_id provided: copy template's plan, lines, and compute valid_until
    if (template_id) {
      const template = await quotationTemplatesRepo.findById(template_id);
      if (!template) {
        throw new AppError(`Quotation template '${template_id}' not found`, 400);
      }
      plan_id = template.plan_id;
      lines = template.lines.map((l) => ({
        product_id: l.product_id,
        variant_id: l.variant_id,
        quantity: l.quantity,
      }));
      valid_until = addDays(toDateOnly(new Date()), template.validity_days);
    }

    const plan = await plansRepo.findById(plan_id);
    if (!plan) {
      throw new AppError(`Plan '${plan_id}' not found`, 400);
    }

    if (!isPlanAvailable(plan, start_date)) {
      throw new AppError('Plan is not available on start_date', 400);
    }

    const preparedLines = await prepareLines(lines, plan);

    // Create with retry on unique constraint violation (up to 5 retries)
    let createdSub = null;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      attempts++;
      const subscriptionNumber = generateSubscriptionNumber();
      try {
        createdSub = await subscriptionsRepo.create({
          subscription_number: subscriptionNumber,
          customer_id,
          plan_id,
          start_date: toDateOnly(start_date),
          expiry_date: toDateOnly(expiry_date),
          payment_terms,
          status: STATUSES.DRAFT,
          valid_until: valid_until ? toDateOnly(valid_until) : null,
          template_id: template_id || null,
          next_billing_date: null,
          billing_anchor_date: null,
          is_paused: false,
        });
        break;
      } catch (err) {
        if (err.code === '23505' && attempts < maxAttempts) {
          continue; // retry with fresh random number
        }
        throw err;
      }
    }

    // Insert prepared subscription lines
    const insertedLines = await subscriptionLinesRepo.createLines(createdSub.id, preparedLines);

    // Return full subscription with lines
    const fullSub = await subscriptionsRepo.findById(createdSub.id);

    return sendSuccess(res, { subscription: fullSub }, 'Subscription created successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function updateSubscription(req, res, next) {
  try {
    const existing = await subscriptionsRepo.findById(req.params.id);
    if (!existing) {
      throw new AppError('Subscription not found', 404);
    }

    // Editing allowed ONLY in draft or quotation status
    if (existing.status !== STATUSES.DRAFT && existing.status !== STATUSES.QUOTATION) {
      throw new AppError(
        `Subscription cannot be edited in '${existing.status}' status (only 'draft' or 'quotation' permitted)`,
        409
      );
    }

    const merged = {
      customer_id: req.body.customer_id || existing.customer_id,
      plan_id: req.body.plan_id || existing.plan_id,
      start_date: req.body.start_date ? toDateOnly(req.body.start_date) : existing.start_date,
      expiry_date: req.body.expiry_date ? toDateOnly(req.body.expiry_date) : existing.expiry_date,
      payment_terms: req.body.payment_terms || existing.payment_terms,
      valid_until: req.body.valid_until !== undefined ? (req.body.valid_until ? toDateOnly(req.body.valid_until) : null) : existing.valid_until,
    };

    if (new Date(merged.expiry_date).getTime() < new Date(merged.start_date).getTime()) {
      throw new AppError('expiry_date must be on or after start_date', 400);
    }

    if (req.body.customer_id) {
      await validateCustomer(merged.customer_id);
    }

    const plan = await plansRepo.findById(merged.plan_id);
    if (!plan) {
      throw new AppError(`Plan '${merged.plan_id}' not found`, 400);
    }

    if (!isPlanAvailable(plan, merged.start_date)) {
      throw new AppError('Plan is not available on start_date', 400);
    }

    // Update lines if provided
    if (req.body.lines && req.body.lines.length > 0) {
      const preparedLines = await prepareLines(req.body.lines, plan);
      await subscriptionLinesRepo.replaceLines(existing.id, preparedLines);
    }

    const updated = await subscriptionsRepo.update(existing.id, merged);
    return sendSuccess(res, { subscription: updated }, 'Subscription updated successfully');
  } catch (err) {
    next(err);
  }
}

async function transitionSubscription(req, res, next) {
  try {
    const { action } = req.body;
    const subscription = await subscriptionsRepo.findById(req.params.id);
    if (!subscription) {
      throw new AppError('Subscription not found', 404);
    }

    // Customers only see/transition their own subscriptions; return 404 to avoid revealing existence
    if (req.user.role === 'customer' && subscription.customer_id !== req.user.id) {
      throw new AppError('Subscription not found', 404);
    }

    const plan = await plansRepo.findById(subscription.plan_id);
    if (!plan) {
      throw new AppError('Plan associated with subscription not found', 400);
    }

    const { targetStatus, updates } = evaluateTransition({
      subscription,
      action,
      plan,
      userRole: req.user.role,
      asOfDate: new Date(),
    });

    // Conditional status update: update WHERE id = ? AND status = <expectedStatus>
    // Prevents race conditions. If row didn't update, another request won the race.
    const result = await subscriptionsRepo.updateStatusConditional(
      subscription.id,
      subscription.status,
      targetStatus,
      updates
    );

    if (!result.success) {
      throw new AppError(
        `Concurrent transition conflict: subscription state changed from '${subscription.status}'`,
        409
      );
    }

    return sendSuccess(res, { subscription: result.subscription }, `Subscription transitioned to '${targetStatus}'`);
  } catch (err) {
    next(err);
  }
}

/**
 * Auto-close: Manually triggered admin job.
 * Closes active subscriptions whose expiry_date is before today AND whose plan has auto_close = true.
 */
async function autoCloseSubscriptions(req, res, next) {
  try {
    const todayStr = toDateOnly(new Date());
    const candidates = await subscriptionsRepo.findAutoCloseCandidates(todayStr);

    const closedIds = [];

    for (const candidate of candidates) {
      const plan = await plansRepo.findById(candidate.plan_id);
      if (plan && shouldAutoClose(plan)) {
        const updateResult = await subscriptionsRepo.updateStatusConditional(
          candidate.id,
          STATUSES.ACTIVE,
          STATUSES.CLOSED
        );
        if (updateResult.success) {
          closedIds.push(candidate.id);
        }
      }
    }

    return sendSuccess(
      res,
      {
        closed_count: closedIds.length,
        closed_ids: closedIds,
      },
      'Auto-close job completed successfully'
    );
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listSubscriptions,
  getSubscription,
  createSubscription,
  updateSubscription,
  transitionSubscription,
  autoCloseSubscriptions,
  generateSubscriptionNumber,
  prepareLines,
  validateCustomer,
};
