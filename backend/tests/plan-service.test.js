import { describe, it, expect } from 'vitest';
import {
  isPlanAvailable,
  validateQuantityForPlan,
  canPerform,
  shouldAutoClose,
} from '../src/services/plan.service.js';

describe('src/services/plan.service.js Unit Tests', () => {
  const basePlan = {
    id: 'plan-1',
    product_id: 'prod-1',
    price: '99.00',
    frequency: 'monthly',
    min_quantity: 5,
    available_from: '2026-10-15T00:00:00.000Z',
    available_until: '2026-10-31T23:59:59.999Z',
    auto_close: true,
    allow_early_close: true,
    allow_pause: false,
    allow_renew: true,
  };

  describe('isPlanAvailable boundaries', () => {
    it('returns true on start date', () => {
      expect(isPlanAvailable(basePlan, '2026-10-15T00:00:00.000Z')).toBe(true);
    });

    it('returns true on end date', () => {
      expect(isPlanAvailable(basePlan, '2026-10-31T23:59:59.999Z')).toBe(true);
    });

    it('returns true within the window', () => {
      expect(isPlanAvailable(basePlan, '2026-10-20T12:00:00.000Z')).toBe(true);
    });

    it('returns false one second before start date', () => {
      expect(isPlanAvailable(basePlan, '2026-10-14T23:59:59.999Z')).toBe(false);
    });

    it('returns false one second after end date', () => {
      expect(isPlanAvailable(basePlan, '2026-11-01T00:00:00.000Z')).toBe(false);
    });

    it('returns true if plan has no start or end date constraints', () => {
      const openPlan = { ...basePlan, available_from: null, available_until: null };
      expect(isPlanAvailable(openPlan, '2025-01-01T00:00:00.000Z')).toBe(true);
      expect(isPlanAvailable(openPlan, '2030-01-01T00:00:00.000Z')).toBe(true);
    });
  });

  describe('validateQuantityForPlan', () => {
    it('accepts quantity equal to min_quantity', () => {
      expect(validateQuantityForPlan(basePlan, 5)).toBe(true);
    });

    it('accepts quantity greater than min_quantity', () => {
      expect(validateQuantityForPlan(basePlan, 10)).toBe(true);
    });

    it('throws 400 when quantity is less than min_quantity', () => {
      expect(() => validateQuantityForPlan(basePlan, 4)).toThrowError(/cannot be less than plan minimum quantity/);
    });

    it('throws 400 when quantity is zero or negative', () => {
      expect(() => validateQuantityForPlan(basePlan, 0)).toThrowError(/positive integer/);
      expect(() => validateQuantityForPlan(basePlan, -2)).toThrowError(/positive integer/);
    });

    it('throws 400 when quantity is not an integer', () => {
      expect(() => validateQuantityForPlan(basePlan, 5.5)).toThrowError(/positive integer/);
    });
  });

  describe('canPerform policy flags', () => {
    it('respects allow_early_close flag', () => {
      expect(canPerform({ allow_early_close: true }, 'close_early')).toBe(true);
      expect(canPerform({ allow_early_close: false }, 'close_early')).toBe(false);
    });

    it('respects allow_pause flag', () => {
      expect(canPerform({ allow_pause: true }, 'pause')).toBe(true);
      expect(canPerform({ allow_pause: false }, 'pause')).toBe(false);
    });

    it('respects allow_renew flag', () => {
      expect(canPerform({ allow_renew: true }, 'renew')).toBe(true);
      expect(canPerform({ allow_renew: false }, 'renew')).toBe(false);
    });

    it('returns false for unrecognized action', () => {
      expect(canPerform(basePlan, 'unknown_action')).toBe(false);
    });
  });

  describe('shouldAutoClose', () => {
    it('returns true when auto_close is true and today is on or after available_until', () => {
      expect(shouldAutoClose(basePlan, '2026-11-01T00:00:00.000Z')).toBe(true);
    });

    it('returns false when today is before available_until', () => {
      expect(shouldAutoClose(basePlan, '2026-10-25T00:00:00.000Z')).toBe(false);
    });

    it('returns false when auto_close flag is false', () => {
      const nonAutoPlan = { ...basePlan, auto_close: false };
      expect(shouldAutoClose(nonAutoPlan, '2026-11-05T00:00:00.000Z')).toBe(false);
    });

    it('returns false when plan has no available_until date', () => {
      const infinitePlan = { ...basePlan, auto_close: true, available_until: null };
      expect(shouldAutoClose(infinitePlan, '2030-01-01T00:00:00.000Z')).toBe(false);
    });
  });
});
