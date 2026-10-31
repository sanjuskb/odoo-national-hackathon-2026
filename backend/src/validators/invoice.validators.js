'use strict';

const { z } = require('zod');

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const idParamSchema = z.object({
  id: z.string().regex(uuidRegex, 'Invalid UUID identifier'),
});

const listInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(['draft', 'confirmed', 'paid', 'cancelled']).optional(),
  customer_id: z.string().regex(uuidRegex, 'Invalid customer UUID').optional(),
  due_before: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'due_before must be YYYY-MM-DD').optional(),
  due_after: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'due_after must be YYYY-MM-DD').optional(),
});

module.exports = {
  idParamSchema,
  listInvoicesQuerySchema,
};
