'use strict';

const invoicesRepo = require('../repositories/invoices.repository');
const { canTransition } = require('../services/invoice.service');
const { renderInvoiceHtml } = require('../services/invoiceRenderer');
const { sendInvoiceEmail } = require('../services/email.service');
const { explainInvoice: explainInvoiceService, synthesizeSpeech } = require('../services/aiVoice.service');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/response');

async function listInvoices(req, res, next) {
  try {
    const filters = {
      page: req.query.page,
      page_size: req.query.page_size,
      limit: req.query.limit,
      status: req.query.status,
      overdue: req.query.overdue,
      due_before: req.query.due_before,
      due_after: req.query.due_after,
    };

    if (req.user && req.user.role === 'customer') {
      filters.customer_id = req.user.id;
    } else if (req.query.customer_id) {
      filters.customer_id = req.query.customer_id;
    }

    const result = await invoicesRepo.list(filters);
    return sendSuccess(res, result, 'Invoices retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function getInvoice(req, res, next) {
  try {
    const invoice = await invoicesRepo.getInvoiceWithDetails(req.params.id);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (req.user && req.user.role === 'customer' && invoice.customer_id !== req.user.id) {
      throw new AppError('Invoice not found', 404);
    }

    return sendSuccess(res, { invoice }, 'Invoice retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function confirmInvoice(req, res, next) {
  try {
    const invoice = await invoicesRepo.confirmInvoice(req.params.id);
    return sendSuccess(res, { invoice }, 'Invoice confirmed successfully');
  } catch (err) {
    next(err);
  }
}

async function cancelInvoice(req, res, next) {
  try {
    const invoice = await invoicesRepo.cancelInvoice(req.params.id);
    return sendSuccess(res, { invoice }, 'Invoice cancelled successfully');
  } catch (err) {
    next(err);
  }
}

async function sendInvoice(req, res, next) {
  try {
    const invoiceWithDetails = await invoicesRepo.getInvoiceWithDetails(req.params.id);
    if (!invoiceWithDetails) {
      throw new AppError('Invoice not found', 404);
    }

    const transition = canTransition(invoiceWithDetails, 'send');
    if (!transition.allowed) {
      throw new AppError(transition.reason, transition.statusCode || 400);
    }

    const recipientEmail =
      req.body?.recipient_email ||
      req.user?.email ||
      `customer-${invoiceWithDetails.customer_id}@example.com`;

    const sendResult = await sendInvoiceEmail({
      invoiceWithDetails,
      toEmail: recipientEmail,
    });

    const sentAt = new Date().toISOString();
    const updated = await invoicesRepo.updateStatus(invoiceWithDetails.id, invoiceWithDetails.status, {
      sent_at: sentAt,
    });

    return sendSuccess(
      res,
      { invoice: updated, sent: true, messageId: sendResult.messageId },
      'Invoice sent successfully'
    );
  } catch (err) {
    next(err);
  }
}

async function printInvoice(req, res, next) {
  try {
    const invoiceWithDetails = await invoicesRepo.getInvoiceWithDetails(req.params.id);
    if (!invoiceWithDetails) {
      throw new AppError('Invoice not found', 404);
    }

    if (req.user && req.user.role === 'customer' && invoiceWithDetails.customer_id !== req.user.id) {
      throw new AppError('Invoice not found', 404);
    }

    if (req.query.format === 'html') {
      const html = renderInvoiceHtml(invoiceWithDetails);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    return sendSuccess(res, { invoice: invoiceWithDetails }, 'Printable invoice data retrieved');
  } catch (err) {
    next(err);
  }
}

async function explainInvoice(req, res, next) {
  try {
    const explanation = await explainInvoiceService(req.params.id, req.user);
    return sendSuccess(res, explanation, 'Invoice explanation generated successfully');
  } catch (err) {
    next(err);
  }
}

async function speakInvoice(req, res, next) {
  try {
    const explanation = await explainInvoiceService(req.params.id, req.user);
    const voiceId = req.body?.voice_id;
    const speech = await synthesizeSpeech(explanation.explanation_narrative, voiceId);
    return sendSuccess(res, { explanation, speech }, 'Invoice voice synthesis generated successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listInvoices,
  getInvoice,
  confirmInvoice,
  cancelInvoice,
  sendInvoice,
  printInvoice,
  explainInvoice,
  speakInvoice,
};

