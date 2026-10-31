const { z } = require('zod');
const { parseMoney } = require('../utils/money');

// Money field validator ensuring non-negative and max 2 decimal places
const moneyField = z.union([z.string(), z.number()]).refine((val) => {
  try {
    parseMoney(val);
    return true;
  } catch (_e) {
    return false;
  }
}, {
  message: 'Must be a valid non-negative money amount with at most 2 decimal places',
});

const createProductSchema = z.object({
  name: z.string({ required_error: 'Product name is required' }).trim().min(1, 'Product name cannot be empty').max(200),
  type: z.string().trim().min(1).max(50).default('service'),
  sales_price: moneyField,
  cost_price: moneyField,
  notes: z.string().max(2000).optional().nullable(),
});

const updateProductSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  type: z.string().trim().min(1).max(50).optional(),
  sales_price: moneyField.optional(),
  cost_price: moneyField.optional(),
  notes: z.string().max(2000).optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

const createVariantSchema = z.object({
  name: z.string({ required_error: 'Variant name is required' }).trim().min(1, 'Variant name cannot be empty').max(200),
  price_adjustment: moneyField.default('0.00'),
});

const updateVariantSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  price_adjustment: moneyField.optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  createVariantSchema,
  updateVariantSchema,
};
