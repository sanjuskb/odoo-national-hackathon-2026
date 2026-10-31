const plansRepository = require('../repositories/plans.repository');
const productsRepository = require('../repositories/products.repository');
const planService = require('../services/plan.service');
const { successResponse } = require('../utils/response');
const AppError = require('../utils/AppError');

async function listPlans(req, res, next) {
  try {
    const { page, page_size, frequency, product_id, available } = req.query;
    const isCustomer = req.user?.role === 'customer';
    const filterAvailable = isCustomer || available === 'true';

    const result = await plansRepository.list({
      page,
      page_size,
      frequency,
      product_id,
      availableOnly: filterAvailable,
    });

    // Defense-in-depth: if customer, ensure no expired or future plans leak through
    if (isCustomer) {
      result.items = result.items.filter((plan) => planService.isPlanAvailable(plan));
      result.pagination.total_items = result.items.length;
    }

    return successResponse(res, 200, result, 'Plans retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function getPlan(req, res, next) {
  try {
    const plan = await plansRepository.getById(req.params.id);
    const isCustomer = req.user?.role === 'customer';

    // Visibility constraint: customers requesting unavailable plans receive 404
    if (isCustomer && !planService.isPlanAvailable(plan)) {
      throw new AppError('Plan not found', 404, 'NOT_FOUND');
    }

    return successResponse(res, 200, { plan }, 'Plan retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function createPlan(req, res, next) {
  try {
    // Verify parent product exists
    await productsRepository.getById(req.body.product_id);

    const created = await plansRepository.create(req.body);
    return successResponse(res, 201, { plan: created }, 'Plan created successfully');
  } catch (err) {
    next(err);
  }
}

async function updatePlan(req, res, next) {
  try {
    const planId = req.params.id;
    const existingPlan = await plansRepository.getById(planId);

    // Merge existing plan with requested updates for cross-field re-validation
    const merged = { ...existingPlan, ...req.body };

    // Validate date boundary invariant on merged result
    if (merged.available_from && merged.available_until) {
      const fromDate = new Date(merged.available_from);
      const untilDate = new Date(merged.available_until);
      if (untilDate < fromDate) {
        throw new AppError('available_until must be on or after available_from', 400, 'VALIDATION_ERROR');
      }
    }

    // Validate min_quantity on merged result
    if (merged.min_quantity !== undefined && parseInt(merged.min_quantity, 10) < 1) {
      throw new AppError('min_quantity must be an integer >= 1', 400, 'VALIDATION_ERROR');
    }

    // If product_id is being changed, ensure new parent product exists
    if (req.body.product_id && req.body.product_id !== existingPlan.product_id) {
      await productsRepository.getById(req.body.product_id);
    }

    const updated = await plansRepository.update(planId, req.body);
    return successResponse(res, 200, { plan: updated }, 'Plan updated successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listPlans,
  getPlan,
  createPlan,
  updatePlan,
};
