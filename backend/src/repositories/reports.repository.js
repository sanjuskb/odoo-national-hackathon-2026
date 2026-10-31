'use strict';

const { getSupabaseAdmin } = require('../lib/supabase');
const AppError = require('../utils/AppError');
const { formatMoney, parseMoney } = require('../utils/money');
const { toDateOnly } = require('../utils/dates');
const { computeDaysOverdue, isInvoiceOverdue } = require('../services/reports.service');

// TEMPORARY - replace with a database function/view
// All aggregations below use bounded chunk paging (1000 rows max per chunk)
// and batch payment lookups (100 IDs max per batch) to maintain constant memory
// and guarantee sub-2-second response times without N+1 queries.

/**
 * Counts subscriptions by active/paused status or full status breakdown.
 * Uses exact head count queries (zero row payloads).
 */
async function countSubscriptionsByStatus(
  { customer_id = null, plan_id = null } = {},
  client = getSupabaseAdmin()
) {
  async function getCount(status, isPaused = null) {
    let q = client
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', status);

    if (isPaused !== null) {
      q = q.eq('is_paused', isPaused);
    }
    if (customer_id) {
      q = q.eq('customer_id', customer_id);
    }
    if (plan_id) {
      q = q.eq('plan_id', plan_id);
    }

    const { count, error } = await q;
    if (error) {
      throw new AppError('Failed to query subscription counts', 500);
    }
    return count || 0;
  }

  const [active, paused, draft, quotation, confirmed, closed] = await Promise.all([
    getCount('active', false),
    getCount('active', true),
    getCount('draft'),
    getCount('quotation'),
    getCount('confirmed'),
    getCount('closed'),
  ]);

  return {
    active,
    paused,
    draft,
    quotation,
    confirmed,
    closed,
  };
}

/**
 * Calculates sum of total for invoices with status in ('confirmed', 'paid'),
 * filtered by created_at within [from, to] inclusive.
 *
 * TEMPORARY - replace with a database function/view
 */
async function getInvoicedTotal(
  { from = null, to = null, customer_id = null, plan_id = null } = {},
  client = getSupabaseAdmin()
) {
  let subIds = null;
  if (plan_id) {
    const { data: subs, error: subErr } = await client
      .from('subscriptions')
      .select('id')
      .eq('plan_id', plan_id);
    if (subErr) throw new AppError('Failed to resolve subscriptions for plan', 500);
    subIds = (subs || []).map((s) => s.id);
    if (subIds.length === 0) {
      return 0; // No subscriptions match plan
    }
  }

  const chunkSize = 1000;
  let offset = 0;
  let totalMinor = 0;

  while (true) {
    let q = client
      .from('invoices')
      .select('id, total')
      .in('status', ['confirmed', 'paid'])
      .order('id', { ascending: true })
      .range(offset, offset + chunkSize - 1);

    if (customer_id) q = q.eq('customer_id', customer_id);
    if (subIds) q = q.in('subscription_id', subIds);
    if (from) q = q.gte('created_at', `${from}T00:00:00.000Z`);
    if (to) q = q.lte('created_at', `${to}T23:59:59.999Z`);

    const { data, error } = await q;
    if (error) {
      throw new AppError('Failed to aggregate invoiced revenue', 500);
    }

    if (!data || data.length === 0) break;

    for (const row of data) {
      totalMinor += parseMoney(row.total || 0);
    }

    if (data.length < chunkSize) break;
    offset += chunkSize;
  }

  return totalMinor;
}

/**
 * Calculates sum of payments.amount with payment_date within [from, to] inclusive.
 *
 * TEMPORARY - replace with a database function/view
 */
async function getCollectedTotal(
  { from = null, to = null, customer_id = null, invoice_id = null, method = null } = {},
  client = getSupabaseAdmin()
) {
  let custInvoiceIds = null;
  if (customer_id) {
    const { data: invs, error: invErr } = await client
      .from('invoices')
      .select('id')
      .eq('customer_id', customer_id);
    if (invErr) throw new AppError('Failed to resolve customer invoices', 500);
    custInvoiceIds = (invs || []).map((i) => i.id);
    if (custInvoiceIds.length === 0) {
      return { totalMinor: 0, count: 0 };
    }
  }

  const chunkSize = 1000;
  let offset = 0;
  let collectedMinor = 0;
  let count = 0;

  while (true) {
    let q = client
      .from('payments')
      .select('id, amount')
      .order('id', { ascending: true })
      .range(offset, offset + chunkSize - 1);

    if (from) q = q.gte('payment_date', from);
    if (to) q = q.lte('payment_date', to);
    if (invoice_id) q = q.eq('invoice_id', invoice_id);
    if (method) q = q.eq('method', method);
    if (custInvoiceIds) q = q.in('invoice_id', custInvoiceIds);

    const { data, error } = await q;
    if (error) {
      throw new AppError('Failed to aggregate collected revenue', 500);
    }

    if (!data || data.length === 0) break;

    for (const row of data) {
      collectedMinor += parseMoney(row.amount || 0);
      count++;
    }

    if (data.length < chunkSize) break;
    offset += chunkSize;
  }

  return { totalMinor: collectedMinor, count };
}

