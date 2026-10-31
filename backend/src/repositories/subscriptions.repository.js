'use strict';

const { getSupabaseAdmin } = require('../lib/supabase');
const AppError = require('../utils/AppError');
const { formatMoney, parseMoney, addMoney } = require('../utils/money');
const subscriptionLinesRepo = require('./subscriptionLines.repository');

function mapSubscriptionFromDb(row, lines = []) {
  if (!row) return null;

  // Compute subtotal from line amounts in integer minor units
  let subtotalMinor = 0;
  for (const line of lines) {
    if (line.amount) {
      subtotalMinor = addMoney(subtotalMinor, parseMoney(line.amount));
    }
  }

  return {
    id: row.id,
    subscription_number: row.subscription_number,
    customer_id: row.customer_id,
    plan_id: row.plan_id,
    start_date: row.start_date,
    expiry_date: row.expiry_date,
    payment_terms: row.payment_terms,
    status: row.status,
    valid_until: row.valid_until || null,
    template_id: row.template_id || null,
    next_billing_date: row.next_billing_date || null,
    billing_anchor_date: row.billing_anchor_date || null,
    is_paused: Boolean(row.is_paused !== undefined ? row.is_paused : (row.status === 'paused')),
    subtotal: formatMoney(subtotalMinor),
    created_at: row.created_at,
    updated_at: row.updated_at,
    lines,
  };
}

async function list({ page = 1, limit = 20, status = null, customer_id = null, plan_id = null, search = null } = {}, client = getSupabaseAdmin()) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  let query = client
    .from('subscriptions')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }
  if (customer_id) {
    query = query.eq('customer_id', customer_id);
  }
  if (plan_id) {
    query = query.eq('plan_id', plan_id);
  }
  if (search && search.trim()) {
    query = query.ilike('subscription_number', `%${search.trim()}%`);
  }

  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) {
    throw new AppError('Failed to fetch subscriptions', 500);
  }

  const items = (data || []).map((r) => mapSubscriptionFromDb(r, []));
  const total = count ?? items.length;

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
}

async function findById(id, client = getSupabaseAdmin()) {
  const { data: sub, error } = await client
    .from('subscriptions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to fetch subscription', 500);
  }
  if (!sub) {
    return null;
  }

  const lines = await subscriptionLinesRepo.findBySubscriptionId(id, client);
  return mapSubscriptionFromDb(sub, lines);
}

async function create(data, client = getSupabaseAdmin()) {
  const payload = {
    subscription_number: data.subscription_number,
    customer_id: data.customer_id,
    plan_id: data.plan_id,
    start_date: data.start_date,
    expiry_date: data.expiry_date,
    payment_terms: data.payment_terms,
    status: data.status || 'draft',
    valid_until: data.valid_until || null,
    template_id: data.template_id || null,
    next_billing_date: data.next_billing_date || null,
    billing_anchor_date: data.billing_anchor_date || null,
    is_paused: Boolean(data.is_paused),
  };

  const { data: sub, error } = await client
    .from('subscriptions')
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      const err = new AppError('Duplicate subscription number', 409);
      err.code = '23505';
      throw err;
    }
    if (error.code === '23503') {
      throw new AppError('Referenced customer or plan does not exist', 400);
    }
    throw new AppError('Failed to create subscription', 500);
  }

  return mapSubscriptionFromDb(sub, []);
}

async function update(id, fields = {}, client = getSupabaseAdmin()) {
  const allowed = [
    'customer_id',
    'plan_id',
    'start_date',
    'expiry_date',
    'payment_terms',
    'valid_until',
    'template_id',
    'is_paused',
    'next_billing_date',
    'billing_anchor_date',
  ];

  const payload = {};
  for (const k of allowed) {
    if (fields[k] !== undefined) {
      payload[k] = fields[k];
    }
  }

  if (Object.keys(payload).length === 0) {
    return findById(id, client);
  }

  payload.updated_at = new Date().toISOString();

  const { data: updated, error } = await client
    .from('subscriptions')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23503') {
      throw new AppError('Referenced customer or plan does not exist', 400);
    }
    throw new AppError('Failed to update subscription', 500);
  }

  const lines = await subscriptionLinesRepo.findBySubscriptionId(id, client);
  return mapSubscriptionFromDb(updated, lines);
}

/**
 * Conditional status update: update status WHERE id = ? AND status = <expectedStatus>
 * Prevents race conditions. Returns { success: boolean, subscription: object|null }
 */
async function updateStatusConditional(id, expectedStatus, newStatus, extraFields = {}, client = getSupabaseAdmin()) {
  const payload = {
    status: newStatus,
    ...extraFields,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from('subscriptions')
    .update(payload)
    .eq('id', id)
    .eq('status', expectedStatus)
    .select();

  if (error) {
    throw new AppError('Failed to update subscription status', 500);
  }

  if (!data || data.length === 0) {
    return { success: false, subscription: null };
  }

  const lines = await subscriptionLinesRepo.findBySubscriptionId(id, client);
  return {
    success: true,
    subscription: mapSubscriptionFromDb(data[0], lines),
  };
}

async function findAutoCloseCandidates(todayDate, client = getSupabaseAdmin()) {
  const { data, error } = await client
    .from('subscriptions')
    .select('*')
    .eq('status', 'active')
    .lt('expiry_date', todayDate);

  if (error) {
    throw new AppError('Failed to fetch auto-close candidates', 500);
  }

  return data || [];
}

module.exports = {
  list,
  findById,
  create,
  update,
  updateStatusConditional,
  findAutoCloseCandidates,
  mapSubscriptionFromDb,
};

