'use strict';

const { getSupabaseAdmin } = require('../lib/supabase');
const AppError = require('../utils/AppError');
const { formatMoney, parseMoney } = require('../utils/money');
const { toDateOnly } = require('../utils/dates');

function mapDiscountFromDb(row, productIds = []) {
  if (!row) return null;
  const kind = row.kind || row.type || 'percentage';
  const val = formatMoney(parseMoney(row.value));
  const minAmt = row.min_amount !== null && row.min_amount !== undefined ? formatMoney(parseMoney(row.min_amount)) : null;
  const minQty = row.min_quantity !== null && row.min_quantity !== undefined ? parseInt(row.min_quantity, 10) : null;
  const start = row.valid_from || row.start_date || null;
  const end = row.valid_until || row.end_date || null;
  const maxUses = row.max_uses !== null && row.max_uses !== undefined ? parseInt(row.max_uses, 10) : null;

  return {
    id: row.id,
    name: row.name || 'Discount',
    type: kind,
    kind,
    value: val,
    scope: row.scope || 'subscription',
    min_amount: minAmt,
    min_quantity: minQty,
    start_date: start ? toDateOnly(start) : null,
    valid_from: start ? toDateOnly(start) : null,
    end_date: end ? toDateOnly(end) : null,
    valid_until: end ? toDateOnly(end) : null,
    max_uses: maxUses,
    used_count: parseInt(row.used_count, 10) || 0,
    is_active: row.is_active !== undefined && row.is_active !== null ? Boolean(row.is_active) : true,
    product_ids: Array.isArray(productIds) ? productIds : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function findById(id, client = getSupabaseAdmin()) {
  const { data, error } = await client
    .from('discount_rules')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to fetch discount rule', 500);
  }

  if (!data) return null;

  let productIds = [];
  if (data.scope === 'product') {
    const { data: mappings, error: mapErr } = await client
      .from('discount_product_mappings')
      .select('product_id')
      .eq('discount_rule_id', id);

    if (!mapErr && mappings) {
      productIds = mappings.map((m) => m.product_id);
    }
  }

  return mapDiscountFromDb(data, productIds);
}

async function list({ page = 1, page_size = 20, is_active } = {}, client = getSupabaseAdmin()) {
  let query = client
    .from('discount_rules')
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
    throw new AppError('Failed to list discount rules', 500);
  }

  const items = data || [];
  const productScopedIds = items.filter((d) => d.scope === 'product').map((d) => d.id);

  let mappingsMap = new Map();
  if (productScopedIds.length > 0) {
    const { data: mappings } = await client
      .from('discount_product_mappings')
      .select('discount_rule_id, product_id')
      .in('discount_rule_id', productScopedIds);

    if (mappings) {
      for (const m of mappings) {
        if (!mappingsMap.has(m.discount_rule_id)) {
          mappingsMap.set(m.discount_rule_id, []);
        }
        mappingsMap.get(m.discount_rule_id).push(m.product_id);
      }
    }
  }

  return {
    items: items.map((row) => mapDiscountFromDb(row, mappingsMap.get(row.id) || [])),
    pagination: {
      page: parseInt(page, 10),
      page_size: parseInt(page_size, 10),
      total: count !== null && count !== undefined ? count : items.length,
    },
  };
}

async function create(discountData, client = getSupabaseAdmin()) {
  const kind = discountData.kind || discountData.type || 'percentage';
  const val = formatMoney(parseMoney(discountData.value));
  const minAmt = discountData.min_amount !== undefined && discountData.min_amount !== null
    ? formatMoney(parseMoney(discountData.min_amount))
    : null;
  const start = discountData.start_date || discountData.valid_from || null;
  const end = discountData.end_date || discountData.valid_until || null;
  const maxUses = discountData.max_uses !== undefined && discountData.max_uses !== null
    ? parseInt(discountData.max_uses, 10)
    : null;
  const minQty = discountData.min_quantity !== undefined && discountData.min_quantity !== null
    ? parseInt(discountData.min_quantity, 10)
    : null;

  const row = {
    name: discountData.name,
    kind,
    type: kind,
    value: val,
    scope: discountData.scope || 'subscription',
    min_amount: minAmt,
    min_quantity: minQty,
    valid_from: start ? toDateOnly(start) : null,
    valid_until: end ? toDateOnly(end) : null,
    max_uses: maxUses,
    used_count: 0,
    is_active: discountData.is_active !== undefined ? Boolean(discountData.is_active) : true,
  };

  const { data, error } = await client
    .from('discount_rules')
    .insert([row])
    .select()
    .single();

  if (error) {
    throw new AppError('Failed to create discount rule', 500);
  }

  let productIds = [];
  if (discountData.scope === 'product' && Array.isArray(discountData.product_ids) && discountData.product_ids.length > 0) {
    const mappings = discountData.product_ids.map((prodId) => ({
      discount_rule_id: data.id,
      product_id: prodId,
    }));

    const { error: mapErr } = await client
      .from('discount_product_mappings')
      .insert(mappings);

    if (mapErr) {
      throw new AppError('Failed to associate products with discount rule', 500);
    }
    productIds = discountData.product_ids;
  }

  return mapDiscountFromDb(data, productIds);
}

async function update(id, updates, client = getSupabaseAdmin()) {
  const patch = {};

  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.kind !== undefined || updates.type !== undefined) {
    const k = updates.kind || updates.type;
    patch.kind = k;
    patch.type = k;
  }
  if (updates.value !== undefined) patch.value = formatMoney(parseMoney(updates.value));
  if (updates.scope !== undefined) patch.scope = updates.scope;
  if (updates.min_amount !== undefined) {
    patch.min_amount = updates.min_amount !== null ? formatMoney(parseMoney(updates.min_amount)) : null;
  }
  if (updates.min_quantity !== undefined) {
    patch.min_quantity = updates.min_quantity !== null ? parseInt(updates.min_quantity, 10) : null;
  }
  if (updates.start_date !== undefined || updates.valid_from !== undefined) {
    const start = updates.start_date || updates.valid_from;
    patch.valid_from = start ? toDateOnly(start) : null;
  }
  if (updates.end_date !== undefined || updates.valid_until !== undefined) {
    const end = updates.end_date || updates.valid_until;
    patch.valid_until = end ? toDateOnly(end) : null;
  }
  if (updates.max_uses !== undefined) {
    patch.max_uses = updates.max_uses !== null ? parseInt(updates.max_uses, 10) : null;
  }
  if (updates.is_active !== undefined) patch.is_active = Boolean(updates.is_active);

  // Invariant: used_count is never updated via this method
  patch.updated_at = new Date().toISOString();

  const { data, error } = await client
    .from('discount_rules')
    .update(patch)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to update discount rule', 500);
  }

  if (!data) {
    throw new AppError('Discount rule not found', 404);
  }

  // Update product mappings if provided
  let productIds = [];
  if (Array.isArray(updates.product_ids)) {
    await client
      .from('discount_product_mappings')
      .delete()
      .eq('discount_rule_id', id);

    if (updates.product_ids.length > 0) {
      const mappings = updates.product_ids.map((prodId) => ({
        discount_rule_id: id,
        product_id: prodId,
      }));
      await client.from('discount_product_mappings').insert(mappings);
    }
    productIds = updates.product_ids;
  } else {
    const { data: mappings } = await client
      .from('discount_product_mappings')
      .select('product_id')
      .eq('discount_rule_id', id);
    if (mappings) productIds = mappings.map((m) => m.product_id);
  }

  return mapDiscountFromDb(data, productIds);
}

module.exports = {
  findById,
  list,
  create,
  update,
  mapDiscountFromDb,
};

