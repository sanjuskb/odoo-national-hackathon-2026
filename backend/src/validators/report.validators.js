'use strict';

const { z } = require('zod');

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const paymentMethodEnum = z.enum([
  'cash',
  'bank_transfer',
  'upi',
  'card',
  'cheque',
  'other',
]);

const reportSummaryQuerySchema = z
  .object({
    from: z.string().regex(dateRegex, 'from must be in YYYY-MM-DD format').optional(),
    to: z.string().regex(dateRegex, 'to must be in YYYY-MM-DD format').optional(),
    customer_id: z.string().regex(uuidRegex, 'customer_id must be a valid UUID').optional(),
    plan_id: z.string().regex(uuidRegex, 'plan_id must be a valid UUID').optional(),
    today: z.string().regex(dateRegex, 'today must be in YYYY-MM-DD format').optional(),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return data.from <= data.to;
      }
      return true;
    },
    {
      message: '"from" date must be on or before "to" date',
      path: ['from'],
    }
  );

const overdueInvoicesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    page_size: z.coerce.number().int().min(1).max(100).optional(),
    customer_id: z.string().regex(uuidRegex, 'customer_id must be a valid UUID').optional(),
    plan_id: z.string().regex(uuidRegex, 'plan_id must be a valid UUID').optional(),
    from: z.string().regex(dateRegex, 'from must be in YYYY-MM-DD format').optional(),
    to: z.string().regex(dateRegex, 'to must be in YYYY-MM-DD format').optional(),
    today: z.string().regex(dateRegex, 'today must be in YYYY-MM-DD format').optional(),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return data.from <= data.to;
      }
      return true;
    },
    {
      message: '"from" date must be on or before "to" date',
      path: ['from'],
    }
  );

const paymentsReportQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    page_size: z.coerce.number().int().min(1).max(100).optional(),
    from: z.string().regex(dateRegex, 'from must be in YYYY-MM-DD format').optional(),
    to: z.string().regex(dateRegex, 'to must be in YYYY-MM-DD format').optional(),
    method: paymentMethodEnum.optional(),
    invoice_id: z.string().regex(uuidRegex, 'invoice_id must be a valid UUID').optional(),
    customer_id: z.string().regex(uuidRegex, 'customer_id must be a valid UUID').optional(),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return data.from <= data.to;
      }
      return true;
    },
    {
      message: '"from" date must be on or before "to" date',
      path: ['from'],
    }
  );

const subscriptionsReportQuerySchema = z.object({
  customer_id: z.string().regex(uuidRegex, 'customer_id must be a valid UUID').optional(),
  plan_id: z.string().regex(uuidRegex, 'plan_id must be a valid UUID').optional(),
  group_by: z.enum(['plan']).optional(),
});

module.exports = {
  reportSummaryQuerySchema,
  overdueInvoicesQuerySchema,
  paymentsReportQuerySchema,
  subscriptionsReportQuerySchema,
};
