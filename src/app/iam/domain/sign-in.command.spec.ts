import { isTokenAlive, meetsPasswordPolicy } from './sign-in.command';

function token(exp: number): string {
  return `header.${btoa(JSON.stringify({ sub: '1', exp }))}.signature`;
}

describe('isTokenAlive', () => {
  it('accepts only tokens that have not expired', () => {
    const now = Date.UTC(2026, 9, 27);
    expect(isTokenAlive(token(now / 1000 + 60), now)).toBe(true);
    expect(isTokenAlive(token(now / 1000 - 60), now)).toBe(false);
    expect(isTokenAlive('not-a-jwt', now)).toBe(false);
    expect(isTokenAlive(null, now)).toBe(false);
  });
});

describe('meetsPasswordPolicy', () => {
  it('asks for the same rules as the backend', () => {
    expect(meetsPasswordPolicy('Clave#2026x')).toBe(true);
    expect(meetsPasswordPolicy('clave#2026x')).toBe(false);
    expect(meetsPasswordPolicy('CLAVE#2026X')).toBe(false);
    expect(meetsPasswordPolicy('Clave#clave')).toBe(false);
    expect(meetsPasswordPolicy('Clave2026x')).toBe(false);
    expect(meetsPasswordPolicy('Cl#1a')).toBe(false);
  });
});
