export type CareActivityType = 'HYGIENE' | 'MEDICATION' | 'APPOINTMENT' | 'THERAPY' | 'MEAL' | 'BATH' | 'EXERCISE' | 'OTHER';
/** A caregiver shift (GET /shifts) shown in the agenda next to the activities; not a backend activity type. */
export type AgendaType = CareActivityType | 'SHIFT';
export type OccurrenceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'MISSED' | 'OMITTED';
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW' | 'ROUTINE';
export type OutcomeResult = 'ADMINISTERED' | 'OMITTED';

/** One occurrence of the care agenda (GET /care-agenda), as the backend computes it, or a shift turned into one. */
export interface AgendaItem {
  activity: { id: number; title: string; type: AgendaType };
  assignmentId: number;
  assistedPerson: { id: number | null; name: string | null } | null;
  date: string;
  startTime: string;
  endTime: string;
  startsAt: string;
  endsAt: string;
  responsible: { type: string; id: number | null; name: string | null; email: string | null } | null;
  recurring: boolean;
  status: OccurrenceStatus;
  /** Null for shifts: the backend gives them no priority and the client does not invent one. */
  priority: Priority | null;
}

/** A scheduled dose and its recorded outcome (GET /medication-administrations/{id}). */
export interface MedicationAdministration {
  administrationId: string;
  medication: string;
  assistedPerson: { id: number | null; name: string | null } | null;
  date: string;
  startTime: string;
  endTime: string;
  responsible: { type: string; id: number | null; name: string | null } | null;
  status: OccurrenceStatus;
  outcome: { result: OutcomeResult; occurredAt: string | null; reason: string | null } | null;
}

export interface CareNotification { id: number; type: string; title: string; body: string; status: 'UNREAD' | 'READ'; createdAt: string; }

export const activityTypeLabel: Record<AgendaType, string> = {
  SHIFT: 'Turno',
  HYGIENE: 'Higiene', MEDICATION: 'Medicamento', APPOINTMENT: 'Cita', THERAPY: 'Terapia', MEAL: 'Alimentación', BATH: 'Baño', EXERCISE: 'Ejercicio', OTHER: 'Actividad',
};
export const priorityLabel: Record<Priority, string> = { HIGH: 'Alta', MEDIUM: 'Media', LOW: 'Baja', ROUTINE: 'Rutina' };
export const statusLabel: Record<OccurrenceStatus, string> = {
  SCHEDULED: 'Programada', IN_PROGRESS: 'En curso', COMPLETED: 'Atendida', CANCELLED: 'Omitida', MISSED: 'Vencida', OMITTED: 'Omitida',
};

/** Same id the backend parses: "{assignmentId}-{yyyyMMdd}". */
export function administrationIdOf(item: Pick<AgendaItem, 'assignmentId' | 'date'>): string {
  return `${item.assignmentId}-${item.date.replaceAll('-', '')}`;
}

/** Still waiting for a caregiver: before or inside its window, or past it with nothing recorded yet. */
export function awaitsOutcome(dose: Pick<MedicationAdministration, 'status' | 'outcome'>): boolean {
  return !dose.outcome && ['SCHEDULED', 'IN_PROGRESS', 'MISSED'].includes(dose.status);
}

/** End of the attention window; an end before the start means the window crosses midnight. */
export function windowEnd(dose: Pick<MedicationAdministration, 'date' | 'startTime' | 'endTime'>): Date {
  const end = new Date(`${dose.date}T${dose.endTime.slice(0, 5)}:00-05:00`);
  if (dose.endTime < dose.startTime) end.setUTCDate(end.getUTCDate() + 1);
  return end;
}

/** Recorded after the attention window closed. Lima has no daylight saving, so the -05:00 offset is fixed. */
export function isLate(dose: MedicationAdministration): boolean {
  const at = dose.outcome?.occurredAt;
  return !!at && new Date(at.endsWith('Z') || /[+-]\d\d:\d\d$/.test(at) ? at : `${at}-05:00`) > windowEnd(dose);
}

/** Reminders announce what comes next; everything else in the inbox is an alert (a failure, a risk or a missed duty). */
export const REMINDER_TYPES: readonly string[] = ['CARE_ACTIVITY_REMINDER', 'ASSIGNMENT_CREATED', 'ORDER_RESCHEDULED'];
export const isReminder = (notification: CareNotification) => REMINDER_TYPES.includes(notification.type);

