'use strict';

const { getSupabaseAdmin } = require('../lib/supabase');
const AppError = require('../utils/AppError');
const { formatMoney, parseMoney } = require('../utils/money');

function mapInvoiceLineFromDb(row) {
  if (!row) return null;
  const taxPct = formatMoney(parseMoney(row.tax_percent !== undefined && row.tax_percent !== null ? row.tax_percent : (row.tax_rate_percent || 0)));
  return {
    id: row.id,
    invoice_id: row.invoice_id,
    product_id: row.product_id,
    description: row.description,
    quantity: Number(row.quantity),
    unit_price: formatMoney(parseMoney(row.unit_price || 0)),
    variant_adjustment: formatMoney(parseMoney(row.variant_adjustment || 0)),
    tax_percent: taxPct,
    tax_rate_percent: taxPct,
    base_amount: formatMoney(parseMoney(row.base_amount || 0)),
    discount_amount: formatMoney(parseMoney(row.discount_amount || 0)),
    tax_amount: formatMoney(parseMoney(row.tax_amount || 0)),
    line_total: formatMoney(parseMoney(row.line_total || 0)),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function listByInvoiceId(invoiceId, client = getSupabaseAdmin()) {
  if (!invoiceId) return [];

  const { data, error } = await client
    .from('invoice_lines')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new AppError('Failed to fetch invoice lines', 500);
  }

  return (data || []).map(mapInvoiceLineFromDb);
}

async function createLines(lines, client = getSupabaseAdmin()) {
  if (!Array.isArray(lines) || lines.length === 0) return [];

  const payload = lines.map((l) => {
    const taxPct = formatMoney(parseMoney(l.tax_percent !== undefined && l.tax_percent !== null ? l.tax_percent : (l.tax_rate_percent || 0)));
    return {
      id: l.id,
      invoice_id: l.invoice_id,
      product_id: l.product_id,
      description: l.description,
      quantity: l.quantity,
      unit_price: formatMoney(parseMoney(l.unit_price || 0)),
      variant_adjustment: formatMoney(parseMoney(l.variant_adjustment || 0)),
      tax_percent: taxPct,
      tax_rate_percent: taxPct,
      base_amount: formatMoney(parseMoney(l.base_amount || 0)),
      discount_amount: formatMoney(parseMoney(l.discount_amount || 0)),
      tax_amount: formatMoney(parseMoney(l.tax_amount || 0)),
      line_total: formatMoney(parseMoney(l.line_total || 0)),
    };
  });

  const { data, error } = await client
    .from('invoice_lines')
    .insert(payload)
    .select();

  if (error) {
    throw new AppError('Failed to create invoice lines', 500);
  }

  return (data || []).map(mapInvoiceLineFromDb);
}

module.exports = {
  mapInvoiceLineFromDb,
  listByInvoiceId,
  createLines,
};

