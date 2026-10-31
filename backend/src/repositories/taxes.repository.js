'use strict';

const { getSupabaseAdmin } = require('../lib/supabase');
const AppError = require('../utils/AppError');
const { formatMoney, parseMoney } = require('../utils/money');

function mapTaxFromDb(row) {
  if (!row) return null;
  const rateStr = formatMoney(parseMoney(row.rate_percent !== undefined && row.rate_percent !== null ? row.rate_percent : (row.rate !== undefined && row.rate !== null ? row.rate : 0)));
  return {
    id: row.id,
    name: row.name,
    rate_percent: rateStr,
    rate: rateStr,
    description: row.description || null,
    is_active: row.is_active !== undefined && row.is_active !== null ? Boolean(row.is_active) : true,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function findById(id, client = getSupabaseAdmin()) {
  const { data, error } = await client
    .from('tax_rules')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to fetch tax rule', 500);
  }

  return mapTaxFromDb(data);
}

async function list({ page = 1, page_size = 20, is_active } = {}, client = getSupabaseAdmin()) {
  let query = client
    .from('tax_rules')
    .select('*', { count: 'exact' });

  if (is_active !== undefined) {
    query = query.eq('is_active', Boolean(is_active));
  }

  const offset = (page - 1) * page_size;
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + page_size - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new AppError('Failed to list tax rules', 500);
  }

  return {
    items: (data || []).map(mapTaxFromDb),
    pagination: {
      page: parseInt(page, 10),
      page_size: parseInt(page_size, 10),
      total: count !== null && count !== undefined ? count : (data || []).length,
    },
  };
}

async function create(taxData, client = getSupabaseAdmin()) {
  const rateVal = taxData.rate_percent !== undefined ? taxData.rate_percent : taxData.rate;
  const rateStr = formatMoney(parseMoney(rateVal));

  const row = {
    name: taxData.name,
    rate_percent: rateStr,
    description: taxData.description || null,
    is_active: taxData.is_active !== undefined ? Boolean(taxData.is_active) : true,
  };

  const { data, error } = await client
    .from('tax_rules')
    .insert([row])
    .select()
    .single();

  if (error) {
    throw new AppError('Failed to create tax rule', 500);
  }

  return mapTaxFromDb(data);
}

async function update(id, updates, client = getSupabaseAdmin()) {
  const patch = {};

  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.rate_percent !== undefined || updates.rate !== undefined) {
    const rateVal = updates.rate_percent !== undefined ? updates.rate_percent : updates.rate;
    const rateStr = formatMoney(parseMoney(rateVal));
    patch.rate_percent = rateStr;
  }
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.is_active !== undefined) patch.is_active = Boolean(updates.is_active);

  patch.updated_at = new Date().toISOString();

  const { data, error } = await client
    .from('tax_rules')
    .update(patch)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to update tax rule', 500);
  }

  if (!data) {
    throw new AppError('Tax rule not found', 404);
  }

  return mapTaxFromDb(data);
}

module.exports = {
  findById,
  list,
  create,
  update,
  mapTaxFromDb,
};

