const { getSupabaseAdmin } = require('../lib/supabase');
const AppError = require('../utils/AppError');
const { parseMoney, formatMoney } = require('../utils/money');

function mapPlanFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    product_id: row.product_id,
    name: row.name || 'Standard Plan',
    price: formatMoney(parseMoney(row.price)),
    currency: row.currency || 'INR',
    frequency: row.frequency,
    billing_frequency: row.frequency,
    min_quantity: row.min_quantity ?? 1,
    available_from: row.available_from || null,
    available_until: row.available_until || null,
    auto_close: Boolean(row.auto_close),
    allow_early_close: Boolean(row.allow_early_close),
    allow_pause: Boolean(row.allow_pause),
    allow_renew: Boolean(row.allow_renew),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapPlanToDb(data) {
  const row = {};
  if (data.product_id !== undefined) row.product_id = data.product_id;
  if (data.name !== undefined) {
    row.name = data.name.trim();
  } else if (!data.id) {
    row.name = 'Standard Plan';
  }
  if (data.price !== undefined) row.price = parseFloat(formatMoney(parseMoney(data.price)));
  row.currency = (data.currency || 'INR').slice(0, 3).toUpperCase();
  const freq = data.frequency || data.billing_frequency;
  if (freq !== undefined) row.frequency = freq;
  if (data.min_quantity !== undefined) row.min_quantity = parseInt(data.min_quantity, 10);
  if (data.available_from !== undefined) row.available_from = data.available_from;
  if (data.available_until !== undefined) row.available_until = data.available_until;
  if (data.auto_close !== undefined) row.auto_close = Boolean(data.auto_close);
  if (data.allow_early_close !== undefined) row.allow_early_close = Boolean(data.allow_early_close);
  if (data.allow_pause !== undefined) row.allow_pause = Boolean(data.allow_pause);
  if (data.allow_renew !== undefined) row.allow_renew = Boolean(data.allow_renew);
  row.updated_at = new Date().toISOString();
  return row;
}

function handleDbError(err, resourceName = 'Plan') {
  if (!err) return;
  if (err instanceof AppError) throw err;

  if (err.code === 'PGRST116' || err.status === 404) {
    throw new AppError(`${resourceName} not found`, 404, 'NOT_FOUND');
  }
  if (err.code === '23505') {
    throw new AppError(`${resourceName} already exists`, 409, 'CONFLICT');
  }
  if (err.code === '23503') {
    throw new AppError(`Referenced product not found`, 404, 'NOT_FOUND');
  }
  if (err.code === '23514') {
    throw new AppError(`Invalid plan data constraints`, 400, 'CONSTRAINT_VIOLATION');
  }

  throw new AppError(err.message || 'Database error occurred', 500, 'DB_ERROR');
}

async function list({ page = 1, page_size = 20, frequency, product_id, availableOnly = false } = {}) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const ps = Math.min(100, Math.max(1, parseInt(page_size, 10) || 20));
  const from = (p - 1) * ps;
  const to = from + ps - 1;

  const supabase = getSupabaseAdmin();
  let query = supabase.from('plans').select('*', { count: 'exact' });

  if (frequency) {
    query = query.eq('frequency', frequency);
  }
  if (product_id) {
    query = query.eq('product_id', product_id);
  }

  // Available window filter: plans where available_from <= now and available_until >= now
  if (availableOnly) {
    const nowIso = new Date().toISOString();
    // Using Supabase filter methods: available_from is null OR available_from <= nowIso
    query = query
      .or(`available_from.is.null,available_from.lte.${nowIso}`)
      .or(`available_until.is.null,available_until.gte.${nowIso}`);
  }

  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) handleDbError(error, 'Plan');

  const total = count ?? (data ? data.length : 0);
  const items = (data || []).map(mapPlanFromDb);

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
  if (!id) throw new AppError('Plan ID is required', 400, 'BAD_REQUEST');

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    handleDbError(error || { code: 'PGRST116' }, 'Plan');
  }

  return mapPlanFromDb(data);
}

async function create(planData) {
  const row = mapPlanToDb(planData);
  row.created_at = new Date().toISOString();

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('plans')
    .insert(row)
    .select()
    .single();

  if (error || !data) {
    handleDbError(error, 'Plan');
  }

  return mapPlanFromDb(data);
}

async function update(id, partialData) {
  if (!id) throw new AppError('Plan ID is required', 400, 'BAD_REQUEST');

  const row = mapPlanToDb(partialData);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('plans')
    .update(row)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    handleDbError(error || { code: 'PGRST116' }, 'Plan');
  }

  return mapPlanFromDb(data);
}

async function findById(id) {
  try {
    return await getById(id);
  } catch (err) {
    if (err.statusCode === 404 || err.errorCode === 'NOT_FOUND') {
      return null;
    }
    throw err;
  }
}

module.exports = {
  list,
  getById,
  findById,
  create,
  update,
  mapPlanFromDb,
};
