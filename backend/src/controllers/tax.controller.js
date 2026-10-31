'use strict';

const taxesRepo = require('../repositories/taxes.repository');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/response');

async function listTaxes(req, res, next) {
  try {
    const filters = {
      page: req.query.page,
      page_size: req.query.page_size,
      is_active: req.query.is_active !== undefined ? req.query.is_active : req.query.active,
    };

    const result = await taxesRepo.list(filters);
    return sendSuccess(res, result, 'Tax rules retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function getTax(req, res, next) {
  try {
    const tax = await taxesRepo.findById(req.params.id);
    if (!tax) {
      throw new AppError('Tax rule not found', 404);
    }
    return sendSuccess(res, { tax }, 'Tax rule retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function createTax(req, res, next) {
  try {
    const tax = await taxesRepo.create(req.body);
    return sendSuccess(res, { tax }, 'Tax rule created successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function updateTax(req, res, next) {
  try {
    const tax = await taxesRepo.update(req.params.id, req.body);
    return sendSuccess(res, { tax }, 'Tax rule updated successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listTaxes,
  getTax,
  createTax,
  updateTax,
};
