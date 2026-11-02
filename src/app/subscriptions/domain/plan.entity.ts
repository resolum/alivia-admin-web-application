export type PlanCode = 'MINIMUM' | 'CUSTOM';
export type PriceQualifier = 'FIXED' | 'BASE_COMPONENT';
export type ActuatorType = 'LIGHT' | 'DOOR' | 'WINDOW' | 'CURTAIN';

/** A plan of the official catalog, as the backend publishes it. */
export interface Plan {
  id: number;
  code: PlanCode;
  name: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
  currency: string;
  billingPeriod: 'MONTHLY' | 'ANNUAL';
  basePriceAmount: number;
  minimumMonthlyAmount: number;
  priceQualifier: PriceQualifier;
  additionalRoomMonthlyAmount: number | null;
  minimumRooms: number;
  minActuators: number;
  maxActuators: number;
  includedActuators: number;
  deviceMonthlyPrices: Partial<Record<ActuatorType, number>>;
  features: string[];
  includedDevices: string[];
}

export const actuatorLabel: Record<ActuatorType, string> = { LIGHT: 'Iluminación', DOOR: 'Puerta', WINDOW: 'Ventana', CURTAIN: 'Cortina' };

/** How each plan is presented to the commercial team. */
export const planPresentation: Record<PlanCode, { badge: string; kind: string; tag: string }> = {
  MINIMUM: { badge: 'Inicio rápido', kind: 'Plan Estándar', tag: 'Plan de entrada' },
  CUSTOM: { badge: 'A tu medida', kind: 'Modular & Escalable', tag: 'Flexibilidad total' },
};

/** "S/ 99" for soles, otherwise the currency code. */
export function formatAmount(amount: number, currency: string): string {
  const value = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return currency === 'PEN' ? `S/ ${value}` : `${currency} ${value}`;
}

/** A fixed plan shows its price; a modular one starts at its minimum monthly amount. */
export function priceLabel(plan: Plan): { prefix: string; amount: string } {
  const fixed = plan.priceQualifier === 'FIXED';
  return { prefix: fixed ? '' : 'Desde', amount: formatAmount(fixed ? plan.basePriceAmount : plan.minimumMonthlyAmount, plan.currency) };
}

export function actuatorRange(plan: Plan): string {
  return plan.minActuators === plan.maxActuators
    ? `${plan.maxActuators} ${plan.maxActuators === 1 ? 'actuador' : 'actuadores'}`
    : `De ${plan.minActuators} a ${plan.maxActuators} actuadores`;
}
