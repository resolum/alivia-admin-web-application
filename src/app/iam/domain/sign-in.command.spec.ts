import { isTokenAlive } from './sign-in.command';

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
