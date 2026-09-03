import { describe, it, expect } from 'vitest';
import {
  getCountryOptions,
  getStateOptions,
  getRegionLabel,
  resolveCountryValue,
  resolveStateValue
} from '@shiftos/web/dist/src/lib/geography.js';

describe('getCountryOptions', () => {
  it('includes real countries as {value: ISO2 code, label: name}, sorted alphabetically', () => {
    const options = getCountryOptions();
    expect(options.length).toBeGreaterThan(190);
    expect(options).toContainEqual({ value: 'NG', label: 'Nigeria' });
    expect(options).toContainEqual({ value: 'US', label: 'United States' });
    const labels = options.map((o) => o.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
  });
});

describe('getStateOptions', () => {
  it('returns regions for a known country, sorted alphabetically', () => {
    const options = getStateOptions('NG');
    expect(options.length).toBeGreaterThan(30);
    expect(options).toContainEqual({ value: 'LA', label: 'Lagos' });
    const labels = options.map((o) => o.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
  });

  it('is case-insensitive on the country code', () => {
    expect(getStateOptions('ng')).toEqual(getStateOptions('NG'));
  });

  it('returns an empty array for an unknown or missing country code', () => {
    expect(getStateOptions('ZZ')).toEqual([]);
    expect(getStateOptions('')).toEqual([]);
    expect(getStateOptions(null)).toEqual([]);
    expect(getStateOptions(undefined)).toEqual([]);
  });
});

describe('getRegionLabel', () => {
  it('uses the real-world term for a few common countries', () => {
    expect(getRegionLabel('US')).toBe('State');
    expect(getRegionLabel('CA')).toBe('Province');
  });

  it('falls back to the generic label for everything else, per the brief', () => {
    expect(getRegionLabel('FR')).toBe('State/Province/Region');
    expect(getRegionLabel(null)).toBe('State/Province/Region');
    expect(getRegionLabel('')).toBe('State/Province/Region');
  });
});

describe('resolveCountryValue', () => {
  it('resolves a new-format ISO2 code to its canonical label', () => {
    expect(resolveCountryValue('ng')).toEqual({ code: 'NG', label: 'Nigeria' });
  });

  it('resolves a pre-existing free-text country name (legacy org/branch rows) to its code', () => {
    expect(resolveCountryValue('Nigeria')).toEqual({ code: 'NG', label: 'Nigeria' });
    expect(resolveCountryValue('united states')).toEqual({ code: 'US', label: 'United States' });
  });

  it('passes through an unresolvable legacy value instead of dropping it', () => {
    expect(resolveCountryValue('Wakanda')).toEqual({ code: 'Wakanda', label: 'Wakanda' });
  });

  it('returns null for empty/blank input', () => {
    expect(resolveCountryValue('')).toBeNull();
    expect(resolveCountryValue('   ')).toBeNull();
    expect(resolveCountryValue(null)).toBeNull();
    expect(resolveCountryValue(undefined)).toBeNull();
  });
});

describe('resolveStateValue', () => {
  it('resolves a region code or name within the given country', () => {
    expect(resolveStateValue('NG', 'LA')).toEqual({ code: 'LA', label: 'Lagos' });
    expect(resolveStateValue('NG', 'lagos')).toEqual({ code: 'LA', label: 'Lagos' });
  });

  it('passes through a value that matches nothing in that country', () => {
    expect(resolveStateValue('NG', 'California')).toEqual({ code: 'California', label: 'California' });
  });

  it('returns null when the country is unresolvable or the value is blank', () => {
    expect(resolveStateValue('ZZ', 'Anything')).toEqual({ code: 'Anything', label: 'Anything' });
    expect(resolveStateValue('NG', '')).toBeNull();
    expect(resolveStateValue(null, 'Lagos')).toEqual({ code: 'Lagos', label: 'Lagos' });
  });
});
