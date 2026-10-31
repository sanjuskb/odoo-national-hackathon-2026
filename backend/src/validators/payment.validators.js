'use strict';

const { z } = require('zod');

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const paymentMethodEnum = z.enum([
  'cash',
  'bank_transfer',
  'upi',
  'card',
  'cheque',
  'other',
]);

const createPaymentSchema = z.object({
  amount: z.union([
    z.string().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a positive decimal string with up to 2 decimal places'),
    z.number().positive('Amount must be positive'),
  ]),
  payment_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/, 'payment_date must be YYYY-MM-DD or ISO string')
    .optional(),
  method: paymentMethodEnum,
  reference: z.string().max(100).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  invoice_id: z.string().regex(uuidRegex, 'Invalid invoice UUID').optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date_from must be YYYY-MM-DD').optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date_to must be YYYY-MM-DD').optional(),
});

module.exports = {
  paymentMethodEnum,
  createPaymentSchema,
  listPaymentsQuerySchema,
};
