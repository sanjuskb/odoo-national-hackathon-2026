'use strict';

const { z } = require('zod');

const moneyRegex = /^(0|[1-9]\d*)(?:\.\d{1,2})?$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createDiscountSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    type: z.enum(['fixed', 'percentage']).optional(),
    kind: z.enum(['fixed', 'percentage']).optional(),
    value: z
      .union([z.string(), z.number()])
      .transform((val) => String(val))
      .refine((val) => moneyRegex.test(val), {
        message: 'Discount value must be a valid non-negative decimal with at most 2 decimal places',
      }),
    min_amount: z
      .union([z.string(), z.number()])
      .transform((val) => String(val))
      .refine((val) => moneyRegex.test(val), {
        message: 'min_amount must be a valid non-negative decimal with at most 2 decimal places',
      })
      .nullable()
      .optional(),
    min_quantity: z.coerce.number().int().min(1, 'min_quantity must be at least 1').nullable().optional(),
    start_date: z
      .string()
      .regex(dateRegex, 'start_date must be in YYYY-MM-DD format')
      .nullable()
      .optional(),
    valid_from: z
      .string()
      .regex(dateRegex, 'valid_from must be in YYYY-MM-DD format')
      .nullable()
      .optional(),
    end_date: z
      .string()
      .regex(dateRegex, 'end_date must be in YYYY-MM-DD format')
      .nullable()
      .optional(),
    valid_until: z
      .string()
      .regex(dateRegex, 'valid_until must be in YYYY-MM-DD format')
      .nullable()
      .optional(),
    max_uses: z.coerce.number().int().min(1, 'max_uses must be a positive integer').nullable().optional(),
    scope: z.enum(['product', 'subscription']).optional().default('subscription'),
    product_ids: z.array(z.string().regex(uuidRegex, 'Invalid product UUID')).optional().default([]),
    is_active: z.boolean().optional().default(true),
  })
  .refine((data) => data.type !== undefined || data.kind !== undefined, {
    message: 'type or kind is required',
    path: ['type'],
  })
  .refine(
    (data) => {
      const k = data.kind || data.type;
      const num = Number(data.value);
      if (k === 'percentage') {
        return num > 0 && num <= 100;
      }
      return num > 0;
    },
    {
      message: 'Percentage discount must be 0 < value <= 100; Fixed discount must be value > 0',
      path: ['value'],
    }
  )
  .refine(
    (data) => {
      const start = data.start_date || data.valid_from;
      const end = data.end_date || data.valid_until;
      if (start && end) {
        return new Date(end).getTime() >= new Date(start).getTime();
      }
      return true;
    },
    {
      message: 'end_date must be on or after start_date',
      path: ['end_date'],
    }
  )
  .refine(
    (data) => {
      if (data.scope === 'product') {
        return Array.isArray(data.product_ids) && data.product_ids.length > 0;
      }
      return !data.product_ids || data.product_ids.length === 0;
    },
    {
      message: 'Product-scoped discount requires at least one product_id; subscription-scoped discount must have none',
      path: ['product_ids'],
    }
  );

const updateDiscountSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    type: z.enum(['fixed', 'percentage']).optional(),
    kind: z.enum(['fixed', 'percentage']).optional(),
    value: z
      .union([z.string(), z.number()])
      .transform((val) => String(val))
      .refine((val) => moneyRegex.test(val), {
        message: 'Discount value must be a valid decimal with at most 2 decimal places',
      })
      .optional(),
    min_amount: z
      .union([z.string(), z.number()])
      .transform((val) => String(val))
      .refine((val) => moneyRegex.test(val))
      .nullable()
      .optional(),
    min_quantity: z.coerce.number().int().min(1).nullable().optional(),
    start_date: z.string().regex(dateRegex).nullable().optional(),
    valid_from: z.string().regex(dateRegex).nullable().optional(),
    end_date: z.string().regex(dateRegex).nullable().optional(),
    valid_until: z.string().regex(dateRegex).nullable().optional(),
    max_uses: z.coerce.number().int().min(1).nullable().optional(),
    scope: z.enum(['product', 'subscription']).optional(),
    product_ids: z.array(z.string().regex(uuidRegex)).optional(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: 'At least one field must be provided for update',
    }
  );

const listDiscountsQuerySchema = z.object({
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
  createDiscountSchema,
  updateDiscountSchema,
  listDiscountsQuerySchema,
};

