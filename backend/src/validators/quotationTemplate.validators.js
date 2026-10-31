'use strict';

const { z } = require('zod');

const templateLineSchema = z.object({
  product_id: z.string().uuid({ message: 'product_id must be a valid UUID' }),
  variant_id: z.string().uuid({ message: 'variant_id must be a valid UUID' }).nullable().optional(),
  quantity: z.number().int({ message: 'quantity must be an integer' }).min(1, { message: 'quantity must be at least 1' }),
});

const createQuotationTemplateSchema = z.object({
  name: z.string().trim().min(1, { message: 'Template name is required' }).max(200, { message: 'Template name too long' }),
  plan_id: z.string().uuid({ message: 'plan_id must be a valid UUID' }),
  validity_days: z.number().int({ message: 'validity_days must be an integer' }).min(1, { message: 'validity_days must be at least 1' }),
  lines: z.array(templateLineSchema).min(1, { message: 'At least one line is required' }),
});

const updateQuotationTemplateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  plan_id: z.string().uuid().optional(),
  validity_days: z.number().int().min(1).optional(),
  lines: z.array(templateLineSchema).min(1).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

module.exports = {
  createQuotationTemplateSchema,
  updateQuotationTemplateSchema,
  templateLineSchema,
};
