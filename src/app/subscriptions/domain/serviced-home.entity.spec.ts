import {
  deviceLabel, formatLongDate, formatOrderDay, homeDistrict, homeName, homePrice, matchesHome, nextBilling, orderState, orderTypeLabel,
  subscriptionLabel, subscriptionStatus,
} from './serviced-home.entity';
import { homeOrder, servicedHome } from './serviced-home.fixtures';

describe('serviced home', () => {
  it('names the home, its district, plan price and subscription', () => {
    const home = servicedHome();
    expect(homeName(home)).toBe('Hogar de María');
    expect(homeName(servicedHome({ contactName: null }))).toBe('Hogar de la solicitud');
    expect(homeDistrict(home)).toBe('San Isidro');
    expect(homePrice(home)).toBe('S/ 99 / mes');
    expect(homePrice(servicedHome({ billingCycle: 'ANNUAL', monthlyAmount: 1089, currency: null }))).toBe('S/ 1089 / año');
    expect(homePrice(servicedHome({ monthlyAmount: null }))).toBeNull();
    expect(subscriptionStatus(home)).toBe('ACTIVE');
    expect(subscriptionLabel(servicedHome({ paymentStatus: 'FAILED' }))).toBe('Requiere atención');
    expect(nextBilling(home, new Date('2026-11-10T00:00:00Z'))).toBe('2026-12-03T17:00:00.000Z');
    expect(nextBilling(servicedHome({ installedAt: null, billingCycle: null }))).toBeNull();
    expect(formatLongDate('2026-11-03T17:00:00Z')).toMatch(/3 de noviembre de 2026/);
    expect(formatOrderDay('2026-11-03')).toMatch(/3 nov/);
  });

  it('labels the devices and orders and finds homes', () => {
    expect(deviceLabel('SENSOR')).toBe('Sensor');
    expect(deviceLabel('ROBOT')).toBe('ROBOT');
    expect(orderTypeLabel(homeOrder({ serviceType: 'EVALUATION' }))).toBe('Revisión técnica');
    expect(orderState(homeOrder()).tone).toBe('done');
    expect(orderState(homeOrder({ status: 'CANCELED' })).tone).toBe('canceled');
    expect(orderState(homeOrder({ status: 'SCHEDULED', startedAt: '2026-11-05T13:00:00Z' })).label).toBe('En curso');
    expect(orderState(homeOrder({ status: 'SCHEDULED', startedAt: null })).label).toBe('Programada');
    expect(matchesHome(servicedHome(), 'san isidro')).toBe(true);
    expect(matchesHome(servicedHome(), 'hog-ffc')).toBe(true);
    expect(matchesHome(servicedHome(), '')).toBe(true);
    expect(matchesHome(servicedHome({ contactPhone: null }), 'zzz')).toBe(false);
  });
});
