import { Plan } from './plan.entity';

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
