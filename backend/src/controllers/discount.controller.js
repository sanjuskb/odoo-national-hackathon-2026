'use strict';

const discountsRepo = require('../repositories/discounts.repository');
const productsRepo = require('../repositories/products.repository');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/response');

async function listDiscounts(req, res, next) {
  try {
    const filters = {
      page: req.query.page,
      page_size: req.query.page_size,
      is_active: req.query.is_active !== undefined ? req.query.is_active : req.query.active,
    };

    const result = await discountsRepo.list(filters);
    return sendSuccess(res, result, 'Discount rules retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function getDiscount(req, res, next) {
  try {
    const discount = await discountsRepo.findById(req.params.id);
    if (!discount) {
      throw new AppError('Discount rule not found', 404);
    }
    return sendSuccess(res, { discount }, 'Discount rule retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function createDiscount(req, res, next) {
  try {
    const payload = { ...req.body };
    delete payload.used_count; // Invariant: used_count is never client-writable

    // Validate referenced products exist
    if (payload.scope === 'product' && Array.isArray(payload.product_ids)) {
      for (const prodId of payload.product_ids) {
        const prod = await productsRepo.findById(prodId);
        if (!prod) {
          throw new AppError(`Product '${prodId}' not found`, 400);
        }
      }
    }

    const discount = await discountsRepo.create(payload);
    return sendSuccess(res, { discount }, 'Discount rule created successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function updateDiscount(req, res, next) {
  try {
    const existing = await discountsRepo.findById(req.params.id);
    if (!existing) {
      throw new AppError('Discount rule not found', 404);
    }

    const payload = { ...req.body };
    delete payload.used_count; // Invariant: used_count is never client-writable

    // Re-validation against merged state
    if (payload.max_uses !== undefined && payload.max_uses !== null) {
      if (payload.max_uses < existing.used_count) {
        throw new AppError(
          `max_uses (${payload.max_uses}) cannot be less than current used_count (${existing.used_count})`,
          400
        );
      }
    }

    const newStart = payload.start_date || payload.valid_from || existing.start_date;
    const newEnd = payload.end_date || payload.valid_until || existing.end_date;
    if (newStart && newEnd) {
      if (new Date(newEnd).getTime() < new Date(newStart).getTime()) {
        throw new AppError('end_date must be on or after start_date', 400);
      }
    }

    const newScope = payload.scope || existing.scope;
    const newProductIds = payload.product_ids !== undefined ? payload.product_ids : existing.product_ids;

    if (newScope === 'product') {
      if (!Array.isArray(newProductIds) || newProductIds.length === 0) {
        throw new AppError('Product-scoped discount requires at least one product_id', 400);
      }
      for (const prodId of newProductIds) {
        const prod = await productsRepo.findById(prodId);
        if (!prod) {
          throw new AppError(`Product '${prodId}' not found`, 400);
        }
      }
    } else if (newScope === 'subscription' && newProductIds && newProductIds.length > 0) {
      throw new AppError('Subscription-scoped discount must not have product_ids', 400);
    }

    const updated = await discountsRepo.update(existing.id, payload);
    return sendSuccess(res, { discount: updated }, 'Discount rule updated successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listDiscounts,
  getDiscount,
  createDiscount,
  updateDiscount,
};

