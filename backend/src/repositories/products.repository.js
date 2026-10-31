const { getSupabaseAdmin } = require('../lib/supabase');
const AppError = require('../utils/AppError');
const { parseMoney, formatMoney } = require('../utils/money');

function mapProductFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    type: row.type || 'service',
    sales_price: formatMoney(parseMoney(row.sales_price)),
    cost_price: formatMoney(parseMoney(row.cost_price)),
    notes: row.notes || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapProductToDb(data) {
  const row = {};
  if (data.name !== undefined) row.name = data.name.trim();
  if (data.type !== undefined) row.type = data.type.trim();
  if (data.sales_price !== undefined) row.sales_price = parseFloat(formatMoney(parseMoney(data.sales_price)));
  if (data.cost_price !== undefined) row.cost_price = parseFloat(formatMoney(parseMoney(data.cost_price)));
  if (data.notes !== undefined) row.notes = data.notes;
  row.updated_at = new Date().toISOString();
  return row;
}

function handleDbError(err, resourceName = 'Product') {
  if (!err) return;
  if (err instanceof AppError) throw err;

  // Supabase / PostgREST error codes
  if (err.code === 'PGRST116' || err.status === 404) {
    throw new AppError(`${resourceName} not found`, 404, 'NOT_FOUND');
  }
  if (err.code === '23505' || err.status === 409) {
    throw new AppError(`${resourceName} with these details already exists`, 409, 'CONFLICT');
  }
  if (err.code === '23503') {
    throw new AppError(`Referenced record does not exist`, 400, 'FOREIGN_KEY_VIOLATION');
  }
  if (err.code === '23514') {
    throw new AppError(`Invalid product data constraint violation`, 400, 'CONSTRAINT_VIOLATION');
  }

  throw new AppError(err.message || 'Database error occurred', 500, 'DB_ERROR');
}

async function list({ page = 1, page_size = 20, search, type } = {}) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const ps = Math.min(100, Math.max(1, parseInt(page_size, 10) || 20));
  const from = (p - 1) * ps;
  const to = from + ps - 1;

  const supabase = getSupabaseAdmin();
  let query = supabase.from('products').select('*', { count: 'exact' });

  if (search) {
    query = query.ilike('name', `%${search.trim()}%`);
  }
  if (type) {
    query = query.eq('type', type.trim());
  }

  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) handleDbError(error, 'Product');

  const total = count ?? (data ? data.length : 0);
  const items = (data || []).map(mapProductFromDb);

  return {
    items,
    pagination: {
      page: p,
      page_size: ps,
      total_items: total,
      total_pages: Math.ceil(total / ps) || 1,
    },
  };
}

async function getById(id) {
  if (!id) throw new AppError('Product ID is required', 400, 'BAD_REQUEST');

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('products')
    .select('*, product_variants(*)')
    .eq('id', id)
    .single();

  if (error || !data) {
    handleDbError(error || { code: 'PGRST116' }, 'Product');
  }

  const product = mapProductFromDb(data);
  const rawVariants = data.product_variants || [];
  product.variants = rawVariants.map((v) => ({
    id: v.id,
    product_id: v.product_id,
    name: v.name,
    price_adjustment: formatMoney(parseMoney(v.price_adjustment)),
    created_at: v.created_at,
    updated_at: v.updated_at,
  }));

  return product;
}

async function create(productData) {
  const row = mapProductToDb(productData);
  row.created_at = new Date().toISOString();

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('products')
    .insert(row)
    .select()
    .single();

  if (error || !data) {
    handleDbError(error, 'Product');
  }

  return mapProductFromDb(data);
}

async function update(id, partialData) {
  if (!id) throw new AppError('Product ID is required', 400, 'BAD_REQUEST');

  const row = mapProductToDb(partialData);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('products')
    .update(row)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    handleDbError(error || { code: 'PGRST116' }, 'Product');
  }

  return mapProductFromDb(data);
}

module.exports = {
  list,
  getById,
  create,
  update,
  mapProductFromDb,
};