/**
 * Helper to fetch payments in batches of at most 100 invoice IDs.
 * Completely eliminates N+1 query overhead.
 */
async function batchFetchPaymentsForInvoices(invoiceIds, client) {
  const paymentsByInvoice = new Map();
  if (!invoiceIds || invoiceIds.length === 0) return paymentsByInvoice;

  const batchSize = 100;
  for (let i = 0; i < invoiceIds.length; i += batchSize) {
    const batch = invoiceIds.slice(i, i + batchSize);
    const { data, error } = await client
      .from('payments')
      .select('invoice_id, amount')
      .in('invoice_id', batch);

    if (!error && data) {
      for (const p of data) {
        if (!paymentsByInvoice.has(p.invoice_id)) {
          paymentsByInvoice.set(p.invoice_id, 0);
        }
        paymentsByInvoice.set(
          p.invoice_id,
          paymentsByInvoice.get(p.invoice_id) + parseMoney(p.amount || 0)
        );
      }
    }
  }

  return paymentsByInvoice;
}

/**
 * Computes outstanding balance, overdue count, and overdue amount
 * across all confirmed invoices as of today.
 *
 * TEMPORARY - replace with a database function/view
 */
async function getOutstandingAndOverdue(
  { customer_id = null, plan_id = null, today = toDateOnly(new Date()) } = {},
  client = getSupabaseAdmin()
) {
  let subIds = null;
  if (plan_id) {
    const { data: subs, error: subErr } = await client
      .from('subscriptions')
      .select('id')
      .eq('plan_id', plan_id);
    if (subErr) throw new AppError('Failed to resolve subscriptions for plan', 500);
    subIds = (subs || []).map((s) => s.id);
    if (subIds.length === 0) {
      return { outstandingMinor: 0, overdueCount: 0, overdueAmountMinor: 0 };
    }
  }

  const chunkSize = 1000;
  let offset = 0;
  let outstandingMinor = 0;
  let overdueCount = 0;
  let overdueAmountMinor = 0;

  while (true) {
    let q = client
      .from('invoices')
      .select('id, total, status, due_date')
      .eq('status', 'confirmed')
      .order('id', { ascending: true })
      .range(offset, offset + chunkSize - 1);

    if (customer_id) q = q.eq('customer_id', customer_id);
    if (subIds) q = q.in('subscription_id', subIds);

    const { data, error } = await q;
    if (error) {
      throw new AppError('Failed to query confirmed invoices for outstanding balance', 500);
    }

    if (!data || data.length === 0) break;

    const invoiceIds = data.map((r) => r.id);
    const paymentsMap = await batchFetchPaymentsForInvoices(invoiceIds, client);

    for (const inv of data) {
      const invTotalMinor = parseMoney(inv.total || 0);
      const paidMinor = paymentsMap.get(inv.id) || 0;
      const balanceMinor = Math.max(0, invTotalMinor - paidMinor);

      if (balanceMinor > 0) {
        outstandingMinor += balanceMinor;
        if (isInvoiceOverdue(inv, balanceMinor, today)) {
          overdueCount++;
          overdueAmountMinor += balanceMinor;
        }
      }
    }

    if (data.length < chunkSize) break;
    offset += chunkSize;
  }

  return {
    outstandingMinor,
    overdueCount,
    overdueAmountMinor,
  };
}

/**
 * Lists overdue invoices with pagination, sorted by days_overdue DESC (due_date ASC, tie-break id).
 *
 * TEMPORARY - replace with a database function/view
 */
