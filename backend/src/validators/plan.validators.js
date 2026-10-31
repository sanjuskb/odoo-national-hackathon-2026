const { z } = require('zod');
const { parseMoney } = require('../utils/money');

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

const isoDateString = z.string().datetime({ offset: true }).or(
  z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/, 'Must be a valid ISO 8601 date string')
);

const createPlanSchema = z.object({
  product_id: z.string({ required_error: 'product_id is required' }).uuid('product_id must be a valid UUID').or(z.string().min(1)),
  price: moneyField,
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly'], {
    errorMap: () => ({ message: "Frequency must be one of: 'daily', 'weekly', 'monthly', 'yearly'" }),
  }),
  min_quantity: z.coerce.number().int().min(1, 'min_quantity must be an integer >= 1').default(1),
  available_from: isoDateString.optional().nullable(),
  available_until: isoDateString.optional().nullable(),
  auto_close: z.boolean().default(false),
  allow_early_close: z.boolean().default(false),
  allow_pause: z.boolean().default(false),
  allow_renew: z.boolean().default(false),
}).refine((data) => {
  if (data.available_from && data.available_until) {
    return new Date(data.available_until) >= new Date(data.available_from);
  }
  return true;
}, {
  message: 'available_until must be on or after available_from',
  path: ['available_until'],
});

const updatePlanSchema = z.object({
  product_id: z.string().uuid().or(z.string().min(1)).optional(),
  price: moneyField.optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  min_quantity: z.coerce.number().int().min(1, 'min_quantity must be an integer >= 1').optional(),
  available_from: isoDateString.optional().nullable(),
  available_until: isoDateString.optional().nullable(),
  auto_close: z.boolean().optional(),
  allow_early_close: z.boolean().optional(),
  allow_pause: z.boolean().optional(),
  allow_renew: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

module.exports = {
  createPlanSchema,
  updatePlanSchema,
};
