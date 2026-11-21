/** Kind of technical visit: the evaluation and installation of a contracting request, or an incident. */
export type ServiceType = 'EVALUATION' | 'INSTALLATION' | 'MAINTENANCE';

/**
 * Where the order is in its process, as the administration follows it: pending while it has no technician,
 * assigned once a technician holds the visit, in process from the moment it was started at the home.
 */
export type OrderStage = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';

export type IncidentStatus = 'OPEN' | 'IN_EVALUATION' | 'SCHEDULED' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELED';

export interface InstalledDevice { alias: string; macAddress: string; type: string; }

export interface AssignmentRecord { technicianId: number; technicianName: string; assignedAt: string; reason?: string | null; }

export interface IncidentSummary {
  id: number; code: string; status: IncidentStatus | string; problemType: string | null; description: string | null;
  occurredAt: string | null; device: InstalledDevice | null;
}

export interface MaintenanceReport { diagnosis?: string | null; maintenancePerformed?: string | null; testResult?: string | null; resolution?: string | null; }

/** Technical order as `/api/v1/technical-orders` returns it. */
export interface TechnicalOrder {
  id: number; code: string | null; draftId: string; serviceType: ServiceType; incidentId: number | null; status: string;
  date: string; startTime: string; endTime: string; technicianId: number | null; technicianName: string | null;
  contactName: string | null; contactPhone: string | null; directions: string | null;
  evaluationResult: string | null; installationResult: string | null; completionNotes: string | null;
  maintenanceReport: MaintenanceReport | null; assignments: AssignmentRecord[] | null;
  startedAt: string | null; completedAt: string | null; installedDevices: InstalledDevice[] | null; incident: IncidentSummary | null;
}

export type StageTab = 'ALL' | OrderStage;

/** A day of the technician's work schedule with its shift blocks ("08:00"–"16:00"). */
export interface WorkingDay { date: string; shifts: { start: string; end: string }[]; }

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/**
 * The usual working hours of a schedule, e.g. "Lun a Vie 08:00 – 16:00": the most frequent shift and the
 * weekdays it is worked; null without shifts.
 */
export function regularShift(days: WorkingDay[]): string | null {
  const byShift = new Map<string, Set<number>>();
  for (const day of days) {
    const text = day.shifts.map(shift => `${shift.start} – ${shift.end}`).join(', ');
    const weekday = new Date(`${day.date}T00:00:00Z`).getUTCDay();
    byShift.set(text, (byShift.get(text) ?? new Set()).add(weekday));
  }
  const [text, weekdays] = [...byShift.entries()].sort((a, b) => b[1].size - a[1].size)[0] ?? [];
  if (!text || !weekdays) return null;
  const order = [...weekdays].map(day => (day + 6) % 7).sort((a, b) => a - b);
  const consecutive = order.every((day, index) => index === 0 || day === order[index - 1] + 1);
  const name = (day: number) => WEEKDAYS[(day + 1) % 7];
  const label = order.length > 2 && consecutive ? `${name(order[0])} a ${name(order.at(-1)!)}` : order.map(name).join(', ');
  return `${label} ${text}`;
}

const toMinutes = (time: string) => { const [hours, minutes] = time.split(':').map(Number); return hours * 60 + minutes; };

/** Whether the visit falls inside one of the shift blocks of its day. */
export function withinShift(order: Pick<TechnicalOrder, 'startTime' | 'endTime'>, day: WorkingDay | undefined): boolean {
  if (!day) return false;
  return day.shifts.some(shift => toMinutes(shift.start) <= toMinutes(order.startTime) && toMinutes(order.endTime) <= toMinutes(shift.end));
}

/**
 * Two-hour blocks of the shifts (the length of a visit) with no order on them, from {@code today} on: the
 * slots still free in the schedule.
 */
export function freeSlots(days: WorkingDay[], orders: Pick<TechnicalOrder, 'date' | 'startTime' | 'endTime' | 'status'>[], today: string): number {
  let free = 0;
  for (const day of days.filter(item => item.date >= today)) {
    const busy = orders.filter(order => order.date === day.date && order.status !== 'CANCELED' && order.status !== 'CANCELLED');
    for (const shift of day.shifts) {
      for (let start = toMinutes(shift.start); start + 120 <= toMinutes(shift.end); start += 120) {
        const end = start + 120;
        if (!busy.some(order => toMinutes(order.startTime) < end && start < toMinutes(order.endTime))) free += 1;
      }
    }
  }
  return free;
}
export type TypeFilter = 'ALL' | ServiceType;

export const serviceTypeLabel: Record<ServiceType, string> = {
  EVALUATION: 'Revisión técnica', INSTALLATION: 'Instalación', MAINTENANCE: 'Incidencia',
};

export const stageLabel: Record<OrderStage, string> = {
  PENDING: 'Pendiente', ASSIGNED: 'Asignada', IN_PROGRESS: 'En proceso', COMPLETED: 'Completada', CANCELED: 'Cancelada',
};

