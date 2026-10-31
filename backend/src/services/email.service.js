'use strict';

const AppError = require('../utils/AppError');
const { renderInvoiceHtml } = require('./invoiceRenderer');

/**
 * Sends an invoice via Resend HTTP API using global fetch.
 * Returns 503 if email configuration is absent.
 *
 * @param {object} params
 * @param {object} params.invoiceWithDetails
 * @param {string} params.toEmail
 * @returns {Promise<{ sent: boolean, messageId?: string }>}
 */
async function sendInvoiceEmail({ invoiceWithDetails, toEmail }) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.MAIL_FROM;

  if (!apiKey || !fromEmail) {
    throw new AppError(
      'Email delivery service is not configured (RESEND_API_KEY or MAIL_FROM missing)',
      503,
      'EMAIL_SERVICE_NOT_CONFIGURED'
    );
  }

  if (!toEmail) {
    throw new AppError('Recipient email is required to send invoice', 400);
  }

  const htmlContent = renderInvoiceHtml(invoiceWithDetails);

  const payload = {
    from: fromEmail,
    to: [toEmail],
    subject: `Invoice ${invoiceWithDetails.invoice_number} from Brightloop`,
    html: htmlContent,
  };

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new AppError(
        data?.message || 'Email provider rejected message',
        502,
        'EMAIL_PROVIDER_ERROR'
      );
    }

    return {
      sent: true,
      messageId: data?.id,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Failed to send email: ${err.message}`, 502, 'EMAIL_SEND_FAILED');
  }
}

module.exports = {
  sendInvoiceEmail,
};

