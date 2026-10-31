import { describe, it, expect } from 'vitest';
import {
  toMinorUnits,
  computeInvoiceFinancials,
  canTransition,
  validatePaymentAmount,
} from '../src/services/invoice.service.js';
import AppError from '../src/utils/AppError.js';

describe('Invoice Financials & Transition Service', () => {
  describe('toMinorUnits', () => {
    it('correctly parses decimal strings and numbers to minor units', () => {
      expect(toMinorUnits('4970.16')).toBe(497016);
      expect(toMinorUnits(4970.16)).toBe(497016);
      expect(toMinorUnits('100')).toBe(10000);
      expect(toMinorUnits(0)).toBe(0);
    });

    it('throws error for invalid or missing amounts', () => {
      expect(() => toMinorUnits(null)).toThrow(/Amount is required/);
      expect(() => toMinorUnits(-50)).toThrow(/cannot be negative/);
      expect(() => toMinorUnits('abc')).toThrow(/Invalid money format/);
    });
  });

  describe('computeInvoiceFinancials', () => {
    const baseInvoice = {
      id: 'inv-1',
      total: '1000.00',
      status: 'confirmed',
      due_date: '2026-10-15',
    };

    it('calculates initial balance when no payments exist', () => {
      const res = computeInvoiceFinancials(baseInvoice, [], '2026-10-10');
      expect(res.total).toBe('1000.00');
      expect(res.paid_amount).toBe('0.00');
      expect(res.balance_due).toBe('1000.00');
      expect(res.is_overdue).toBe(false);
      expect(res.computed_status).toBe('confirmed');
    });

    it('calculates partial payment balance and status before due date', () => {
      const payments = [{ amount: '400.00' }];
      const res = computeInvoiceFinancials(baseInvoice, payments, '2026-10-10');
      expect(res.paid_amount).toBe('400.00');
      expect(res.balance_due).toBe('600.00');
      expect(res.is_overdue).toBe(false);
      expect(res.computed_status).toBe('confirmed');
    });

    it('detects overdue status when past due date with remaining balance', () => {
      const payments = [{ amount: '400.00' }];
      const res = computeInvoiceFinancials(baseInvoice, payments, '2026-10-16');
      expect(res.balance_due).toBe('600.00');
      expect(res.is_overdue).toBe(true);
      expect(res.computed_status).toBe('overdue');
    });

    it('full payment marks balance_due 0 and computed_status paid even after due date', () => {
      const payments = [{ amount: '400.00' }, { amount: '600.00' }];
      const res = computeInvoiceFinancials(baseInvoice, payments, '2026-10-20');
      expect(res.paid_amount).toBe('1000.00');
      expect(res.balance_due).toBe('0.00');
      expect(res.is_overdue).toBe(false);
      expect(res.computed_status).toBe('paid');
    });

    it('draft invoices are never marked overdue', () => {
      const draft = { ...baseInvoice, status: 'draft' };
      const res = computeInvoiceFinancials(draft, [], '2026-10-20');
      expect(res.is_overdue).toBe(false);
      expect(res.computed_status).toBe('draft');
    });

    it('cancelled invoices retain cancelled computed_status', () => {
      const cancelled = { ...baseInvoice, status: 'cancelled' };
      const res = computeInvoiceFinancials(cancelled, [], '2026-10-20');
      expect(res.is_overdue).toBe(false);
      expect(res.computed_status).toBe('cancelled');
    });
  });

  describe('canTransition', () => {
    it('allows confirm only for draft invoices', () => {
      expect(canTransition({ status: 'draft' }, 'confirm')).toEqual({ allowed: true });
      expect(canTransition({ status: 'confirmed' }, 'confirm').allowed).toBe(false);
      expect(canTransition({ status: 'paid' }, 'confirm').allowed).toBe(false);
    });

    it('allows cancel for draft invoices', () => {
      expect(canTransition({ status: 'draft' }, 'cancel')).toEqual({ allowed: true });
    });

    it('allows cancel for confirmed invoices with 0 payments', () => {
      expect(canTransition({ status: 'confirmed' }, 'cancel', { payments: [] })).toEqual({
        allowed: true,
      });
    });

    it('rejects cancel for confirmed invoices with recorded payments (409)', () => {
      const res = canTransition({ status: 'confirmed' }, 'cancel', {
        payments: [{ amount: '100.00' }],
      });
      expect(res.allowed).toBe(false);
      expect(res.statusCode).toBe(409);
      expect(res.reason).toContain('recorded payments');
    });

    it('rejects cancel for already paid or cancelled invoices', () => {
      expect(canTransition({ status: 'paid' }, 'cancel').allowed).toBe(false);
      expect(canTransition({ status: 'cancelled' }, 'cancel').allowed).toBe(false);
    });

    it('allows send only for confirmed or paid invoices', () => {
      expect(canTransition({ status: 'draft' }, 'send').allowed).toBe(false);
      expect(canTransition({ status: 'confirmed' }, 'send')).toEqual({ allowed: true });
      expect(canTransition({ status: 'paid' }, 'send')).toEqual({ allowed: true });
      expect(canTransition({ status: 'cancelled' }, 'send').allowed).toBe(false);
    });

    it('allows print for any status', () => {
      expect(canTransition({ status: 'draft' }, 'print')).toEqual({ allowed: true });
      expect(canTransition({ status: 'confirmed' }, 'print')).toEqual({ allowed: true });
      expect(canTransition({ status: 'paid' }, 'print')).toEqual({ allowed: true });
      expect(canTransition({ status: 'cancelled' }, 'print')).toEqual({ allowed: true });
    });

    it('allows pay only for confirmed invoices', () => {
      expect(canTransition({ status: 'confirmed' }, 'pay')).toEqual({ allowed: true });
      expect(canTransition({ status: 'draft' }, 'pay').allowed).toBe(false);
      expect(canTransition({ status: 'paid' }, 'pay').allowed).toBe(false);
      expect(canTransition({ status: 'cancelled' }, 'pay').allowed).toBe(false);
    });
  });

  describe('validatePaymentAmount', () => {
    const invoice = { id: 'inv-1', total: '500.00', status: 'confirmed' };

    it('accepts valid payment amount within balance', () => {
      const res = validatePaymentAmount(invoice, [], '200.00');
      expect(res.amountMinor).toBe(20000);
      expect(res.amountFormatted).toBe('200.00');
      expect(res.willPayInFull).toBe(false);
    });

    it('detects when payment will settle invoice in full', () => {
      const res = validatePaymentAmount(invoice, [{ amount: '300.00' }], '200.00');
      expect(res.willPayInFull).toBe(true);
    });

    it('rejects zero or negative payment amounts', () => {
      expect(() => validatePaymentAmount(invoice, [], '0.00')).toThrowError(/greater than zero/);
      expect(() => validatePaymentAmount(invoice, [], '-10.00')).toThrowError(/cannot be negative/);
    });

    it('rejects overpayments exceeding remaining balance', () => {
      expect(() => validatePaymentAmount(invoice, [{ amount: '400.00' }], '150.00')).toThrowError(
        /exceeds remaining balance/
      );
    });
  });
});
