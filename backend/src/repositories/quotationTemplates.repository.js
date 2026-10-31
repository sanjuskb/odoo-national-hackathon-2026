'use strict';

const { getSupabaseAdmin } = require('../lib/supabase');
const AppError = require('../utils/AppError');

function mapTemplateFromDb(row, lines = []) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    plan_id: row.plan_id,
    validity_days: row.validity_days,
    created_at: row.created_at,
    updated_at: row.updated_at,
    lines: lines.map((l) => ({
      id: l.id,
      template_id: l.template_id,
      product_id: l.product_id,
      variant_id: l.variant_id || null,
      quantity: l.quantity,
      created_at: l.created_at,
      updated_at: l.updated_at,
    })),
  };
}

async function list({ page = 1, limit = 20, search = null } = {}, client = getSupabaseAdmin()) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  let query = client
    .from('quotation_templates')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search && search.trim()) {
    query = query.ilike('name', `%${search.trim()}%`);
  }

  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) {
    throw new AppError('Failed to fetch quotation templates', 500);
  }

  const items = (data || []).map((r) => mapTemplateFromDb(r, []));
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
  const { data: template, error } = await client
    .from('quotation_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to fetch quotation template', 500);
  }
  if (!template) {
    return null;
  }

  // Fetch lines
  const { data: lines, error: lineError } = await client
    .from('quotation_template_lines')
    .select('*')
    .eq('template_id', id);

  if (lineError) {
    throw new AppError('Failed to fetch template lines', 500);
  }

  return mapTemplateFromDb(template, lines || []);
}

async function create({ name, plan_id, validity_days, lines = [] }, client = getSupabaseAdmin()) {
  const { data: templateData, error: templateError } = await client
    .from('quotation_templates')
    .insert({
      name: name.trim(),
      plan_id,
      validity_days: parseInt(validity_days, 10),
    })
    .select()
    .single();

  if (templateError) {
    if (templateError.code === '23503') {
      throw new AppError('Referenced plan does not exist', 400);
    }
    throw new AppError('Failed to create quotation template', 500);
  }

  let createdLines = [];
  if (Array.isArray(lines) && lines.length > 0) {
    const lineRows = lines.map((l) => ({
      template_id: templateData.id,
      product_id: l.product_id,
      variant_id: l.variant_id || null,
      quantity: parseInt(l.quantity, 10),
    }));

    const { data: insertedLines, error: lineInsertError } = await client
      .from('quotation_template_lines')
      .insert(lineRows)
      .select();

    if (lineInsertError) {
      if (lineInsertError.code === '23503') {
        throw new AppError('Referenced product or variant does not exist', 400);
      }
      throw new AppError('Failed to create template lines', 500);
    }
    createdLines = insertedLines || [];
  }

  return mapTemplateFromDb(templateData, createdLines);
}

async function update(id, fields = {}, newLines = null, client = getSupabaseAdmin()) {
  const allowed = ['name', 'plan_id', 'validity_days'];
  const payload = {};
  for (const k of allowed) {
    if (fields[k] !== undefined) {
      if (k === 'name') payload.name = fields.name.trim();
      else if (k === 'validity_days') payload.validity_days = parseInt(fields.validity_days, 10);
      else payload[k] = fields[k];
    }
  }

  let updatedTemplate = null;
  if (Object.keys(payload).length > 0) {
    payload.updated_at = new Date().toISOString();
    const { data, error } = await client
      .from('quotation_templates')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23503') {
        throw new AppError('Referenced plan does not exist', 400);
      }
      throw new AppError('Failed to update quotation template', 500);
    }
    updatedTemplate = data;
  } else {
    const existing = await findById(id, client);
    if (!existing) return null;
    updatedTemplate = existing;
  }

  // Handle lines replacement
  let linesResult = [];
  if (Array.isArray(newLines)) {
    // Note: Replaced in two steps: delete existing then insert new.
    await client.from('quotation_template_lines').delete().eq('template_id', id);

    if (newLines.length > 0) {
      const lineRows = newLines.map((l) => ({
        template_id: id,
        product_id: l.product_id,
        variant_id: l.variant_id || null,
        quantity: parseInt(l.quantity, 10),
      }));

      const { data: insertedLines, error: lineInsertError } = await client
        .from('quotation_template_lines')
        .insert(lineRows)
        .select();

      if (lineInsertError) {
        throw new AppError('Failed to update template lines', 500);
      }
      linesResult = insertedLines || [];
    }
  } else {
    const { data: currentLines } = await client
      .from('quotation_template_lines')
      .select('*')
      .eq('template_id', id);
    linesResult = currentLines || [];
  }

  return mapTemplateFromDb(updatedTemplate, linesResult);
}

module.exports = {
  list,
  findById,
  create,
  update,
  mapTemplateFromDb,
};
