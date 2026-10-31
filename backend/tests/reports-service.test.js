import { describe, it, expect } from 'vitest';
import {
  daysBetween,
  validateDateRange,
  isInvoiceOverdue,
  computeDaysOverdue,
  assembleSummaryReport,
} from '../src/services/reports.service.js';

describe('Reports Service (Pure Logic & Rules)', () => {
  describe('daysBetween', () => {
    it('calculates exact difference in whole days', () => {
      expect(daysBetween('2026-10-01', '2026-10-10')).toBe(9);
      expect(daysBetween('2026-10-10', '2026-10-10')).toBe(0);
      expect(daysBetween('2026-10-15', '2026-10-14')).toBe(-1);
    });
  });

  describe('validateDateRange', () => {
    it('accepts null or partial ranges', () => {
      expect(() => validateDateRange(null, null)).not.toThrow();
      expect(() => validateDateRange('2026-10-01', null)).not.toThrow();
      expect(() => validateDateRange(null, '2026-10-31')).not.toThrow();
    });

    it('accepts from <= to', () => {
      expect(() => validateDateRange('2026-10-01', '2026-10-01')).not.toThrow();
      expect(() => validateDateRange('2026-10-01', '2026-10-31')).not.toThrow();
    });

    it('throws 400 when from > to', () => {
      expect(() => validateDateRange('2026-11-01', '2026-10-31')).toThrowError(
        /"from" date must be on or before "to" date/
      );
    });
  });

  describe('isInvoiceOverdue', () => {
    const today = '2026-10-25';

    it('due today is strictly NOT overdue', () => {
      const inv = { status: 'confirmed', due_date: '2026-10-25' };
      expect(isInvoiceOverdue(inv, 10000, today)).toBe(false);
    });

    it('due in future is NOT overdue', () => {
      const inv = { status: 'confirmed', due_date: '2026-10-26' };
      expect(isInvoiceOverdue(inv, 10000, today)).toBe(false);
    });

    it('due yesterday with balance > 0 IS overdue', () => {
      const inv = { status: 'confirmed', due_date: '2026-10-24' };
      expect(isInvoiceOverdue(inv, 5000, today)).toBe(true);
    });

    it('settled balance (0) is NEVER overdue', () => {
      const inv = { status: 'confirmed', due_date: '2026-10-20' };
      expect(isInvoiceOverdue(inv, 0, today)).toBe(false);
    });

    it('draft and cancelled invoices are NEVER overdue', () => {
      expect(isInvoiceOverdue({ status: 'draft', due_date: '2026-10-20' }, 1000, today)).toBe(false);
      expect(isInvoiceOverdue({ status: 'cancelled', due_date: '2026-10-20' }, 1000, today)).toBe(false);
    });
  });

  describe('computeDaysOverdue', () => {
    const today = '2026-10-25';

    it('returns 0 when not overdue', () => {
      expect(computeDaysOverdue('2026-10-25', today)).toBe(0);
      expect(computeDaysOverdue('2026-10-30', today)).toBe(0);
    });

    it('returns positive whole days overdue when past due', () => {
      expect(computeDaysOverdue('2026-10-20', today)).toBe(5);
      expect(computeDaysOverdue('2026-10-24', today)).toBe(1);
    });
  });

  describe('assembleSummaryReport', () => {
    it('formats all financial metrics to 2 decimal places and provides as_of date', () => {
      const report = assembleSummaryReport({
        activeSubscriptions: 42,
        pausedSubscriptions: 3,
        revenueInvoicedMinor: 497016,
        revenueCollectedMinor: 250000,
        outstandingMinor: 247016,
        overdueCount: 4,
        overdueAmountMinor: 150000,
        today: '2026-10-31',
        filters: { from: '2026-10-01', to: '2026-10-31', customer_id: null, plan_id: null },
      });

      expect(report.active_subscriptions).toBe(42);
      expect(report.paused_subscriptions).toBe(3);
      expect(report.revenue_invoiced).toBe('4970.16');
      expect(report.revenue_collected).toBe('2500.00');
      expect(report.outstanding_balance).toBe('2470.16');
      expect(report.overdue_count).toBe(4);
      expect(report.overdue_amount).toBe('1500.00');
      expect(report.as_of).toBe('2026-10-31');
    });
  });
});
