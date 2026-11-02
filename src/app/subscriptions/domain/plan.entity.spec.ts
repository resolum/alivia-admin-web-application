import { actuatorRange, formatAmount, priceLabel } from './plan.entity';
import { basePlan, customPlan } from './plan.fixtures';

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
