'use strict';

const { getSupabaseAdmin } = require('../lib/supabase');
const AppError = require('../utils/AppError');
const { formatMoney, parseMoney } = require('../utils/money');
const { chunkArray, mapConcurrent } = require('../utils/async');
const { computeInvoiceFinancials, canTransition } = require('../services/invoice.service');
const invoiceLinesRepo = require('./invoiceLines.repository');
const paymentsRepo = require('./payments.repository');

function mapInvoiceFromDb(row) {
  if (!row) return null;
  const endPeriod = row.billing_period_end_exclusive || row.billing_period_end || null;
  return {
    id: row.id,
    subscription_id: row.subscription_id || null,
    customer_id: row.customer_id,
    billing_period_start: row.billing_period_start || null,
    billing_period_end: endPeriod,
    billing_period_end_exclusive: endPeriod,
    currency: row.currency || 'INR',
    invoice_number: row.invoice_number,
    subtotal: formatMoney(parseMoney(row.subtotal || 0)),
    discount_total: formatMoney(parseMoney(row.discount_total || 0)),
    tax_total: formatMoney(parseMoney(row.tax_total || 0)),
    total: formatMoney(parseMoney(row.total || 0)),
    status: row.status,
    due_date: row.due_date || null,
    paid_at: row.paid_at || null,
    sent_at: row.sent_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function findById(id, client = getSupabaseAdmin()) {
  const { data, error } = await client
    .from('invoices')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to fetch invoice', 500);
  }

  return mapInvoiceFromDb(data);
}

async function getInvoiceWithDetails(id, client = getSupabaseAdmin()) {
  const invoice = await findById(id, client);
  if (!invoice) return null;

  const [lines, payments] = await Promise.all([
    invoiceLinesRepo.listByInvoiceId(id, client),
    paymentsRepo.listByInvoiceId(id, client),
  ]);

  const financials = computeInvoiceFinancials(invoice, payments);

  return {
    ...invoice,
    is_overdue: financials.is_overdue,
    lines,
    payments,
    financials: {
      total: financials.total,
      paid_amount: financials.paid_amount,
      balance_due: financials.balance_due,
      is_overdue: financials.is_overdue,
      computed_status: financials.computed_status,
    },
  };
}

async function list(
  {
    customer_id = null,
    status = null,
    overdue = null,
    page = 1,
    page_size = 20,
    limit = null,
    due_before = null,
    due_after = null,
    today = null,
  } = {},
  client = getSupabaseAdmin()
) {
  const effectiveLimit = limit !== null ? limit : page_size;
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(effectiveLimit, 10) || 20));
  const offset = (safePage - 1) * safeLimit;
  const todayStr = today || new Date().toISOString().slice(0, 10);

  let query = client
    .from('invoices')
    .select('*', { count: 'exact' });

  if (customer_id) {
    query = query.eq('customer_id', customer_id);
  }

  // Handle overdue filter: ?overdue=true or ?status=overdue
  const isOverdueQuery = status === 'overdue' || overdue === true;
  if (isOverdueQuery) {
    query = query.eq('status', 'confirmed').lt('due_date', todayStr);
  } else if (overdue === false) {
    query = query.gte('due_date', todayStr);
  } else if (status) {
    query = query.eq('status', status);
  }

  if (due_before) {
    query = query.lte('due_date', due_before);
  }
  if (due_after) {
    query = query.gte('due_date', due_after);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + safeLimit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new AppError('Failed to list invoices', 500);
  }

  const invoiceRows = data || [];
  const invoiceIds = invoiceRows.map((r) => r.id);

  // Batch query payments to avoid N+1 queries (chunk size <= 100, bounded concurrency 5)
  let paymentsByInvoiceId = new Map();
  if (invoiceIds.length > 0) {
    const chunks = chunkArray(invoiceIds, 100);
    await mapConcurrent(chunks, 5, async (batch) => {
      const { data: pmtData, error: pmtError } = await client
        .from('payments')
        .select('invoice_id, amount')
        .in('invoice_id', batch);

      if (!pmtError && pmtData) {
        for (const p of pmtData) {
          if (!paymentsByInvoiceId.has(p.invoice_id)) {
            paymentsByInvoiceId.set(p.invoice_id, []);
          }
          paymentsByInvoiceId.get(p.invoice_id).push(p);
        }
      }
    });
  }

  const items = invoiceRows.map((row) => {
    const mapped = mapInvoiceFromDb(row);
    const payments = paymentsByInvoiceId.get(row.id) || [];
    const financials = computeInvoiceFinancials(mapped, payments);
    return {
      ...mapped,
      is_overdue: financials.is_overdue,
      financials: {
        total: financials.total,
        paid_amount: financials.paid_amount,
        balance_due: financials.balance_due,
        is_overdue: financials.is_overdue,
        computed_status: financials.computed_status,
      },
    };
  });

  return {
    items,
    pagination: {
      page: safePage,
      page_size: safeLimit,
      total: count !== null && count !== undefined ? count : invoiceRows.length,
    },
  };
}

async function updateStatus(id, newStatus, { sent_at = null, paid_at = null } = {}, client = getSupabaseAdmin()) {
  const patch = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };
  if (sent_at) patch.sent_at = sent_at;
  if (paid_at) patch.paid_at = paid_at;

  const { data, error } = await client
    .from('invoices')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new AppError('Failed to update invoice status', 500);
  }

  return mapInvoiceFromDb(data);
}

async function cancelInvoice(id, client = getSupabaseAdmin()) {
  const invoice = await findById(id, client);
  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  const payments = await paymentsRepo.listByInvoiceId(id, client);
  const transitionCheck = canTransition(invoice, 'cancel', { payments });

  if (!transitionCheck.allowed) {
    throw new AppError(transitionCheck.reason, transitionCheck.statusCode || 409);
  }

  return updateStatus(id, 'cancelled', {}, client);
}

async function confirmInvoice(id, client = getSupabaseAdmin()) {
  const invoice = await findById(id, client);
  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  const transitionCheck = canTransition(invoice, 'confirm');
  if (!transitionCheck.allowed) {
    throw new AppError(transitionCheck.reason, transitionCheck.statusCode || 409);
  }

  return updateStatus(id, 'confirmed', {}, client);
}

async function createInvoice(invoiceData, client = getSupabaseAdmin()) {
  const row = {
    id: invoiceData.id,
    subscription_id: invoiceData.subscription_id || null,
    customer_id: invoiceData.customer_id,
    billing_period_start: invoiceData.billing_period_start || null,
    billing_period_end: invoiceData.billing_period_end || null,
    invoice_number: invoiceData.invoice_number,
    subtotal: formatMoney(parseMoney(invoiceData.subtotal || 0)),
    discount_total: formatMoney(parseMoney(invoiceData.discount_total || 0)),
    tax_total: formatMoney(parseMoney(invoiceData.tax_total || 0)),
    total: formatMoney(parseMoney(invoiceData.total || 0)),
    status: invoiceData.status || 'draft',
    due_date: invoiceData.due_date || null,
    paid_at: invoiceData.paid_at || null,
    sent_at: invoiceData.sent_at || null,
  };

  const { data, error } = await client
    .from('invoices')
    .insert([row])
    .select()
    .single();

  if (error) {
    throw new AppError('Failed to create invoice', 500);
  }

  return mapInvoiceFromDb(data);
}

module.exports = {
  mapInvoiceFromDb,
  findById,
  getInvoiceWithDetails,
  list,
  updateStatus,
  cancelInvoice,
  confirmInvoice,
  createInvoice,
};

