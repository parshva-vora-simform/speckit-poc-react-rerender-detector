// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { formatPropValue } from '../formatPropValue';

describe('formatPropValue', () => {
  it('returns a non-empty string verbatim', () => {
    expect(formatPropValue('hello')).toBe('hello');
  });

  it('returns two double-quotes for an empty string', () => {
    expect(formatPropValue('')).toBe('""');
  });

  it('formats a number', () => {
    expect(formatPropValue(42)).toBe('42');
  });

  it('formats a boolean true', () => {
    expect(formatPropValue(true)).toBe('true');
  });

  it('formats a boolean false', () => {
    expect(formatPropValue(false)).toBe('false');
  });

  it('formats null as "null"', () => {
    expect(formatPropValue(null)).toBe('null');
  });

  it('formats undefined as "undefined"', () => {
    expect(formatPropValue(undefined)).toBe('undefined');
  });

  it('formats an array as [array]', () => {
    expect(formatPropValue([1, 2, 3])).toBe('[array]');
  });

  it('formats a plain object as [object]', () => {
    expect(formatPropValue({ a: 1 })).toBe('[object]');
  });

  it('formats a function as [function]', () => {
    expect(formatPropValue(() => {})).toBe('[function]');
  });

  it('formats a symbol as [symbol]', () => {
    expect(formatPropValue(Symbol('x'))).toBe('[symbol]');
  });
});
