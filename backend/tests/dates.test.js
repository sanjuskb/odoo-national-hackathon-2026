import { describe, it, expect } from 'vitest';
import { toDateOnly, addDays, addPeriod, daysInMonth } from '../src/utils/dates.js';

describe('src/utils/dates.js Unit Tests', () => {
  describe('toDateOnly', () => {
    it('normalises YYYY-MM-DD string as-is', () => {
      expect(toDateOnly('2026-10-31')).toBe('2026-10-31');
    });

    it('normalises full ISO string to UTC date-only', () => {
      expect(toDateOnly('2026-10-31T23:59:59.999Z')).toBe('2026-10-31');
      expect(toDateOnly('2026-11-01T00:00:00.000Z')).toBe('2026-11-01');
    });

    it('normalises Date objects using UTC parts', () => {
      const d = new Date(Date.UTC(2026, 0, 15));
      expect(toDateOnly(d)).toBe('2026-01-15');
    });

    it('throws on missing or invalid date inputs', () => {
      expect(() => toDateOnly(null)).toThrow(TypeError);
      expect(() => toDateOnly(undefined)).toThrow(TypeError);
      expect(() => toDateOnly('not-a-date')).toThrow(RangeError);
      expect(() => toDateOnly(12345)).toThrow(TypeError);
    });
  });

  describe('daysInMonth', () => {
    it('calculates correct days in leap and non-leap years', () => {
      expect(daysInMonth(2026, 2)).toBe(28); // non-leap
      expect(daysInMonth(2024, 2)).toBe(29); // leap
      expect(daysInMonth(2026, 1)).toBe(31);
      expect(daysInMonth(2026, 4)).toBe(30);
    });
  });

  describe('addDays', () => {
    it('adds positive days', () => {
      expect(addDays('2026-01-10', 5)).toBe('2026-01-15');
      expect(addDays('2026-01-30', 2)).toBe('2026-02-01');
    });

    it('adds across year boundaries', () => {
      expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    });

    it('throws on invalid days', () => {
      expect(() => addDays('2026-01-01', '5')).toThrow(TypeError);
      expect(() => addDays('2026-01-01', NaN)).toThrow(TypeError);
    });
  });

  describe('addPeriod - Daily', () => {
    it('adds 1 day for count=1', () => {
      expect(addPeriod('2026-01-01', 'daily')).toBe('2026-01-02');
    });

    it('adds n days for count=n', () => {
      expect(addPeriod('2026-01-01', 'daily', 10)).toBe('2026-01-11');
    });
  });

  describe('addPeriod - Weekly', () => {
    it('adds 7 days for count=1', () => {
      expect(addPeriod('2026-01-01', 'weekly')).toBe('2026-01-08');
    });

    it('adds 14 days for count=2', () => {
      expect(addPeriod('2026-01-01', 'weekly', 2)).toBe('2026-01-15');
    });
  });

  describe('addPeriod - Monthly & Month-end Clamping', () => {
    it('adds standard month when days fit', () => {
      expect(addPeriod('2026-03-15', 'monthly', 1)).toBe('2026-04-15');
    });

    it('clamps Jan 31 to Feb 28 on non-leap year (2026)', () => {
      expect(addPeriod('2026-01-31', 'monthly', 1)).toBe('2026-02-28');
    });

    it('clamps Jan 31 to Feb 29 on leap year (2024)', () => {
      expect(addPeriod('2024-01-31', 'monthly', 1)).toBe('2024-02-29');
    });

    it('clamps Aug 31 to Sep 30', () => {
      expect(addPeriod('2026-08-31', 'monthly', 1)).toBe('2026-09-30');
    });

    it('handles year boundary on monthly recurrence', () => {
      expect(addPeriod('2026-12-15', 'monthly', 1)).toBe('2027-01-15');
      expect(addPeriod('2026-11-30', 'monthly', 2)).toBe('2027-01-30');
    });
  });

  describe('addPeriod - Yearly & Leap Year Clamping', () => {
    it('adds 1 year normally', () => {
      expect(addPeriod('2026-05-10', 'yearly', 1)).toBe('2027-05-10');
    });

    it('clamps Feb 29 in leap year 2024 to Feb 28 in non-leap year 2025', () => {
      expect(addPeriod('2024-02-29', 'yearly', 1)).toBe('2025-02-28');
    });

    it('preserves Feb 29 from 2024 to 2028 (+4 years)', () => {
      expect(addPeriod('2024-02-29', 'yearly', 4)).toBe('2028-02-29');
    });

    it('handles Dec 31 year boundary', () => {
      expect(addPeriod('2026-12-31', 'yearly', 1)).toBe('2027-12-31');
    });
  });

  describe('addPeriod - Edge Cases and Validation', () => {
    it('returns same date for count=0', () => {
      expect(addPeriod('2026-01-15', 'monthly', 0)).toBe('2026-01-15');
    });

    it('throws on unsupported frequency', () => {
      expect(() => addPeriod('2026-01-15', 'biweekly')).toThrow(RangeError);
    });

    it('throws on negative or invalid count', () => {
      expect(() => addPeriod('2026-01-15', 'monthly', -1)).toThrow(TypeError);
      expect(() => addPeriod('2026-01-15', 'monthly', '2')).toThrow(TypeError);
    });
  });
});

