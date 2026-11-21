import { districtOf } from '../../shared/domain/map-links';
import { PaymentStatus } from './hiring-request.entity';
import { formatAmount } from './plan.entity';
import { nextBillingOf, statusOf, SubscriptionStatus, subscriptionStatusLabel } from './subscription.entity';

export interface HomeDevice { alias: string; macAddress: string; type: string; }

export interface HomeOrder {
  id: number; code: string; serviceType: 'EVALUATION' | 'INSTALLATION' | 'MAINTENANCE'; status: string; date: string;
  startTime: string | null; endTime: string | null; technicianName: string | null; startedAt: string | null;
  completedAt: string | null; incidentCode: string | null; incidentStatus: string | null;
}

/** A home in service (installation approved) as `/api/v1/serviced-homes` returns it. */
export interface ServicedHome {
  id: string; code: string; contactName: string | null; contactPhone: string | null; directions: string | null;
  installedAt: string | null; installedBy: string | null; planCode: string | null; planName: string | null;
  billingCycle: 'MONTHLY' | 'ANNUAL' | null; monthlyAmount: number | null; currency: string | null;
  paymentStatus: PaymentStatus | null; rooms: number; devices: HomeDevice[]; orders: HomeOrder[];
}

export const homeName = (home: ServicedHome) => home.contactName ? `Hogar de ${home.contactName}` : 'Hogar de la solicitud';
export const homeDistrict = (home: ServicedHome) => districtOf(home.directions);
export const subscriptionStatus = (home: ServicedHome): SubscriptionStatus => statusOf(home.paymentStatus);
export const subscriptionLabel = (home: ServicedHome) => subscriptionStatusLabel[subscriptionStatus(home)];

export function homePrice(home: ServicedHome): string | null {
  if (home.monthlyAmount === null) return null;
  return `${formatAmount(home.monthlyAmount, home.currency ?? 'PEN')} / ${home.billingCycle === 'ANNUAL' ? 'año' : 'mes'}`;
}

export function nextBilling(home: ServicedHome, today = new Date()): string | null {
  return home.installedAt ? nextBillingOf(home.installedAt, home.billingCycle ?? 'MONTHLY', today) : null;
}

const deviceLabels: Record<string, string> = { MICROPHONE: 'Micrófono', ACTUATOR: 'Actuador', SENSOR: 'Sensor', HUB: 'Hub central' };
export const deviceLabel = (type: string) => deviceLabels[type] ?? type;

const typeLabels: Record<HomeOrder['serviceType'], string> = { EVALUATION: 'Revisión técnica', INSTALLATION: 'Instalación', MAINTENANCE: 'Incidencia' };
export const orderTypeLabel = (order: HomeOrder) => typeLabels[order.serviceType] ?? order.serviceType;

/** Closed, being attended or waiting for its visit. */
export function orderState(order: HomeOrder): { label: string; tone: 'done' | 'active' | 'scheduled' | 'canceled' } {
  if (order.status === 'COMPLETED') return { label: 'Completada', tone: 'done' };
  if (order.status === 'CANCELED' || order.status === 'CANCELLED') return { label: 'Cancelada', tone: 'canceled' };
  if (order.startedAt) return { label: 'En curso', tone: 'active' };
  return { label: 'Programada', tone: 'scheduled' };
}

export function matchesHome(home: ServicedHome, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return [home.code, homeName(home), home.contactName, home.directions, home.planName, home.contactPhone]
    .some(value => value?.toLowerCase().includes(needle));
}

const DATE = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' });
const DAY = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const formatLongDate = (value: string) => DATE.format(new Date(value));
export const formatOrderDay = (date: string) => DAY.format(new Date(`${date}T00:00:00Z`));
