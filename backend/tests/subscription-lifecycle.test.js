import { describe, it, expect } from 'vitest';
import {
  evaluateTransition,
  getAllowedActions,
  STATUSES,
} from '../src/services/subscriptionLifecycle.service.js';

describe('src/services/subscriptionLifecycle.service.js Unit Tests', () => {
  const basePlan = {
    id: 'plan-1',
    frequency: 'monthly',
    min_quantity: 1,
    available_from: '2026-01-01',
    available_until: '2026-12-31',
    allow_early_close: true,
    allow_pause: true,
    allow_renew: true,
    auto_close: false,
  };

  const restrictedPlan = {
    ...basePlan,
    allow_early_close: false,
    allow_pause: false,
    allow_renew: false,
  };

  const baseSubscription = {
    id: 'sub-1',
    status: STATUSES.DRAFT,
    customer_id: 'cust-1',
    plan_id: 'plan-1',
    start_date: '2026-06-01',
    expiry_date: '2026-12-01',
    valid_until: '2026-06-15',
    is_paused: false,
    lines: [{ id: 'line-1', product_id: 'prod-1', quantity: 2, amount: '100.00' }],
  };

  describe('getAllowedActions', () => {
    it('returns correct action list for each status', () => {
      expect(getAllowedActions(STATUSES.DRAFT)).toEqual(['send_quotation', 'close']);
      expect(getAllowedActions(STATUSES.QUOTATION)).toEqual(['confirm', 'close']);
      expect(getAllowedActions(STATUSES.CONFIRMED)).toEqual(['activate', 'close']);
      expect(getAllowedActions(STATUSES.ACTIVE)).toEqual(['close', 'pause', 'resume', 'renew']);
      expect(getAllowedActions(STATUSES.CLOSED)).toEqual([]);
    });
  });

  describe('send_quotation (Draft -> Quotation)', () => {
    it('transitions draft to quotation when lines exist', () => {
      const res = evaluateTransition({
        subscription: baseSubscription,
        action: 'send_quotation',
        plan: basePlan,
        userRole: 'staff',
      });
      expect(res.targetStatus).toBe(STATUSES.QUOTATION);
    });

    it('rejects send_quotation when subscription has no lines', () => {
      expect(() =>
        evaluateTransition({
          subscription: { ...baseSubscription, lines: [] },
          action: 'send_quotation',
          plan: basePlan,
          userRole: 'staff',
        })
      ).toThrow(/no subscription lines/i);
    });
  });

  describe('confirm (Quotation -> Confirmed)', () => {
    it('transitions quotation to confirmed when valid_until is future', () => {
      const res = evaluateTransition({
        subscription: { ...baseSubscription, status: STATUSES.QUOTATION, valid_until: '2026-12-31' },
        action: 'confirm',
        plan: basePlan,
        userRole: 'staff',
        asOfDate: '2026-06-01',
      });
      expect(res.targetStatus).toBe(STATUSES.CONFIRMED);
    });

    it('rejects confirm when valid_until has passed', () => {
      expect(() =>
        evaluateTransition({
          subscription: { ...baseSubscription, status: STATUSES.QUOTATION, valid_until: '2026-05-01' },
          action: 'confirm',
          plan: basePlan,
          userRole: 'staff',
          asOfDate: '2026-06-01',
        })
      ).toThrow(/expired/i);
    });
  });

  describe('activate (Confirmed -> Active)', () => {
    it('transitions confirmed to active and sets next_billing_date to start_date', () => {
      const res = evaluateTransition({
        subscription: { ...baseSubscription, status: STATUSES.CONFIRMED, start_date: '2026-07-01' },
        action: 'activate',
        plan: basePlan,
        userRole: 'staff',
      });
      expect(res.targetStatus).toBe(STATUSES.ACTIVE);
      expect(res.updates.next_billing_date).toBe('2026-07-01');
      expect(res.updates.billing_anchor_date).toBe('2026-07-01');
    });

    it('rejects activation if plan is unavailable on start_date', () => {
      const expiredPlan = { ...basePlan, available_until: '2026-05-01' };
      expect(() =>
        evaluateTransition({
          subscription: { ...baseSubscription, status: STATUSES.CONFIRMED, start_date: '2026-07-01' },
          action: 'activate',
          plan: expiredPlan,
          userRole: 'staff',
        })
      ).toThrow(/not available/i);
    });
  });

  describe('close (Cancellation and Early Close)', () => {
    it('allows closing draft/quotation/confirmed without plan early close flag', () => {
      const res = evaluateTransition({
        subscription: { ...baseSubscription, status: STATUSES.QUOTATION },
        action: 'close',
        plan: restrictedPlan,
        userRole: 'staff',
      });
      expect(res.targetStatus).toBe(STATUSES.CLOSED);
    });

    it('allows admin to close active subscription even if plan restricts early close', () => {
      const res = evaluateTransition({
        subscription: { ...baseSubscription, status: STATUSES.ACTIVE },
        action: 'close',
        plan: restrictedPlan,
        userRole: 'admin',
      });
      expect(res.targetStatus).toBe(STATUSES.CLOSED);
    });

    it('rejects staff closing active subscription if plan restricts early close', () => {
      expect(() =>
        evaluateTransition({
          subscription: { ...baseSubscription, status: STATUSES.ACTIVE },
          action: 'close',
          plan: restrictedPlan,
          userRole: 'staff',
        })
      ).toThrow(/does not permit early close/i);
    });

    it('allows customer closing active subscription if plan allows early close', () => {
      const res = evaluateTransition({
        subscription: { ...baseSubscription, status: STATUSES.ACTIVE },
        action: 'close',
        plan: basePlan,
        userRole: 'customer',
      });
      expect(res.targetStatus).toBe(STATUSES.CLOSED);
    });
  });

  describe('pause and resume', () => {
    it('pauses active subscription when plan allows pause', () => {
      const res = evaluateTransition({
        subscription: { ...baseSubscription, status: STATUSES.ACTIVE, is_paused: false },
        action: 'pause',
        plan: basePlan,
        userRole: 'customer',
      });
      expect(res.targetStatus).toBe(STATUSES.ACTIVE);
      expect(res.updates.is_paused).toBe(true);
    });

    it('rejects pause when plan restricts pause', () => {
      expect(() =>
        evaluateTransition({
          subscription: { ...baseSubscription, status: STATUSES.ACTIVE, is_paused: false },
          action: 'pause',
          plan: restrictedPlan,
          userRole: 'staff',
        })
      ).toThrow(/does not permit pausing/i);
    });

    it('rejects pause if already paused', () => {
      expect(() =>
        evaluateTransition({
          subscription: { ...baseSubscription, status: STATUSES.ACTIVE, is_paused: true },
          action: 'pause',
          plan: basePlan,
          userRole: 'staff',
        })
      ).toThrow(/already paused/i);
    });

    it('resumes paused subscription', () => {
      const res = evaluateTransition({
        subscription: { ...baseSubscription, status: STATUSES.ACTIVE, is_paused: true },
        action: 'resume',
        plan: basePlan,
        userRole: 'staff',
      });
      expect(res.targetStatus).toBe(STATUSES.ACTIVE);
      expect(res.updates.is_paused).toBe(false);
    });

    it('rejects resume if not paused', () => {
      expect(() =>
        evaluateTransition({
          subscription: { ...baseSubscription, status: STATUSES.ACTIVE, is_paused: false },
          action: 'resume',
          plan: basePlan,
          userRole: 'staff',
        })
      ).toThrow(/not paused/i);
    });
  });

  describe('renew', () => {
    it('extends expiry_date by one plan period', () => {
      const res = evaluateTransition({
        subscription: { ...baseSubscription, status: STATUSES.ACTIVE, expiry_date: '2026-08-31' },
        action: 'renew',
        plan: { ...basePlan, frequency: 'monthly' },
        userRole: 'customer',
      });
      expect(res.targetStatus).toBe(STATUSES.ACTIVE);
      // Aug 31 + 1 month clamped to Sep 30
      expect(res.updates.expiry_date).toBe('2026-09-30');
    });

    it('rejects renewal when plan restricts renew', () => {
      expect(() =>
        evaluateTransition({
          subscription: { ...baseSubscription, status: STATUSES.ACTIVE, expiry_date: '2026-08-31' },
          action: 'renew',
          plan: restrictedPlan,
          userRole: 'staff',
        })
      ).toThrow(/does not permit renewal/i);
    });
  });

  describe('closed status finality & invalid transitions', () => {
    it('rejects any transition on a closed subscription', () => {
      expect(() =>
        evaluateTransition({
          subscription: { ...baseSubscription, status: STATUSES.CLOSED },
          action: 'activate',
          plan: basePlan,
          userRole: 'admin',
        })
      ).toThrow(/closed subscription cannot be modified/i);
    });

    it('rejects invalid jump transitions (draft -> active)', () => {
      expect(() =>
        evaluateTransition({
          subscription: { ...baseSubscription, status: STATUSES.DRAFT },
          action: 'activate',
          plan: basePlan,
          userRole: 'staff',
        })
      ).toThrow(/Action 'activate' is not allowed for subscription in status 'draft'/i);
    });

    it('rejects customer performing staff/admin actions (confirm, activate)', () => {
      expect(() =>
        evaluateTransition({
          subscription: { ...baseSubscription, status: STATUSES.QUOTATION },
          action: 'confirm',
          plan: basePlan,
          userRole: 'customer',
        })
      ).toThrow(/Customers are not authorized/i);
    });
  });
});

