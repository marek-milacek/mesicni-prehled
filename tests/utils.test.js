import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateShort,
  formatNumber,
  formatCurrency,
  getMonthName,
  getCurrentMonth,
  shiftMonth,
  getDaysInMonth,
  getFirstDayOfMonth,
} from '../src/utils/date.js';
import {
  validateEntryForm,
  validateAuthForm,
  validateGoalForm,
} from '../src/utils/validation.js';

describe('Date & formatting utils', () => {
  it('formatDate formats ISO string to Czech date', () => {
    const formatted = formatDate('2026-10-15');
    // Obsahuje 15, říjen, 2026
    expect(formatted).toContain('15');
    expect(formatted).toContain('2026');
  });

  it('formatDateShort formats day and month', () => {
    const formatted = formatDateShort('2026-05-08');
    expect(formatted).toContain('8');
    expect(formatted).toContain('5');
  });

  it('formatNumber formats number according to Czech locale', () => {
    const num = formatNumber(12500);
    expect(num).toMatch(/12[ \u00a0\u202f]?500/);
  });

  it('formatCurrency formats currency in CZK', () => {
    const cur = formatCurrency(450);
    expect(cur).toContain('450');
    expect(cur).toContain('Kč');
  });

  it('shiftMonth correctly adds and subtracts months', () => {
    expect(shiftMonth('2026-05', 1)).toBe('2026-06');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });

  it('getDaysInMonth returns correct days for leap and non-leap years', () => {
    expect(getDaysInMonth('2026-01')).toBe(31);
    expect(getDaysInMonth('2026-02')).toBe(28); // 2026 není přestupný
    expect(getDaysInMonth('2024-02')).toBe(29); // 2024 byl přestupný
    expect(getDaysInMonth('2026-04')).toBe(30);
  });

  it('getFirstDayOfMonth returns 0-6 for Mon-Sun', () => {
    const day = getFirstDayOfMonth('2026-10');
    expect(day).toBeGreaterThanOrEqual(0);
    expect(day).toBeLessThanOrEqual(6);
  });
});

describe('Validation utils', () => {
  describe('validateEntryForm', () => {
    it('validates correct entry', () => {
      const res = validateEntryForm({
        date: '2026-10-09',
        category: 'navyk',
        value: 1,
        note: 'Procházka',
      });
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('rejects missing date and negative value', () => {
      const res = validateEntryForm({
        date: '',
        category: 'vydaj',
        value: -50,
      });
      expect(res.valid).toBe(false);
      expect(res.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateAuthForm', () => {
    it('validates proper login credentials', () => {
      const res = validateAuthForm({
        username: 'marek',
        password: 'tajneheslo',
      }, false);
      expect(res.valid).toBe(true);
    });

    it('rejects short username and mismatched passwords in register', () => {
      const res = validateAuthForm({
        username: 'ab',
        password: '123',
        passwordConfirm: '1234',
      }, true);
      expect(res.valid).toBe(false);
      expect(res.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('validateGoalForm', () => {
    it('validates correct goal target', () => {
      const res = validateGoalForm({
        category: 'studium',
        target: 120,
      });
      expect(res.valid).toBe(true);
    });

    it('rejects invalid or zero target', () => {
      const res = validateGoalForm({
        category: '',
        target: 0,
      });
      expect(res.valid).toBe(false);
    });
  });
});
