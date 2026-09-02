import { describe, it, expect } from 'vitest';
import { normalizeEmail, isDisposableDomain } from '@shiftos/services';

describe('isDisposableDomain', () => {
  it('does not flag major legitimate providers', () => {
    for (const domain of ['gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com']) {
      expect(isDisposableDomain(domain)).toBe(false);
    }
  });

  it('does not flag a .edu address', () => {
    expect(isDisposableDomain('stanford.edu')).toBe(false);
  });

  it('does not flag a made-up corporate domain', () => {
    expect(isDisposableDomain('shiftos-internal-example-corp.com')).toBe(false);
  });

  it('flags real entries sampled from the generated disposable-domain list', () => {
    const sampled = [
      '079i080nhj.info',
      'alphaconquista.com',
      'fuglazzes.com',
      'productpacking.com',
      'zipx.site',
    ];
    for (const domain of sampled) {
      expect(isDisposableDomain(domain)).toBe(true);
    }
  });
});

describe('normalizeEmail', () => {
  it('normalizes Gmail "+" aliases to the same domain without collapsing the emails', () => {
    const plain = normalizeEmail('john@gmail.com');
    const alias = normalizeEmail('john+test@gmail.com');

    expect(plain.domain).toBe('gmail.com');
    expect(alias.domain).toBe('gmail.com');
    expect(isDisposableDomain(plain.domain)).toBe(false);
    expect(isDisposableDomain(alias.domain)).toBe(false);

    // Critically, the two full normalized emails stay distinct strings --
    // no alias collapsing.
    expect(plain.email).toBe('john@gmail.com');
    expect(alias.email).toBe('john+test@gmail.com');
    expect(plain.email).not.toBe(alias.email);
  });

  it('lowercases only the domain, leaving local-part case exactly as typed', () => {
    const mixedCase = normalizeEmail('User@GMAIL.com');
    const lowerCase = normalizeEmail('user@gmail.com');

    expect(mixedCase.domain).toBe('gmail.com');
    expect(lowerCase.domain).toBe('gmail.com');

    // Normalized emails differ only in local-part case, exactly as input --
    // no local-part lowercasing.
    expect(mixedCase.email).toBe('User@gmail.com');
    expect(lowerCase.email).toBe('user@gmail.com');
    expect(mixedCase.email).not.toBe(lowerCase.email);
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeEmail('  user@Example.com  ')).toEqual({
      email: 'user@example.com',
      domain: 'example.com',
    });
  });
});
