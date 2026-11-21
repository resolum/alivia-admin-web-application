import { HiringRequest } from './hiring-request.entity';

export const hiringRequest = (changes: Partial<HiringRequest> = {}): HiringRequest => ({
  id: 'd1', code: 'SOL-00000201', planCode: 'MINIMUM', planName: 'Plan Base', billingCycle: 'MONTHLY', rooms: 1, devices: 2,
  stage: 'REQUEST_AND_PAYMENT', paymentStatus: 'PREAUTHORIZED', heldAmount: 99, currency: 'PEN',
  preauthorizedAt: '2026-10-30T10:00:00Z', captureBefore: '2026-11-06T10:00:00Z', updatedAt: '2026-10-30T10:00:00Z', ...changes,
});
