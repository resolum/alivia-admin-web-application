import { actuatorRange, formatAmount, Plan, priceLabel } from './plan.entity';

export const basePlan: Plan = {
  id: 1, code: 'MINIMUM', name: 'Plan Base', description: 'Una habitación', status: 'ACTIVE', currency: 'PEN',
  billingPeriod: 'MONTHLY', basePriceAmount: 99, minimumMonthlyAmount: 99, priceQualifier: 'FIXED',
  additionalRoomMonthlyAmount: null, minimumRooms: 1, minActuators: 1, maxActuators: 1, includedActuators: 1,
  deviceMonthlyPrices: {}, features: ['Control por voz', 'Evaluación técnica sin costo'], includedDevices: ['Micrófono'],
};
export const customPlan: Plan = {
  ...basePlan, id: 2, code: 'CUSTOM', name: 'Plan Personalizado', basePriceAmount: 149, minimumMonthlyAmount: 164,
  priceQualifier: 'BASE_COMPONENT', additionalRoomMonthlyAmount: 35, minimumRooms: 2, maxActuators: 4, includedActuators: 0,
  deviceMonthlyPrices: { LIGHT: 15, DOOR: 25 },
};

describe('plan presentation', () => {
  it('prices fixed and modular plans', () => {
    expect(priceLabel(basePlan)).toEqual({ prefix: '', amount: 'S/ 99' });
    expect(priceLabel(customPlan)).toEqual({ prefix: 'Desde', amount: 'S/ 164' });
    expect(formatAmount(12.5, 'USD')).toBe('USD 12.50');
  });

  it('describes the actuators of each plan', () => {
    expect(actuatorRange(basePlan)).toBe('1 actuador');
    expect(actuatorRange({ ...basePlan, minActuators: 2, maxActuators: 2 })).toBe('2 actuadores');
    expect(actuatorRange(customPlan)).toBe('De 1 a 4 actuadores');
  });
});
