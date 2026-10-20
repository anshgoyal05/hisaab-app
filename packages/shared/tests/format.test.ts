import { describe, expect, it } from 'vitest';
import {
  formatMoney,
  paiseToRupees,
  rupeesToPaise,
} from '../src/money/format.js';

describe('formatMoney & Currency Helpers', () => {
  it('formats Indian rupee amounts with correct grouping (₹1,25,000)', () => {
    // 12500000 paise = ₹1,25,000
    const formatted = formatMoney(12500000);
    expect(formatted).toContain('1,25,000');
    expect(formatted).toContain('₹');
  });

  it('formats whole rupee amounts cleanly without trailing .00 by default', () => {
    expect(formatMoney(21000)).toMatch(/₹\s?210/);
    expect(formatMoney(50000)).toMatch(/₹\s?500/);
    expect(formatMoney(145000)).toMatch(/₹\s?1,450/);
  });

  it('formats fractional paise amounts with exactly 2 decimal places', () => {
    expect(formatMoney(12550)).toMatch(/₹\s?125\.50/);
    expect(formatMoney(4525)).toMatch(/₹\s?45\.25/);
  });

  it('parses input strings into exact integer paise without floating point error', () => {
    expect(rupeesToPaise('125')).toBe(12500);
    expect(rupeesToPaise('125.50')).toBe(12550);
    expect(rupeesToPaise('125.5')).toBe(12550);
    expect(rupeesToPaise('₹1,25,000')).toBe(12500000);
    expect(rupeesToPaise('0.01')).toBe(1);
    expect(rupeesToPaise(125.5)).toBe(12550);
  });

  it('converts paise to rupees accurately', () => {
    expect(paiseToRupees(12550)).toBe(125.5);
    expect(paiseToRupees(50000)).toBe(500);
  });
});
