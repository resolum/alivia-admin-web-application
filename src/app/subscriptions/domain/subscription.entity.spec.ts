import { hiringRequest } from './hiring-request.fixtures';
import {
  formatDate, homeOf, isRenewingSoon, matchesSubscription, nextAction, nextBillingOf, priceOf, statusOf, toSubscription,
} from './subscription.entity';

const today = new Date('2026-11-05T12:00:00Z');
const installation = {
  draftId: 'd1', contactName: 'María', contactPhone: '984123456', directions: 'Jr. Las Begonias 1325, San Borja, Lima',
  technicianName: 'Carla Mendoza', completedAt: '2026-10-25T15:00:00Z', installedDevices: 4,
};

describe('subscription', () => {
  it('turns a completed request and its installation into the subscription of the home', () => {
    const subscription = toSubscription(hiringRequest({ stage: 'COMPLETED', paymentStatus: 'SUCCEEDED' }), installation, today);

    expect(subscription).toMatchObject({
      code: 'SUB-00000201', status: 'ACTIVE', activatedAt: '2026-10-25T15:00:00Z', nextBilling: '2026-11-25T15:00:00.000Z',
      devices: 4, contactName: 'María', technicianName: 'Carla Mendoza',
    });
    expect(homeOf(subscription)).toBe('Hogar de María');
    expect(priceOf(subscription)).toBe('S/ 99 / mes');
    expect(nextAction(subscription).detail).toBe('Renovación automática');
    expect(matchesSubscription(subscription, 'begonias')).toBe(true);
    expect(matchesSubscription(subscription, 'sub-0000')).toBe(true);
    expect(matchesSubscription(subscription, '')).toBe(true);
    expect(matchesSubscription(subscription, 'zzz')).toBe(false);

    const bare = toSubscription(hiringRequest({ stage: 'COMPLETED', heldAmount: null, billingCycle: 'ANNUAL' }), undefined, today);
    expect(bare.activatedAt).toBe('2026-10-30T10:00:00Z');
    expect(bare.devices).toBe(2);
    expect(homeOf(bare)).toBe('Hogar de la solicitud');
    expect(priceOf(bare)).toBe('Monto por definir');
  });

  it('follows the payment: collected is active, failed needs attention, released is canceled', () => {
    expect(statusOf('SUCCEEDED')).toBe('ACTIVE');
    expect(statusOf('FAILED')).toBe('ATTENTION');
    expect(statusOf(null)).toBe('ATTENTION');
    expect(statusOf('REFUNDED')).toBe('CANCELED');
    expect(statusOf('CANCELED')).toBe('CANCELED');
    const attention = toSubscription(hiringRequest({ paymentStatus: 'FAILED' }), installation, today);
    expect(nextAction(attention).label).toBe('Revisar el cobro');
    expect(nextAction(toSubscription(hiringRequest({ paymentStatus: 'REFUNDED' }), installation, today)).label).toBe('Sin cobros');
  });

  it('renews monthly or yearly from the activation day and flags the next 15 days', () => {
    expect(nextBillingOf('2026-08-10T00:00:00Z', 'MONTHLY', today)).toBe('2026-11-10T00:00:00.000Z');
    expect(nextBillingOf('2025-11-20T00:00:00Z', 'ANNUAL', today)).toBe('2026-11-20T00:00:00.000Z');
    const soon = toSubscription(hiringRequest({ paymentStatus: 'SUCCEEDED', billingCycle: 'ANNUAL', heldAmount: 1089 }),
      { ...installation, completedAt: '2025-11-12T00:00:00Z' }, today);
    expect(isRenewingSoon(soon, today)).toBe(true);
    expect(priceOf(soon)).toBe('S/ 1089 / año');
    expect(nextAction(soon).detail).toBe('Renovación anual');
    expect(isRenewingSoon({ ...soon, nextBilling: '2027-01-01T00:00:00Z' }, today)).toBe(false);
    expect(formatDate('2026-11-12T15:00:00Z')).toMatch(/12 nov/);
  });
});
