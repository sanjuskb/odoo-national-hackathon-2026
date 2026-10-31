'use strict';

const quotationTemplatesRepo = require('../repositories/quotationTemplates.repository');
const plansRepo = require('../repositories/plans.repository');
const productsRepo = require('../repositories/products.repository');
const variantsRepo = require('../repositories/variants.repository');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/response');

async function validateLines(lines) {
  if (!Array.isArray(lines)) return;
  for (const line of lines) {
    const product = await productsRepo.findById(line.product_id);
    if (!product) {
      throw new AppError(`Product '${line.product_id}' not found`, 400);
    }
    if (line.variant_id) {
      const variant = await variantsRepo.findById(line.variant_id);
      if (!variant) {
        throw new AppError(`Variant '${line.variant_id}' not found`, 400);
      }
      if (variant.product_id !== line.product_id) {
        throw new AppError(`Variant '${line.variant_id}' does not belong to product '${line.product_id}'`, 400);
      }
    }
  }
}

async function listTemplates(req, res, next) {
  try {
    const result = await quotationTemplatesRepo.list(req.query);
    return sendSuccess(res, result, 'Quotation templates retrieved');
  } catch (err) {
    next(err);
  }
}

async function getTemplate(req, res, next) {
  try {
    const template = await quotationTemplatesRepo.findById(req.params.id);
    if (!template) {
      throw new AppError('Quotation template not found', 404);
    }
    return sendSuccess(res, { template }, 'Quotation template retrieved');
  } catch (err) {
    next(err);
  }
}

async function createTemplate(req, res, next) {
  try {
    const { name, plan_id, validity_days, lines } = req.body;

    const plan = await plansRepo.findById(plan_id);
    if (!plan) {
      throw new AppError(`Plan '${plan_id}' not found`, 400);
    }

    await validateLines(lines);

    const template = await quotationTemplatesRepo.create({
      name,
      plan_id,
      validity_days,
      lines,
    });

    return sendSuccess(res, { template }, 'Quotation template created successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function updateTemplate(req, res, next) {
  try {
    const existing = await quotationTemplatesRepo.findById(req.params.id);
    if (!existing) {
      throw new AppError('Quotation template not found', 404);
    }

    const { name, plan_id, validity_days, lines } = req.body;

    if (plan_id) {
      const plan = await plansRepo.findById(plan_id);
      if (!plan) {
        throw new AppError(`Plan '${plan_id}' not found`, 400);
      }
    }

    if (lines) {
      await validateLines(lines);
    }

    const updated = await quotationTemplatesRepo.update(
      req.params.id,
      { name, plan_id, validity_days },
      lines || null
    );

    return sendSuccess(res, { template: updated }, 'Quotation template updated successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  validateLines,
};

