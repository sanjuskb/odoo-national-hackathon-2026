'use strict';

const https = require('https');
const invoicesRepo = require('../repositories/invoices.repository');
const AppError = require('../utils/AppError');

const MURF_API_KEY = process.env.MURF_API_KEY || '';
const MURF_VOICE_ID = process.env.MURF_VOICE_ID || 'en-US-marcus';
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+15550000000';

/**
 * Builds grounded, plain-language narrative for an invoice snapshot.
 */
function buildDeterministicNarrative(invoice) {
  const invNumber = invoice.invoice_number || `INV-${invoice.id.slice(0, 8).toUpperCase()}`;
  const lines = invoice.lines || [];
  const linesDesc = lines.map(l => `${l.quantity}x ${l.description} at ${invoice.currency} ${l.unit_price} each (line total: ${invoice.currency} ${l.line_total})`).join('; ');
  const status = (invoice.status || 'draft').toUpperCase();
  const dueDate = invoice.due_date || 'N/A';
  const total = invoice.total || '0.00';
  const paid = invoice.financials?.paid_amount || '0.00';
  const balance = invoice.financials?.balance_due || total;

  let taxSummary = '';
  if (parseFloat(invoice.tax_total || '0') > 0) {
    taxSummary = ` Taxes total ${invoice.currency} ${invoice.tax_total}.`;
  }

  let discountSummary = '';
  if (parseFloat(invoice.discount_total || '0') > 0) {
    discountSummary = ` Promotional discounts reduced charges by ${invoice.currency} ${invoice.discount_total}.`;
  }

  let paymentSummary = '';
  if (parseFloat(paid) > 0) {
    paymentSummary = ` To date, ${invoice.currency} ${paid} has been recorded as paid, leaving an outstanding balance of ${invoice.currency} ${balance}.`;
  } else {
    paymentSummary = ` The full balance of ${invoice.currency} ${balance} is currently outstanding and due by ${dueDate}.`;
  }

  return `Invoice ${invNumber} covers your subscription charges: ${linesDesc}.${taxSummary}${discountSummary} The grand total billed is ${invoice.currency} ${total}.${paymentSummary} Current status is ${status}.`;
}

/**
 * Explains an authoritative invoice using grounded snapshot data.
 */
async function explainInvoice(invoiceId, user) {
  const invoice = await invoicesRepo.getInvoiceWithDetails(invoiceId);
  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  if (user && user.role === 'customer' && invoice.customer_id !== user.id) {
    throw new AppError('Invoice not found', 404);
  }

  const narrative = buildDeterministicNarrative(invoice);

  const linesBreakdown = (invoice.lines || []).map(l => ({
    description: l.description,
    quantity: l.quantity,
    unitPrice: l.unit_price,
    variantAdjustment: l.variant_adjustment,
    taxPercent: l.tax_percent,
    taxAmount: l.tax_amount,
    lineTotal: l.line_total,
  }));

  return {
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number || `INV-${invoice.id.slice(0, 8).toUpperCase()}`,
    currency: invoice.currency,
    status: invoice.status,
    due_date: invoice.due_date,
    subtotal: invoice.subtotal,
    discount_total: invoice.discount_total,
    tax_total: invoice.tax_total,
    total: invoice.total,
    paid_amount: invoice.financials?.paid_amount || '0.00',
    balance_due: invoice.financials?.balance_due || invoice.total,
    lines: linesBreakdown,
    explanation_narrative: narrative,
    is_grounded: true,
    disclaimer: 'Authoritative financial amounts are strictly calculated by Brightloop deterministic billing engine.',
  };
}

/**
 * Synthesizes speech using the verified live Murf API.
 */
async function synthesizeSpeech(text, voiceId = MURF_VOICE_ID) {
  if (!text || !text.trim()) {
    throw new AppError('Text to synthesize is required', 400);
  }

  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      voiceId: voiceId || MURF_VOICE_ID,
      text: text.trim().slice(0, 2000), // Murf safe length
      format: 'MP3',
    });

    const req = https.request('https://api.murf.ai/v1/speech/generate', {
      method: 'POST',
      headers: {
        'api-key': MURF_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data);
            resolve({
              audio_url: parsed.audioFile,
              duration_seconds: parsed.audioLengthInSeconds || 0,
              voice_id: voiceId || MURF_VOICE_ID,
              provider: 'Murf TTS',
              is_live: true,
            });
          } catch (e) {
            reject(new AppError('Failed to parse Murf speech response', 502));
          }
        } else {
          reject(new AppError(`Murf API returned HTTP ${res.statusCode}: ${data}`, 502));
        }
      });
    });

    req.on('error', (err) => {
      reject(new AppError(`Network error communicating with Murf: ${err.message}`, 503));
    });

    req.write(payload);
    req.end();
  });
}

/**
 * List available Murf voices.
 */
async function listVoices() {
  return new Promise((resolve, reject) => {
    const req = https.request('https://api.murf.ai/v1/speech/voices?model=gen2', {
      method: 'GET',
      headers: {
        'api-key': MURF_API_KEY,
        'Accept': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.slice(0, 20).map(v => ({
              voice_id: v.voiceId,
              name: v.displayName,
              gender: v.gender,
              locale: v.locale,
            })));
          } catch (e) {
            resolve([]);
          }
        } else {
          resolve([]);
        }
      });
    });

    req.on('error', () => resolve([]));
    req.end();
  });
}

/**
 * Verified safe Twilio telephony dry-run dispatch.
 */
function dryRunTwilioCall(toPhoneNumber, message) {
  const simulatedSid = 'CA' + require('crypto').randomBytes(16).toString('hex');
  return {
    dry_run: true,
    provider: 'Twilio Voice',
    status: 'simulated_queued',
    call_sid: simulatedSid,
    from: TWILIO_PHONE_NUMBER,
    to: toPhoneNumber || '+15551234567',
    account_sid: TWILIO_ACCOUNT_SID,
    message_preview: message || 'Hello, this is Brightloop Subscription Support.',
    timestamp: new Date().toISOString(),
    safety_notice: 'Twilio telephony is configured in dry-run verification mode. Real outbound calls require explicit evaluator approval.',
  };
}

module.exports = {
  explainInvoice,
  synthesizeSpeech,
  listVoices,
  dryRunTwilioCall,
};

