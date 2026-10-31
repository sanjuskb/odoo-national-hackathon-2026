'use strict';

const { getSupabaseAdmin } = require('../lib/supabase');
const AppError = require('../utils/AppError');
const { formatMoney, parseMoney } = require('../utils/money');

function mapLineFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    subscription_id: row.subscription_id,
    product_id: row.product_id,
    variant_id: row.variant_id || null,
    quantity: row.quantity,
    unit_price: formatMoney(parseMoney(row.unit_price)),
    tax_id: row.tax_id || null,
    amount: formatMoney(parseMoney(row.amount)),
    description: row.description || null,
    variant_adjustment: row.variant_adjustment ? formatMoney(parseMoney(row.variant_adjustment)) : null,
    tax_rate_percent: row.tax_rate_percent !== null && row.tax_rate_percent !== undefined ? String(row.tax_rate_percent) : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function findBySubscriptionId(subscriptionId, client = getSupabaseAdmin()) {
  const { data, error } = await client
    .from('subscription_lines')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new AppError('Failed to fetch subscription lines', 500);
  }

  return (data || []).map(mapLineFromDb);
}

async function createLines(subscriptionId, lines = [], client = getSupabaseAdmin()) {
  if (!Array.isArray(lines) || lines.length === 0) {
    return [];
  }

  const rows = lines.map((l) => ({
    subscription_id: subscriptionId,
    product_id: l.product_id,
    variant_id: l.variant_id || null,
    quantity: parseInt(l.quantity, 10),
    unit_price: formatMoney(parseMoney(l.unit_price)),
    tax_id: l.tax_id || null,
    amount: formatMoney(parseMoney(l.amount)),
    description: l.description || null,
    variant_adjustment: l.variant_adjustment ? formatMoney(parseMoney(l.variant_adjustment)) : null,
    tax_rate_percent: l.tax_rate_percent || null,
  }));

  const { data, error } = await client
    .from('subscription_lines')
    .insert(rows)
    .select();

  if (error) {
    if (error.code === '23503') {
      throw new AppError('Referenced product or variant does not exist', 400);
    }
    throw new AppError('Failed to create subscription lines', 500);
  }

  return (data || []).map(mapLineFromDb);
}

async function replaceLines(subscriptionId, lines = [], client = getSupabaseAdmin()) {
  // Delete existing lines
  await client
    .from('subscription_lines')
    .delete()
    .eq('subscription_id', subscriptionId);

  return createLines(subscriptionId, lines, client);
}

module.exports = {
  findBySubscriptionId,
  createLines,
  replaceLines,
  mapLineFromDb,
};
