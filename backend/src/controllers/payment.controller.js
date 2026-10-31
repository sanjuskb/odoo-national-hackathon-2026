'use strict';

const paymentsRepo = require('../repositories/payments.repository');
const invoicesRepo = require('../repositories/invoices.repository');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/response');

async function recordPayment(req, res, next) {
  try {
    const invoiceId = req.params.id;
    const { amount, payment_date, method, reference, note } = req.body;

    const result = await paymentsRepo.recordPayment({
      invoice_id: invoiceId,
      amount,
      payment_date,
      method,
      reference,
      note,
    });

    return sendSuccess(res, result, 'Payment recorded successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function listPayments(req, res, next) {
  try {
    const filters = {
      page: req.query.page,
      page_size: req.query.page_size,
      limit: req.query.limit,
      invoice_id: req.query.invoice_id,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
    };

    const result = await paymentsRepo.list(filters);
    return sendSuccess(res, result, 'Payments retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function listInvoicePayments(req, res, next) {
  try {
    const invoiceId = req.params.id;
    const invoice = await invoicesRepo.findById(invoiceId);

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (req.user && req.user.role === 'customer' && invoice.customer_id !== req.user.id) {
      throw new AppError('Invoice not found', 404);
    }

    const payments = await paymentsRepo.listByInvoiceId(invoiceId);
    return sendSuccess(res, { payments }, 'Invoice payments retrieved successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  recordPayment,
  listPayments,
  listInvoicePayments,
};

