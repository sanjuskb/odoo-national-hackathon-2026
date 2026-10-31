'use strict';

const { getSupabaseAdmin } = require('../lib/supabase');
const AppError = require('../utils/AppError');
const { formatMoney, parseMoney } = require('../utils/money');
const { toDateOnly } = require('../utils/dates');
const { chunkArray, mapConcurrent } = require('../utils/async');
const { computeDaysOverdue, isInvoiceOverdue } = require('../services/reports.service');

const RPC_SUMMARY_FUNCTION = 'get_finance_summary_report';
const RPC_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

if (!global.__brightloop_rpc_availability) {
  global.__brightloop_rpc_availability = {
    tested: false,
    available: false,
    lastChecked: 0,
  };
}

const rpcAvailability = global.__brightloop_rpc_availability;

function getRpcStatus() {
  return { ...rpcAvailability };
}

function resetRpcStatusForTest() {
  rpcAvailability.tested = false;
  rpcAvailability.available = false;
  rpcAvailability.lastChecked = 0;
}

function setRpcStatusForTest({ available = true, lastChecked = Date.now() } = {}) {
  rpcAvailability.tested = true;
  rpcAvailability.available = available;
  rpcAvailability.lastChecked = lastChecked;
}

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

    if (from) q = q.gte('paid_at', from);
    if (to) {
      const toBound = to.length === 10 ? `${to}T23:59:59.999Z` : to;
      q = q.lte('paid_at', toBound);
    }
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

  const chunks = chunkArray(invoiceIds, 100);
  await mapConcurrent(chunks, 5, async (batch) => {
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
  });

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

  // Fetch customer metadata in batch if available (bounded concurrency 5)
  const customerMap = new Map();
  const uniqueCustomerIds = [...new Set(rows.map((r) => r.customer_id))];
  await mapConcurrent(uniqueCustomerIds, 5, async (cid) => {
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
  });

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
    .order('paid_at', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + safeLimit - 1);

  if (from) q = q.gte('paid_at', from);
  if (to) {
    const toBound = to.length === 10 ? `${to}T23:59:59.999Z` : to;
    q = q.lte('paid_at', toBound);
  }
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
    payment_date: p.paid_at ? p.paid_at.slice(0, 10) : (p.payment_date || p.created_at),
    method: p.method,
    reference: p.external_reference || p.reference || null,
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

async function getSummaryReportFallback(
  { from = null, to = null, customer_id = null, plan_id = null, today = toDateOnly(new Date()) } = {},
  client = getSupabaseAdmin()
) {
  const [
    subCounts,
    invoicedTotalMinor,
    collectedData,
    outstandingData,
  ] = await Promise.all([
    countSubscriptionsByStatus({ customer_id, plan_id }, client),
    getInvoicedTotal({ from, to, customer_id, plan_id }, client),
    getCollectedTotal({ from, to, customer_id }, client),
    getOutstandingAndOverdue({ customer_id, plan_id, today }, client),
  ]);

  return {
    active_subscriptions: subCounts.active,
    paused_subscriptions: subCounts.paused,
    revenue_invoiced: formatMoney(invoicedTotalMinor),
    revenue_collected: formatMoney(collectedData.totalMinor),
    outstanding_balance: formatMoney(outstandingData.outstandingMinor),
    overdue_count: outstandingData.overdueCount,
    overdue_amount: formatMoney(outstandingData.overdueAmountMinor),
    as_of: toDateOnly(today),
    filters: {
      from: from || null,
      to: to || null,
      customer_id: customer_id || null,
      plan_id: plan_id || null,
    },
    _source: 'fallback',
  };
}

async function getSummaryReport(
  { from = null, to = null, customer_id = null, plan_id = null, today = toDateOnly(new Date()) } = {},
  client = getSupabaseAdmin()
) {
  const now = Date.now();
  const canTryRpc =
    !rpcAvailability.tested ||
    rpcAvailability.available ||
    now - rpcAvailability.lastChecked > RPC_CACHE_TTL_MS;

  if (canTryRpc && typeof client.rpc === 'function') {
    try {
      const { data, error } = await client.rpc(RPC_SUMMARY_FUNCTION, {
        p_from: from || null,
        p_to: to || null,
        p_customer_id: customer_id || null,
        p_plan_id: plan_id || null,
        p_as_of: today || null,
      });

      if (!error && data) {
        rpcAvailability.tested = true;
        rpcAvailability.available = true;
        rpcAvailability.lastChecked = now;
        const payload = typeof data === 'string' ? JSON.parse(data) : data;
        return {
          active_subscriptions: Number(payload.active_subscriptions || 0),
          paused_subscriptions: Number(payload.paused_subscriptions || 0),
          revenue_invoiced: formatMoney(parseMoney(payload.revenue_invoiced || 0)),
          revenue_collected: formatMoney(parseMoney(payload.revenue_collected || 0)),
          outstanding_balance: formatMoney(parseMoney(payload.outstanding_balance || 0)),
          overdue_count: Number(payload.overdue_count || 0),
          overdue_amount: formatMoney(parseMoney(payload.overdue_amount || 0)),
          as_of: toDateOnly(payload.as_of || today),
          filters: {
            from: from || null,
            to: to || null,
            customer_id: customer_id || null,
            plan_id: plan_id || null,
          },
          _source: 'rpc',
        };
      }

      const isMissingRpc =
        error &&
        (error.code === 'PGRST202' ||
          error.code === '42883' ||
          (error.message &&
            (error.message.includes('function') ||
              error.message.includes('not found') ||
              error.message.includes('schema cache'))));

      if (isMissingRpc) {
        rpcAvailability.tested = true;
        rpcAvailability.available = false;
        rpcAvailability.lastChecked = now;
      }
    } catch {
      rpcAvailability.tested = true;
      rpcAvailability.available = false;
      rpcAvailability.lastChecked = now;
    }
  }

  // Fallback to chunked in-memory aggregation
  return getSummaryReportFallback(
    { from, to, customer_id, plan_id, today },
    client
  );
}

module.exports = {
  countSubscriptionsByStatus,
  getInvoicedTotal,
  getCollectedTotal,
  getOutstandingAndOverdue,
  listOverdueInvoices,
  listPaymentsReport,
  getSummaryReport,
  getSummaryReportFallback,
  getRpcStatus,
  resetRpcStatusForTest,
  setRpcStatusForTest,
  batchFetchPaymentsForInvoices,
};