async function listOverdueInvoices(
  {
    customer_id = null,
    plan_id = null,
    from = null,
    to = null,
    page = 1,
    limit = 20,
    today = toDateOnly(new Date()),
  } = {},
  client = getSupabaseAdmin()
) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (safePage - 1) * safeLimit;
  const todayStr = toDateOnly(today);

  let subIds = null;
  if (plan_id) {
    const { data: subs, error: subErr } = await client
      .from('subscriptions')
      .select('id')
      .eq('plan_id', plan_id);
    if (subErr) throw new AppError('Failed to resolve subscriptions for plan', 500);
    subIds = (subs || []).map((s) => s.id);
    if (subIds.length === 0) {
      return { items: [], pagination: { page: safePage, limit: safeLimit, total: 0 } };
    }
  }

  // Base query: confirmed invoices with past due date (< today)
  let query = client
    .from('invoices')
    .select('*', { count: 'exact' })
    .eq('status', 'confirmed')
    .lt('due_date', todayStr);

  if (customer_id) query = query.eq('customer_id', customer_id);
  if (subIds) query = query.in('subscription_id', subIds);
  if (from) query = query.gte('due_date', from);
  if (to) query = query.lte('due_date', to);

  // days_overdue DESC is equivalent to due_date ASC
  query = query
    .order('due_date', { ascending: true })
    .order('id', { ascending: true });

  // Fetch page chunk
  const { data: candidateInvoices, error, count: rawCount } = await query.range(
    offset,
    offset + safeLimit - 1
  );

  if (error) {
    throw new AppError('Failed to fetch overdue invoices', 500);
  }

  const rows = candidateInvoices || [];
  const invIds = rows.map((r) => r.id);
  const paymentsMap = await batchFetchPaymentsForInvoices(invIds, client);

  // Fetch customer metadata in batch if available
  const customerMap = new Map();
  const uniqueCustomerIds = [...new Set(rows.map((r) => r.customer_id))];
  await Promise.all(
    uniqueCustomerIds.map(async (cid) => {
      try {
        const { data: userData } = await client.auth.admin.getUserById(cid);
        if (userData && userData.user) {
          customerMap.set(cid, {
            id: cid,
            name: userData.user.user_metadata?.full_name || userData.user.email || 'Customer',
            email: userData.user.email || null,
          });
        }
      } catch {
        // Fallback
        customerMap.set(cid, { id: cid, name: 'Customer', email: null });
      }
    })
  );

  const items = [];
  for (const inv of rows) {
    const totalMinor = parseMoney(inv.total || 0);
    const paidMinor = paymentsMap.get(inv.id) || 0;
    const balanceMinor = Math.max(0, totalMinor - paidMinor);

    if (balanceMinor > 0) {
      const daysOverdue = computeDaysOverdue(inv.due_date, todayStr);
      const custInfo = customerMap.get(inv.customer_id) || {
        id: inv.customer_id,
        name: 'Customer',
        email: null,
      };

      items.push({
        id: inv.id,
        invoice_number: inv.invoice_number,
        customer: custInfo,
        due_date: inv.due_date,
        total: formatMoney(totalMinor),
        amount_paid: formatMoney(paidMinor),
        balance_due: formatMoney(balanceMinor),
        days_overdue: daysOverdue,
      });
    }
  }

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: rawCount !== null && rawCount !== undefined ? rawCount : items.length,
    },
  };
}

/**
 * Lists paginated payments report with filters and calculates totals { count, amount }
 * for the entire filtered set.
 *
 * TEMPORARY - replace with a database function/view
 */
async function listPaymentsReport(
  {
    from = null,
    to = null,
    method = null,
    invoice_id = null,
    customer_id = null,
    page = 1,
    limit = 20,
  } = {},
  client = getSupabaseAdmin()
) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (safePage - 1) * safeLimit;

  // 1. Calculate totals across whole filtered set
  const { totalMinor, count: totalCount } = await getCollectedTotal(
    { from, to, customer_id, invoice_id, method },
    client
  );

  // 2. Query page items
  let custInvoiceIds = null;
  if (customer_id) {
    const { data: invs, error: invErr } = await client
      .from('invoices')
      .select('id')
      .eq('customer_id', customer_id);
    if (!invErr && invs) {
      custInvoiceIds = invs.map((i) => i.id);
    }
  }

  let q = client
    .from('payments')
    .select('*')
    .order('payment_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + safeLimit - 1);

  if (from) q = q.gte('payment_date', from);
  if (to) q = q.lte('payment_date', to);
  if (invoice_id) q = q.eq('invoice_id', invoice_id);
  if (method) q = q.eq('method', method);
  if (custInvoiceIds) q = q.in('invoice_id', custInvoiceIds);

  const { data, error } = await q;
  if (error) {
    throw new AppError('Failed to fetch payments report', 500);
  }

  const items = (data || []).map((p) => ({
    id: p.id,
    invoice_id: p.invoice_id,
    amount: formatMoney(parseMoney(p.amount || 0)),
    payment_date: p.payment_date,
    method: p.method,
    reference: p.reference || null,
    note: p.note || null,
    created_at: p.created_at,
  }));

  return {
    items,
    totals: {
      count: totalCount,
      amount: formatMoney(totalMinor),
    },
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: totalCount,
    },
  };
}

module.exports = {
  countSubscriptionsByStatus,
  getInvoicedTotal,
  getCollectedTotal,
  getOutstandingAndOverdue,
  listOverdueInvoices,
  listPaymentsReport,
};