export const incidentStatusLabel: Record<IncidentStatus, string> = {
  OPEN: 'Registrada', IN_EVALUATION: 'En evaluación', SCHEDULED: 'Visita programada', IN_PROGRESS: 'En atención',
  RESOLVED: 'Resuelta', CANCELED: 'Cancelada',
};

const resultLabel: Record<string, string> = {
  VIABLE: 'Hogar viable', VIABLE_WITH_ADAPTATION: 'Viable con adaptación', NOT_VIABLE: 'Hogar no viable',
  APPROVED: 'Instalación aprobada', REJECTED: 'Instalación rechazada',
};

const problemLabel: Record<string, string> = {
  BATTERY: 'Batería baja o agotada', NO_RESPONSE: 'Sin respuesta', FALSE_ALARM: 'Falsa alarma',
  CONNECTIVITY: 'Problema de conexión', PHYSICAL_DAMAGE: 'Daño físico', OTHER: 'Otro problema',
};

const deviceTypeLabel: Record<string, string> = { MICROPHONE: 'Micrófono', ACTUATOR: 'Actuador', SENSOR: 'Sensor', HUB: 'Hub central' };

/** A scheduled order is in process once the technician started it at the home. */
export function stageOf(order: TechnicalOrder): OrderStage {
  if (order.status === 'COMPLETED') return 'COMPLETED';
  if (order.status === 'CANCELED' || order.status === 'CANCELLED') return 'CANCELED';
  if (order.startedAt) return 'IN_PROGRESS';
  return order.technicianId ? 'ASSIGNED' : 'PENDING';
}

/** What happened at the visit, or the step the incident is in: what the administration needs to follow it. */
export function processLabel(order: TechnicalOrder): string {
  if (order.serviceType === 'MAINTENANCE' && order.incident) {
    return incidentStatusLabel[order.incident.status as IncidentStatus] ?? order.incident.status;
  }
  const result = order.evaluationResult ?? order.installationResult;
  if (result) return resultLabel[result] ?? result;
  return stageLabel[stageOf(order)];
}

export const orderCode = (order: TechnicalOrder) => order.code ?? `ORD-${order.id}`;
export const homeName = (order: TechnicalOrder) => order.contactName ? `Hogar de ${order.contactName}` : 'Hogar de la solicitud';
export const problemOf = (incident: IncidentSummary) => problemLabel[incident.problemType ?? ''] ?? 'Otro problema';
export const deviceTypeOf = (type: string) => deviceTypeLabel[type] ?? type;
export { mapEmbedUrl, mapSearchUrl } from '../../shared/domain/map-links';

export const window = (order: TechnicalOrder) => `${order.startTime.slice(0, 5)} – ${order.endTime.slice(0, 5)}`;

const LONG_DAY = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const MOMENT = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Lima' });

/** "2026-11-05" → "Jueves, 5 de noviembre". */
export function formatDay(date: string): string {
  const text = LONG_DAY.format(new Date(`${date}T00:00:00Z`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const formatMoment = (value: string) => MOMENT.format(new Date(value));

const SHORT_MOMENT = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Lima' });
/** "3 nov., 23:46": when an order was opened, short enough for the list. */
export const formatShortMoment = (value: string) => SHORT_MOMENT.format(new Date(value));

/** When the order was opened: its first technician assignment. */
export const createdAt = (order: TechnicalOrder) => order.assignments?.[0]?.assignedAt ?? null;

export interface DayGroup { key: string; title: string; date: string | null; orders: TechnicalOrder[]; }

/** "2026-11-05" in Lima. */
export function limaToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(now);
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** Upcoming orders by visit day (Hoy, Mañana, then each date), each day by start time; past days go last as Anteriores. */
export function groupByDay(orders: TechnicalOrder[], today = limaToday()): DayGroup[] {
  const sorted = [...orders].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  const upcoming = new Map<string, TechnicalOrder[]>();
  for (const order of sorted.filter(item => item.date >= today)) upcoming.set(order.date, [...(upcoming.get(order.date) ?? []), order]);
  const tomorrow = addDays(today, 1);
  const groups: DayGroup[] = [...upcoming.entries()].map(([date, items]) => ({
    key: date,
    title: date === today ? `Hoy · ${formatDay(date)}` : date === tomorrow ? `Mañana · ${formatDay(date)}` : formatDay(date),
    date,
    orders: items,
  }));
  const past = sorted.filter(item => item.date < today).reverse();
  if (past.length > 0) groups.push({ key: 'past', title: 'Anteriores', date: null, orders: past });
  return groups;
}

/** Search by order code, home, technician or address. */
export function matches(order: TechnicalOrder, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return [orderCode(order), homeName(order), order.technicianName, order.directions, order.incident?.code]
    .some(value => value?.toLowerCase().includes(needle));
}
