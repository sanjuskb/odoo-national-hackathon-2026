'use strict';

const { z } = require('zod');

const dateStringSchema = z.string().refine(
  (val) => {
    const d = new Date(val);
    return !Number.isNaN(d.getTime());
  },
  { message: 'Must be a valid ISO date or YYYY-MM-DD string' }
);

const subscriptionLineInputSchema = z.object({
  product_id: z.string().uuid({ message: 'product_id must be a valid UUID' }),
  variant_id: z.string().uuid({ message: 'variant_id must be a valid UUID' }).nullable().optional(),
  quantity: z.number().int({ message: 'quantity must be an integer' }).min(1, { message: 'quantity must be at least 1' }),
  tax_id: z.string().uuid().nullable().optional(),
  unit_price: z.string().optional(), // Ignored server-side
});

const createSubscriptionSchema = z.object({
  customer_id: z.string().uuid({ message: 'customer_id must be a valid UUID' }),
  plan_id: z.string().uuid({ message: 'plan_id must be a valid UUID' }).optional(),
  start_date: dateStringSchema,
  expiry_date: dateStringSchema,
  payment_terms: z.string().trim().min(1, { message: 'payment_terms is required' }).max(50),
  template_id: z.string().uuid({ message: 'template_id must be a valid UUID' }).optional(),
  valid_until: dateStringSchema.optional(),
  lines: z.array(subscriptionLineInputSchema).optional(),
}).refine(
  (data) => {
    // If template_id is given, plan_id and lines must NOT be sent
    if (data.template_id) {
      if (data.plan_id !== undefined || (data.lines !== undefined && data.lines.length > 0)) {
        return false;
      }
      return true;
    }
    // If template_id is NOT given, plan_id and lines are required
    return Boolean(data.plan_id) && Array.isArray(data.lines) && data.lines.length > 0;
  },
  {
    message: 'Either provide template_id without plan_id/lines, or provide plan_id and non-empty lines',
    path: ['template_id'],
  }
).refine(
  (data) => {
    const start = new Date(data.start_date).getTime();
    const expiry = new Date(data.expiry_date).getTime();
    return expiry >= start;
  },
  {
    message: 'expiry_date must be on or after start_date',
    path: ['expiry_date'],
  }
);

const updateSubscriptionSchema = z.object({
  status: z.any().optional(),
  subscription_number: z.any().optional(),
  number: z.any().optional(),
  next_billing_date: z.any().optional(),
  customer_id: z.string().uuid().optional(),
  plan_id: z.string().uuid().optional(),
  start_date: dateStringSchema.optional(),
  expiry_date: dateStringSchema.optional(),
  payment_terms: z.string().trim().min(1).max(50).optional(),
  valid_until: dateStringSchema.optional(),
  lines: z.array(subscriptionLineInputSchema).min(1).optional(),
}).refine(
  (data) => {
    // Prohibit modifying status, subscription_number, number, or next_billing_date via PATCH
    return (
      data.status === undefined &&
      data.subscription_number === undefined &&
      data.number === undefined &&
      data.next_billing_date === undefined
    );
  },
  {
    message: 'Cannot modify status, subscription number, or next_billing_date via PATCH',
  }
).refine(
  (data) => {
    const keys = Object.keys(data).filter(
      (k) => !['status', 'subscription_number', 'number', 'next_billing_date'].includes(k) && data[k] !== undefined
    );
    return keys.length > 0;
  },
  {
    message: 'At least one editable field must be provided',
  }
);

const transitionSubscriptionSchema = z.object({
  action: z.enum(
    ['send_quotation', 'confirm', 'activate', 'close', 'pause', 'resume', 'renew'],
    { message: 'Invalid transition action' }
  ),
});

module.exports = {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  transitionSubscriptionSchema,
  subscriptionLineInputSchema,
};

