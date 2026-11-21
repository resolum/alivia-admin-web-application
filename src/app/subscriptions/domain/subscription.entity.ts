import { HiringRequest, PaymentStatus } from './hiring-request.entity';
import { formatAmount } from './plan.entity';

/** The installation order of the request: where the home is, who receives the visits and when it went live. */
export interface InstallationInfo {
  draftId: string;
  contactName: string | null;
  contactPhone: string | null;
  directions: string | null;
  technicianName: string | null;
  completedAt: string | null;
  installedDevices: number;
}

/** How the administration follows a subscription. */
export type SubscriptionStatus = 'ACTIVE' | 'ATTENTION' | 'CANCELED';
export type SubscriptionTab = 'ALL' | SubscriptionStatus | 'RENEWING';

/**
 * A home in service: a contracting request whose installation was approved and whose payment Alivia collected.
 * Renewal dates are derived from the activation date and the billing cycle; the backend does not store them.
 */
export interface Subscription {
  id: string;
  code: string;
  planCode: HiringRequest['planCode'];
  planName: string;
  billingCycle: HiringRequest['billingCycle'];
  amount: number | null;
  currency: string;
  rooms: number;
  devices: number;
  paymentStatus: PaymentStatus | null;
  status: SubscriptionStatus;
  activatedAt: string;
  nextBilling: string;
  contactName: string | null;
  contactPhone: string | null;
  directions: string | null;
  technicianName: string | null;
}

export const subscriptionStatusLabel: Record<SubscriptionStatus, string> = {
  ACTIVE: 'Activa', ATTENTION: 'Requiere atención', CANCELED: 'Cancelada',
};

/** Collected: in service. Rejected, failed or still waiting: to follow up. Released or refunded: out of service. */
export function statusOf(paymentStatus: PaymentStatus | null): SubscriptionStatus {
  if (paymentStatus === 'SUCCEEDED') return 'ACTIVE';
  if (paymentStatus === 'CANCELED' || paymentStatus === 'REFUNDED') return 'CANCELED';
  return 'ATTENTION';
}

/** The first billing date after {@code today}, counting monthly or yearly from the activation day. */
export function nextBillingOf(activatedAt: string, cycle: HiringRequest['billingCycle'], today = new Date()): string {
  const next = new Date(activatedAt);
  const step = () => (cycle === 'ANNUAL' ? next.setUTCFullYear(next.getUTCFullYear() + 1) : next.setUTCMonth(next.getUTCMonth() + 1));
  step();
  while (next.getTime() <= today.getTime()) step();
  return next.toISOString();
}

export function toSubscription(request: HiringRequest, installation: InstallationInfo | undefined, today = new Date()): Subscription {
  const activatedAt = installation?.completedAt ?? request.updatedAt;
  return {
    id: request.id,
    code: request.code.replace(/^SOL-/, 'SUB-'),
    planCode: request.planCode,
    planName: request.planName,
    billingCycle: request.billingCycle,
    amount: request.heldAmount,
    currency: request.currency,
    rooms: request.rooms,
    devices: installation?.installedDevices || request.devices,
    paymentStatus: request.paymentStatus,
    status: statusOf(request.paymentStatus),
    activatedAt,
    nextBilling: nextBillingOf(activatedAt, request.billingCycle, today),
    contactName: installation?.contactName ?? null,
    contactPhone: installation?.contactPhone ?? null,
    directions: installation?.directions ?? null,
    technicianName: installation?.technicianName ?? null,
  };
}

/** Renews in the next 15 days. */
export function isRenewingSoon(subscription: Subscription, today = new Date()): boolean {
  const days = (new Date(subscription.nextBilling).getTime() - today.getTime()) / 86_400_000;
  return subscription.status === 'ACTIVE' && days >= 0 && days <= 15;
}

export function priceOf(subscription: Subscription): string {
  if (subscription.amount === null) return 'Monto por definir';
  return `${formatAmount(subscription.amount, subscription.currency)} / ${subscription.billingCycle === 'ANNUAL' ? 'año' : 'mes'}`;
}

/** What the administration does next with the subscription. */
export function nextAction(subscription: Subscription): { label: string; detail: string } {
  if (subscription.status === 'ATTENTION') return { label: 'Revisar el cobro', detail: 'El pago no se completó' };
  if (subscription.status === 'CANCELED') return { label: 'Sin cobros', detail: 'Servicio cancelado' };
  return {
    label: formatDate(subscription.nextBilling),
    detail: subscription.billingCycle === 'ANNUAL' ? 'Renovación anual' : 'Renovación automática',
  };
}

export const homeOf = (subscription: Subscription) => subscription.contactName ? `Hogar de ${subscription.contactName}` : 'Hogar de la solicitud';

const DATE = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Lima' });
export const formatDate = (value: string) => DATE.format(new Date(value));

export function matchesSubscription(subscription: Subscription, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return [subscription.code, subscription.planName, homeOf(subscription), subscription.contactName, subscription.directions]
    .some(value => value?.toLowerCase().includes(needle));
}
