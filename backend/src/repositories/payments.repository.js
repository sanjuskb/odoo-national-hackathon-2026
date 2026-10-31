'use strict';

const { getSupabaseAdmin } = require('../lib/supabase');
const AppError = require('../utils/AppError');
const { formatMoney, parseMoney } = require('../utils/money');
const { validatePaymentAmount, computeInvoiceFinancials } = require('../services/invoice.service');

function mapPaymentFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    invoice_id: row.invoice_id,
    amount: formatMoney(parseMoney(row.amount || 0)),
    payment_date: row.payment_date,
    method: row.method,
    reference: row.reference || null,
    note: row.note || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function findById(id, client = getSupabaseAdmin()) {
  const { data, error } = await client
    .from('payments')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to fetch payment', 500);
  }

  return mapPaymentFromDb(data);
}

async function listByInvoiceId(invoiceId, client = getSupabaseAdmin()) {
  if (!invoiceId) return [];

  const { data, error } = await client
    .from('payments')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('payment_date', { ascending: true });

  if (error) {
    throw new AppError('Failed to fetch payments for invoice', 500);
  }

  return (data || []).map(mapPaymentFromDb);
}

async function list(
  { invoice_id = null, page = 1, page_size = 20, limit = null, date_from = null, date_to = null } = {},
  client = getSupabaseAdmin()
) {
  const effectiveLimit = limit !== null ? limit : page_size;
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(effectiveLimit, 10) || 20));
  const offset = (safePage - 1) * safeLimit;

  let query = client
    .from('payments')
    .select('*', { count: 'exact' });

  if (invoice_id) {
    query = query.eq('invoice_id', invoice_id);
  }
  if (date_from) {
    query = query.gte('payment_date', date_from);
  }
  if (date_to) {
    query = query.lte('payment_date', date_to);
  }

  query = query
    .order('payment_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + safeLimit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new AppError('Failed to list payments', 500);
  }

  return {
    items: (data || []).map(mapPaymentFromDb),
    pagination: {
      page: safePage,
      page_size: safeLimit,
      total: count !== null && count !== undefined ? count : (data || []).length,
    },
  };
}

// Per-invoice in-memory lock for concurrent payment serialization
// TEMPORARY until Harsha provides the atomic record_payment_atomic database RPC
const invoiceLocks = new Map();

async function withInvoiceLock(invoiceId, fn) {
  while (invoiceLocks.has(invoiceId)) {
    try {
      await invoiceLocks.get(invoiceId);
    } catch {
      // Ignore errors in prior execution; proceed when unlocked
    }
  }
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  invoiceLocks.set(invoiceId, promise);
  try {
    return await fn();
  } finally {
    invoiceLocks.delete(invoiceId);
    resolve();
  }
}

/**
 * Records a payment against an invoice with concurrent overpayment guard.
 *
 * TEMPORARY - non-atomic, replace with a database RPC
 *
 * @param {object} params
 * @param {string} params.invoice_id
 * @param {string|number} params.amount
 * @param {string} [params.payment_date]
 * @param {string} params.method
 * @param {string} [params.reference]
 * @param {string} [params.note]
 * @param {object} [client]
 */
async function recordPayment(
  { invoice_id, amount, payment_date = null, method, reference = null, note = null },
  client = getSupabaseAdmin()
) {
  if (!invoice_id) {
    throw new AppError('Invoice ID is required', 400);
  }

  return withInvoiceLock(invoice_id, async () => {
    // 1. Fetch invoice
    const { data: invoiceRow, error: invError } = await client
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .maybeSingle();

    if (invError || !invoiceRow) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoiceRow.status === 'draft') {
      throw new AppError('Cannot record payment on a draft invoice', 400, 'INVOICE_NOT_CONFIRMED');
    }
    if (invoiceRow.status === 'cancelled') {
      throw new AppError('Cannot record payment on a cancelled invoice', 400, 'INVOICE_CANCELLED');
    }
    if (invoiceRow.status === 'paid') {
      throw new AppError('Invoice is already fully paid', 400, 'INVOICE_ALREADY_PAID');
    }
    if (invoiceRow.status !== 'confirmed') {
      throw new AppError(`Cannot record payment on invoice in '${invoiceRow.status}' status`, 400);
    }

    // 2. Fetch existing payments
    const existingPayments = await listByInvoiceId(invoice_id, client);

    // 3. Validate payment amount & overpayment
    const { amountFormatted, willPayInFull } = validatePaymentAmount(
      invoiceRow,
      existingPayments,
      amount
    );

    const paymentDate = payment_date || new Date().toISOString().slice(0, 10);

    // 4. Insert payment
    const paymentPayload = {
      invoice_id,
      amount: amountFormatted,
      payment_date: paymentDate,
      method,
      reference: reference || null,
      note: note || null,
    };

    const { data: newPayment, error: pmtError } = await client
      .from('payments')
      .insert([paymentPayload])
      .select()
      .single();

    if (pmtError) {
      throw new AppError('Failed to record payment', 500);
    }

    // 5. If fully paid, update invoice status to 'paid'
    let updatedInvoice = invoiceRow;
    if (willPayInFull) {
      const paidAt = new Date().toISOString();
      const { data: invUpdated, error: updateError } = await client
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: paidAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice_id)
        .select()
        .single();

      if (!updateError && invUpdated) {
        updatedInvoice = invUpdated;
      }
    }

    const updatedPayments = [...existingPayments, mapPaymentFromDb(newPayment)];
    const financials = computeInvoiceFinancials(updatedInvoice, updatedPayments);

    return {
      payment: mapPaymentFromDb(newPayment),
      invoice: updatedInvoice,
      willPayInFull,
      financials,
    };
  });
}

module.exports = {
  mapPaymentFromDb,
  findById,
  listByInvoiceId,
  list,
  recordPayment,
};

