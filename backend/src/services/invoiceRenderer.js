'use strict';

/**
 * HTML Escaping utility to prevent XSS in server-rendered templates.
 * Converts &, <, >, ", ' to safe HTML entities.
 *
 * @param {any} val
 * @returns {string}
 */
function escapeHtml(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Renders an invoice with lines, payments, and financials into clean, printable HTML.
 * All text fields are strictly HTML-escaped.
 *
 * @param {object} invoiceWithDetails
 * @returns {string} HTML string
 */
function renderInvoiceHtml(invoiceWithDetails) {
  const inv = invoiceWithDetails;
  const lines = inv.lines || [];
  const payments = inv.payments || [];
  const financials = inv.financials || {};

  const linesHtml = lines
    .map(
      (line, idx) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(line.description || 'Line Item')}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${escapeHtml(line.quantity)}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${escapeHtml(line.unit_price)}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${escapeHtml(line.tax_rate_percent)}%</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 500;">${escapeHtml(line.line_total)}</td>
      </tr>
    `
    )
    .join('');

  const paymentsHtml =
    payments.length > 0
      ? `
      <div style="margin-top: 32px;">
        <h3 style="font-size: 16px; font-weight: 600; color: #1e293b; margin-bottom: 12px;">Payment History</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background-color: #f8fafc; text-align: left; color: #64748b; font-weight: 600;">
              <th style="padding: 8px 12px; border-bottom: 1px solid #cbd5e1;">Date</th>
              <th style="padding: 8px 12px; border-bottom: 1px solid #cbd5e1;">Method</th>
              <th style="padding: 8px 12px; border-bottom: 1px solid #cbd5e1;">Reference</th>
              <th style="padding: 8px 12px; border-bottom: 1px solid #cbd5e1; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${payments
              .map(
                (p) => `
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(p.payment_date)}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-transform: capitalize;">${escapeHtml(p.method)}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(p.reference || '—')}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 500;">${escapeHtml(p.amount)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `
      : '';

  const statusColor =
    inv.status === 'paid'
      ? '#16a34a'
      : inv.status === 'confirmed'
      ? '#2563eb'
      : inv.status === 'cancelled'
      ? '#dc2626'
      : '#64748b';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${escapeHtml(inv.invoice_number)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #334155;
      background-color: #ffffff;
      margin: 0;
      padding: 40px;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 36px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    @media print {
      body { padding: 0; background: none; }
      .invoice-card { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px;">
      <div>
        <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 6px 0;">Brightloop Subscriptions</h1>
        <p style="margin: 0; color: #64748b; font-size: 14px;">Automated Subscription & Billing Management</p>
      </div>
      <div style="text-align: right;">
        <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; background-color: ${statusColor}15; color: ${statusColor};">
          ${escapeHtml(inv.status)}
        </span>
        <h2 style="font-size: 18px; font-weight: 600; color: #334155; margin: 8px 0 0 0;">${escapeHtml(inv.invoice_number)}</h2>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; font-size: 14px;">
      <div>
        <p style="margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; color: #94a3b8; font-weight: 600;">Customer</p>
        <p style="margin: 0; font-weight: 500; color: #1e293b;">${escapeHtml(inv.customer_id)}</p>
        ${inv.subscription_id ? `<p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Subscription: ${escapeHtml(inv.subscription_id)}</p>` : ''}
      </div>
      <div style="text-align: right;">
        <p style="margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; color: #94a3b8; font-weight: 600;">Dates</p>
        <p style="margin: 0; color: #475569;">Billing Period: ${escapeHtml(inv.billing_period_start || '—')} to ${escapeHtml(inv.billing_period_end || '—')}</p>
        <p style="margin: 4px 0 0 0; color: #475569;">Due Date: <strong>${escapeHtml(inv.due_date || '—')}</strong></p>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
      <thead>
        <tr style="background-color: #f8fafc; text-align: left; color: #64748b; font-weight: 600;">
          <th style="padding: 10px 12px; border-bottom: 2px solid #e2e8f0; width: 40px; text-align: center;">#</th>
          <th style="padding: 10px 12px; border-bottom: 2px solid #e2e8f0;">Item & Description</th>
          <th style="padding: 10px 12px; border-bottom: 2px solid #e2e8f0; text-align: right;">Qty</th>
          <th style="padding: 10px 12px; border-bottom: 2px solid #e2e8f0; text-align: right;">Unit Price</th>
          <th style="padding: 10px 12px; border-bottom: 2px solid #e2e8f0; text-align: right;">Tax %</th>
          <th style="padding: 10px 12px; border-bottom: 2px solid #e2e8f0; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml}
      </tbody>
    </table>

    <div style="display: flex; justify-content: flex-end; margin-bottom: 32px;">
      <div style="width: 280px; font-size: 14px;">
        <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #64748b;">
          <span>Subtotal:</span>
          <span style="font-weight: 500; color: #1e293b;">${escapeHtml(inv.subtotal)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #64748b;">
          <span>Discount:</span>
          <span style="font-weight: 500; color: #16a34a;">-${escapeHtml(inv.discount_total)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #64748b;">
          <span>Tax:</span>
          <span style="font-weight: 500; color: #1e293b;">${escapeHtml(inv.tax_total)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-top: 2px solid #e2e8f0; margin-top: 6px; font-size: 16px; font-weight: 700; color: #0f172a;">
          <span>Total:</span>
          <span>${escapeHtml(inv.total)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #64748b;">
          <span>Paid:</span>
          <span style="font-weight: 500; color: #1e293b;">${escapeHtml(financials.paid_amount || '0.00')}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-top: 1px dashed #cbd5e1; margin-top: 4px; font-weight: 700; color: ${financials.balance_due === '0.00' ? '#16a34a' : '#b91c1c'};">
          <span>Balance Due:</span>
          <span>${escapeHtml(financials.balance_due || inv.total)}</span>
        </div>
      </div>
    </div>

    ${paymentsHtml}

    <div class="no-print" style="margin-top: 40px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 24px;">
      <button onclick="window.print()" style="background-color: #0f172a; color: #ffffff; border: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer;">
        Print Invoice
      </button>
    </div>
  </div>
</body>
</html>`;
}

module.exports = {
  escapeHtml,
  renderInvoiceHtml,
};

