import { describe, it, expect } from 'vitest';
import {
  parseMoney,
  formatMoney,
  addMoney,
  multiplyMoney,
  roundMoney,
} from '../src/utils/money.js';

describe('src/utils/money.js Unit Tests', () => {
  it('adds 560.00 + 1000.00 to equal 1560.00', () => {
    const a = parseMoney('560.00');
    const b = parseMoney('1000.00');
    expect(a).toBe(56000);
    expect(b).toBe(100000);

    const sumMinor = addMoney(a, b);
    expect(sumMinor).toBe(156000);
    expect(formatMoney(sumMinor)).toBe('1560.00');
  });

  it('adds 0.10 + 0.20 to equal 0.30 exactly without floating point drift', () => {
    // In IEEE 754 floats: 0.1 + 0.2 === 0.30000000000000004
    const a = parseMoney('0.10');
    const b = parseMoney('0.20');
    expect(a).toBe(10);
    expect(b).toBe(20);

    const sumMinor = addMoney(a, b);
    expect(sumMinor).toBe(30);
    expect(formatMoney(sumMinor)).toBe('0.30');
  });

  it('rejects values with more than 2 decimal places', () => {
    expect(() => parseMoney('10.999')).toThrowError('more than 2 decimal places');
    expect(() => parseMoney('0.001')).toThrowError('more than 2 decimal places');
    expect(() => parseMoney(12.345)).toThrowError('more than 2 decimal places');
  });

  it('rejects negative values', () => {
    expect(() => parseMoney('-5.00')).toThrowError('cannot be negative');
    expect(() => parseMoney('-0.01')).toThrowError('cannot be negative');
    expect(() => parseMoney(-10)).toThrowError('cannot be negative');
  });

  it('correctly parses and formats integers', () => {
    expect(parseMoney('100')).toBe(10000);
    expect(parseMoney(100)).toBe(10000);
    expect(formatMoney(10000)).toBe('100.00');
    expect(formatMoney(0)).toBe('0.00');
    expect(formatMoney(5)).toBe('0.05');
  });

  it('correctly multiplies minor units by integer and fractional quantities', () => {
    const unitPrice = parseMoney('50.00'); // 5000 minor
    expect(multiplyMoney(unitPrice, 3)).toBe(15000);
    expect(formatMoney(multiplyMoney(unitPrice, 3))).toBe('150.00');

    // Fractional quantity with half-up rounding
    expect(multiplyMoney(100, 2.5)).toBe(250);
    expect(formatMoney(multiplyMoney(100, 2.5))).toBe('2.50');

    // Zero quantity
    expect(multiplyMoney(unitPrice, 0)).toBe(0);
    expect(formatMoney(multiplyMoney(unitPrice, 0))).toBe('0.00');

    // Negative quantity rejected
    expect(() => multiplyMoney(unitPrice, -1)).toThrowError('non-negative');
  });

  it('roundMoney correctly rounds half-up', () => {
    expect(roundMoney(10.4)).toBe(10);
    expect(roundMoney(10.5)).toBe(11);
    expect(roundMoney(10.6)).toBe(11);
  });
});
