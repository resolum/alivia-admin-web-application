import { HiringRequest, holdExpiresInDays, matchesSearch, needsAttention, paymentState, timeAgo } from './hiring-request.entity';

const NOW = Date.parse('2026-10-30T12:00:00Z');
export const hiringRequest = (changes: Partial<HiringRequest> = {}): HiringRequest => ({
  id: 'd1', code: 'SOL-00000201', planCode: 'MINIMUM', planName: 'Plan Base', billingCycle: 'MONTHLY', rooms: 1, devices: 2,
  stage: 'REQUEST_AND_PAYMENT', paymentStatus: 'PREAUTHORIZED', heldAmount: 99, currency: 'PEN',
  preauthorizedAt: '2026-10-30T10:00:00Z', captureBefore: '2026-11-06T10:00:00Z', updatedAt: '2026-10-30T10:00:00Z', ...changes,
});

describe('hiring request', () => {
  it('names the payment state and what needs a follow-up', () => {
    expect(paymentState(hiringRequest())).toEqual({ label: 'Preautorización aprobada', tone: 'success' });
    expect(paymentState(hiringRequest({ paymentStatus: null })).label).toBe('Configurando');
    expect(needsAttention(hiringRequest({ paymentStatus: 'PAYMENT_REJECTED' }))).toBe(true);
    expect(needsAttention(hiringRequest())).toBe(false);
  });

  it('warns when the card hold is about to expire', () => {
    expect(holdExpiresInDays(hiringRequest(), NOW)).toBeNull();
    expect(holdExpiresInDays(hiringRequest({ captureBefore: '2026-11-01T10:00:00Z' }), NOW)).toBe(2);
    expect(holdExpiresInDays(hiringRequest({ paymentStatus: 'CANCELED' }), NOW)).toBeNull();
  });

  it('formats elapsed time and searches by code, plan or state', () => {
    expect(timeAgo('2026-10-30T11:59:30Z', NOW)).toBe('Hace un momento');
    expect(timeAgo('2026-10-30T11:30:00Z', NOW)).toBe('Hace 30 min');
    expect(timeAgo('2026-10-30T10:00:00Z', NOW)).toBe('Hace 2h');
    expect(timeAgo('2026-10-27T12:00:00Z', NOW)).toBe('Hace 3 d');
    expect(matchesSearch(hiringRequest(), 'sol-0000')).toBe(true);
    expect(matchesSearch(hiringRequest(), 'aprobada')).toBe(true);
    expect(matchesSearch(hiringRequest(), 'personalizado')).toBe(false);
  });
});
