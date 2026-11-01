'use strict';

const { getSupabaseAdmin } = require('../lib/supabase');
const AppError = require('../utils/AppError');
const { formatMoney, parseMoney } = require('../utils/money');

function mapLineFromDb(row) {
  if (!row) return null;
  const unitPriceMinor = parseMoney(row.unit_price);
  const varAdjMinor = row.variant_adjustment ? parseMoney(row.variant_adjustment) : 0;
  const qty = parseInt(row.quantity, 10) || 1;
  const computedAmount = row.amount !== undefined && row.amount !== null
    ? formatMoney(parseMoney(row.amount))
    : formatMoney((unitPriceMinor + varAdjMinor) * qty);

  return {
    id: row.id,
    subscription_id: row.subscription_id,
    product_id: row.product_id,
    variant_id: row.variant_id || null,
    quantity: row.quantity,
    unit_price: formatMoney(unitPriceMinor),
    tax_id: row.tax_id || null,
    amount: computedAmount,
    description: row.description || null,
    variant_adjustment: row.variant_adjustment ? formatMoney(varAdjMinor) : '0.00',
    tax_rate_percent: row.tax_rate_percent !== null && row.tax_rate_percent !== undefined ? formatMoney(parseMoney(row.tax_rate_percent)) : '0.00',
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
    description: l.description || null,
    variant_adjustment: l.variant_adjustment ? formatMoney(parseMoney(l.variant_adjustment)) : '0.00',
    tax_rate_percent: l.tax_rate_percent ? formatMoney(parseMoney(l.tax_rate_percent)) : '0.00',
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

