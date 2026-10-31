import { describe, it, expect } from 'vitest';
import {
  shortenToken,
  parseArgs,
  getPlannedSteps,
  calculateExpectedPreview,
} from '../scripts/smoke-live.js';

describe('Live Smoke Script Helpers (Priority D)', () => {
  describe('shortenToken', () => {
    it('shortens tokens longer than 10 characters with ellipsis', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0';
      const shortened = shortenToken(token);
      expect(shortened).toBe('eyJhbGciOi...');
      expect(shortened.length).toBe(13); // 10 chars + '...'
    });

    it('returns short tokens unmodified', () => {
      expect(shortenToken('short')).toBe('short');
      expect(shortenToken('')).toBe('');
      expect(shortenToken(null)).toBe('');
    });
  });

  describe('parseArgs', () => {
    it('detects --dry-run flag correctly', () => {
      expect(parseArgs(['--dry-run'])).toEqual({ isDryRun: true, isHelp: false });
      expect(parseArgs(['--other', '--dry-run'])).toEqual({ isDryRun: true, isHelp: false });
    });

    it('detects --help flag correctly', () => {
      expect(parseArgs(['--help'])).toEqual({ isDryRun: false, isHelp: true });
      expect(parseArgs(['-h'])).toEqual({ isDryRun: false, isHelp: true });
    });

    it('defaults to false when flags absent', () => {
      expect(parseArgs([])).toEqual({ isDryRun: false, isHelp: false });
    });
  });

  describe('calculateExpectedPreview', () => {
    it('calculates exact totals matching pure integer money arithmetic', () => {
      // 3 x (1000.00 + 560.00) = 4680.00 subtotal
      // 10% discount = 468.00
      // 18% tax on 4212.00 = 758.16
      // Total = 4970.16
      const result = calculateExpectedPreview({
        basePrice: '1000.00',
        variantAdjustment: '560.00',
        quantity: 3,
        discountPercent: '10.00',
        taxPercent: '18.00',
      });

      expect(result.subtotal).toBe('4680.00');
      expect(result.discount_total).toBe('468.00');
      expect(result.tax_total).toBe('758.16');
      expect(result.total).toBe('4970.16');
      expect(result.totalMinor).toBe(497016);
    });

    it('handles zero discount correctly', () => {
      const result = calculateExpectedPreview({
        basePrice: '100.00',
        variantAdjustment: '0.00',
        quantity: 1,
        discountPercent: '0.00',
        taxPercent: '18.00',
      });

      expect(result.subtotal).toBe('100.00');
      expect(result.discount_total).toBe('0.00');
      expect(result.tax_total).toBe('18.00');
      expect(result.total).toBe('118.00');
    });
  });

  describe('getPlannedSteps', () => {
    it('returns the 12 planned business steps in order', () => {
      const steps = getPlannedSteps();
      expect(steps.length).toBe(12);
      expect(steps[0]).toContain('GET /api/v1/health');
      expect(steps[11]).toContain('GET /api/v1/reports/summary');
    });
  });
});