/** Agenda items starting within `leadMinutes` from now: the in-page reminders, recomputed every minute. */
export function upcoming(items: readonly AgendaItem[], now: Date, leadMinutes = 15): AgendaItem[] {
  const until = now.getTime() + leadMinutes * 60_000;
  return items.filter(item => {
    const start = new Date(`${item.startsAt}-05:00`).getTime();
    return item.status === 'SCHEDULED' && start >= now.getTime() && start <= until;
  });
}

/** A caregiver shift as GET /shifts returns it: UTC instants. */
export interface CareShift { id: string; caregiverId: string; caregiverName: string | null; startsAt: string; endsAt: string; notes: string | null; }

/** "2026-11-21T08:00:00" in Lima time, the same local form the agenda uses. */
export function limaLocal(instant: string): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .format(new Date(instant)).replace(' ', 'T');
}

/** Scheduled before it starts, in progress until it ends and finished afterwards, as the backend does for activities. */
export function shiftToItem(shift: CareShift, assistedPerson: AgendaItem['assistedPerson'], now: Date): AgendaItem {
  const startsAt = limaLocal(shift.startsAt);
  const endsAt = limaLocal(shift.endsAt);
  const status: OccurrenceStatus = now < new Date(shift.startsAt) ? 'SCHEDULED' : now < new Date(shift.endsAt) ? 'IN_PROGRESS' : 'COMPLETED';
  return {
    activity: { id: Number(shift.id), title: shift.notes?.trim() || 'Turno de cuidado', type: 'SHIFT' },
    assignmentId: Number(shift.id), assistedPerson, date: startsAt.slice(0, 10), startTime: startsAt.slice(11), endTime: endsAt.slice(11), startsAt, endsAt,
    responsible: { type: 'CAREGIVER', id: Number(shift.caregiverId), name: shift.caregiverName, email: null }, recurring: false, status, priority: null,
  };
}

/** Activities and shifts in one agenda, by start time. A caregiver sees only their own shifts; a relative sees all. */
export function mergeAgenda(items: readonly AgendaItem[], shifts: readonly CareShift[], myCaregiverIds: readonly number[], now: Date): AgendaItem[] {
  const names = new Set(items.map(item => item.assistedPerson?.name).filter(Boolean));
  // shortcut: /shifts does not name the assisted person; borrowed from the agenda when it has exactly one. Upgrade when the backend adds it.
  const person = names.size === 1 ? { id: null, name: [...names][0]! } : null;
  const own = myCaregiverIds.length ? shifts.filter(shift => myCaregiverIds.includes(Number(shift.caregiverId))) : shifts;
  return [...items, ...own.map(shift => shiftToItem(shift, person, now))].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** "22:00 – 06:00 (+1 día)" when the occurrence ends on a later day. */
export function timeRange(item: Pick<AgendaItem, 'date' | 'startTime' | 'endTime' | 'endsAt'>): string {
  const days = Math.round((Date.parse(`${item.endsAt.slice(0, 10)}T00:00:00Z`) - Date.parse(`${item.date}T00:00:00Z`)) / 86_400_000);
  return `${item.startTime.slice(0, 5)} – ${item.endTime.slice(0, 5)}${days > 0 ? ` (+${days} ${days === 1 ? 'día' : 'días'})` : ''}`;
}

/** A finished shift reads "Terminado", not "Atendida". */
export function statusText(item: Pick<AgendaItem, 'status' | 'activity'>): string {
  return item.activity.type === 'SHIFT' && item.status === 'COMPLETED' ? 'Terminado' : statusLabel[item.status];
}

/** Title and detail of the in-page reminder: what, when and for whom, never a change to an indication. */
export function reminderOf(item: AgendaItem): { title: string; detail: string } {
  const person = item.assistedPerson?.name ?? 'Persona asistida';
  if (item.activity.type === 'SHIFT') return { title: `Turno: ${timeRange(item)}`, detail: person };
  const prefix = item.activity.type === 'MEDICATION' ? 'Medicamento' : activityTypeLabel[item.activity.type];
  return { title: `${prefix}: ${item.activity.title}`, detail: `${person} · ${timeRange(item)}` };
}
