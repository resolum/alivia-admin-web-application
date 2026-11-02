export type HiringStage = 'REQUEST_AND_PAYMENT' | 'TECHNICAL_EVALUATION' | 'INSTALLATION' | 'COMPLETED';
export type PaymentStatus = 'AWAITING_CONFIRMATION' | 'PREAUTHORIZED' | 'PAYMENT_REJECTED' | 'CANCELED' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
export type Tone = 'success' | 'warning' | 'danger' | 'neutral';

/** A family's contracting request in the hiring pipeline. */
export interface HiringRequest {
  id: string;
  code: string;
  planCode: 'MINIMUM' | 'CUSTOM';
  planName: string;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  rooms: number;
  devices: number;
  stage: HiringStage;
  paymentStatus: PaymentStatus | null;
  heldAmount: number | null;
  currency: string;
  preauthorizedAt: string | null;
  captureBefore: string | null;
  updatedAt: string;
}

/** The columns of the board, in order. Evaluation and installation will be filled by Operations. */
export const HIRING_STAGES: readonly { id: HiringStage; label: string; empty: string }[] = [
  { id: 'REQUEST_AND_PAYMENT', label: 'Solicitud y pago', empty: 'No hay solicitudes en esta etapa.' },
  { id: 'TECHNICAL_EVALUATION', label: 'Evaluación técnica', empty: 'Las evaluaciones aparecerán cuando Operaciones las registre.' },
  { id: 'INSTALLATION', label: 'Instalación', empty: 'Las instalaciones aparecerán cuando Operaciones las registre.' },
  { id: 'COMPLETED', label: 'Completado', empty: 'Aún no hay contrataciones completadas.' },
];

const STATUS: Record<PaymentStatus | 'NONE', { label: string; tone: Tone }> = {
  NONE: { label: 'Configurando', tone: 'neutral' },
  AWAITING_CONFIRMATION: { label: 'En trámite', tone: 'warning' },
  PREAUTHORIZED: { label: 'Preautorización aprobada', tone: 'success' },
  PAYMENT_REJECTED: { label: 'Pago rechazado', tone: 'danger' },
  FAILED: { label: 'Pago fallido', tone: 'danger' },
  CANCELED: { label: 'Retención liberada', tone: 'neutral' },
  SUCCEEDED: { label: 'Cobro realizado', tone: 'success' },
  REFUNDED: { label: 'Reembolsado', tone: 'neutral' },
};

export function paymentState(request: Pick<HiringRequest, 'paymentStatus'>): { label: string; tone: Tone } {
  return STATUS[request.paymentStatus ?? 'NONE'];
}

/** Waiting for the family or with a failed payment: the manager should follow up. */
export function needsAttention(request: Pick<HiringRequest, 'paymentStatus'>): boolean {
  return request.paymentStatus === 'AWAITING_CONFIRMATION' || request.paymentStatus === 'PAYMENT_REJECTED'
    || request.paymentStatus === 'FAILED';
}

/** Days left before the card hold expires, when it does in two days or less. */
export function holdExpiresInDays(request: Pick<HiringRequest, 'paymentStatus' | 'captureBefore'>, now = Date.now()): number | null {
  if (request.paymentStatus !== 'PREAUTHORIZED' || !request.captureBefore) return null;
  const days = Math.ceil((new Date(request.captureBefore).getTime() - now) / 86_400_000);
  return days <= 2 ? Math.max(days, 0) : null;
}

/** "Hace 2h", "Hace 3 d" or "Hace un momento". */
export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return minutes < 2 ? 'Hace un momento' : `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `Hace ${hours}h` : `Hace ${Math.round(hours / 24)} d`;
}

export function matchesSearch(request: HiringRequest, search: string): boolean {
  const term = search.trim().toLowerCase();
  return term === '' || [request.code, request.planName, paymentState(request).label].some(value => value.toLowerCase().includes(term));
}
