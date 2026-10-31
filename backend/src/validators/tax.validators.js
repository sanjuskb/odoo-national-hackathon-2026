'use strict';

const { z } = require('zod');

const rateRegex = /^(0|[1-9]\d*)(?:\.\d{1,2})?$/;

const rateSchema = z
  .union([z.string(), z.number()])
  .transform((val) => String(val))
  .refine((val) => rateRegex.test(val), {
    message: 'Tax rate must be a non-negative decimal with at most 2 decimal places',
  })
  .refine((val) => Number(val) >= 0 && Number(val) <= 100, {
    message: 'Tax rate must be between 0.00 and 100.00 percent',
  });

const createTaxSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer'),
    rate_percent: rateSchema.optional(),
    rate: rateSchema.optional(),
    description: z.string().trim().max(500).nullable().optional(),
    is_active: z.boolean().optional().default(true),
  })
  .refine((data) => data.rate_percent !== undefined || data.rate !== undefined, {
    message: 'rate_percent or rate is required',
    path: ['rate_percent'],
  });

const updateTaxSchema = z
  .object({
    name: z.string().trim().min(1, 'Name cannot be empty').max(100).optional(),
    rate_percent: rateSchema.optional(),
    rate: rateSchema.optional(),
    description: z.string().trim().max(500).nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.rate_percent !== undefined ||
      data.rate !== undefined ||
      data.description !== undefined ||
      data.is_active !== undefined,
    {
      message: 'At least one field must be provided for update',
    }
  );

const listTaxesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  page_size: z.coerce.number().int().min(1).max(100).optional().default(20),
  is_active: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((val) => (val === true || val === 'true'))
    .optional(),
  active: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((val) => (val === true || val === 'true'))
    .optional(),
});

module.exports = {
  createTaxSchema,
  updateTaxSchema,
  listTaxesQuerySchema,
};

