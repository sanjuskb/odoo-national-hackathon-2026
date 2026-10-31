const { getSupabaseAdmin } = require('../lib/supabase');
const AppError = require('../utils/AppError');
const { parseMoney, formatMoney } = require('../utils/money');

function mapVariantFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    product_id: row.product_id,
    name: row.name,
    price_adjustment: formatMoney(parseMoney(row.price_adjustment)),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapVariantToDb(data) {
  const row = {};
  if (data.product_id !== undefined) row.product_id = data.product_id;
  if (data.name !== undefined) row.name = data.name.trim();
  if (data.price_adjustment !== undefined) {
    row.price_adjustment = parseFloat(formatMoney(parseMoney(data.price_adjustment)));
  }
  row.updated_at = new Date().toISOString();
  return row;
}

function handleDbError(err, resourceName = 'Variant') {
  if (!err) return;
  if (err instanceof AppError) throw err;

  if (err.code === 'PGRST116' || err.status === 404) {
    throw new AppError(`${resourceName} not found`, 404, 'NOT_FOUND');
  }
  if (err.code === '23505') {
    throw new AppError(`Variant with this name already exists for this product`, 409, 'CONFLICT');
  }
  if (err.code === '23503') {
    throw new AppError(`Parent product not found`, 404, 'NOT_FOUND');
  }

  throw new AppError(err.message || 'Database error occurred', 500, 'DB_ERROR');
}

async function listByProduct(productId) {
  if (!productId) throw new AppError('Product ID is required', 400, 'BAD_REQUEST');

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: true });

  if (error) handleDbError(error, 'Variant');

  return (data || []).map(mapVariantFromDb);
}

async function getById(id) {
  if (!id) throw new AppError('Variant ID is required', 400, 'BAD_REQUEST');

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    handleDbError(error || { code: 'PGRST116' }, 'Variant');
  }

  return mapVariantFromDb(data);
}

async function create(variantData) {
  const row = mapVariantToDb(variantData);
  row.created_at = new Date().toISOString();

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('product_variants')
    .insert(row)
    .select()
    .single();

  if (error || !data) {
    handleDbError(error, 'Variant');
  }

  return mapVariantFromDb(data);
}

async function update(id, partialData) {
  if (!id) throw new AppError('Variant ID is required', 400, 'BAD_REQUEST');

  const row = mapVariantToDb(partialData);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('product_variants')
    .update(row)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    handleDbError(error || { code: 'PGRST116' }, 'Variant');
  }

  return mapVariantFromDb(data);
}

module.exports = {
  listByProduct,
  getById,
  create,
  update,
  mapVariantFromDb,
};
