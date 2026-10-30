import { ContractModality, ContractStatus } from './contract.entity';

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export type WorkScheduleStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'FINISHED' | 'INACTIVE';
export type WorkloadCompliance = 'COMPLIANT' | 'UNDER' | 'OVER' | 'NO_REFERENCE';
export type EmployeeRole = 'TECH' | 'SUBSCRIPTION_MANAGER' | 'CLEANING';

export const WEEK_DAYS: readonly DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
export const LEGAL_WEEKLY_HOURS = 48;

export interface WorkShift { day: DayOfWeek; startTime: string; endTime: string; }

export interface AssociatedContract {
  id: number;
  code: string;
  modality: ContractModality;
  weeklyHours: number | null;
  startDate: string;
  endDate: string;
  status: ContractStatus;
}

export interface WorkSchedule {
  id: number;
  code: string;
  employeeId: number;
  employeeName: string;
  employeeRole: EmployeeRole | null;
  businessId: number;
  name: string;
  startDate: string;
  endDate: string | null;
  status: WorkScheduleStatus;
  shifts: WorkShift[];
  workingDays: DayOfWeek[];
  weeklyHours: number;
  contract: AssociatedContract | null;
  compliance: WorkloadCompliance;
  exceedsLegalLimit: boolean;
  lastModifiedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveWorkSchedule {
  name: string;
  startDate: string;
  endDate: string | null;
  shifts: WorkShift[];
  draft: boolean;
}

export interface WorkScheduleSummary { totalSchedules: number; employeesWithSchedule: number; averageWeeklyHours: number; }

export interface WorkSchedulePage { content: WorkSchedule[]; page: number; size: number; totalElements: number; totalPages: number; }

export interface WorkScheduleFilters {
  search: string;
  role: EmployeeRole | 'ALL';
  status: WorkScheduleStatus | 'ALL';
  page: number;
  size: number;
}

export const dayShortLabel: Record<DayOfWeek, string> = {
  MONDAY: 'Lu', TUESDAY: 'Ma', WEDNESDAY: 'Mi', THURSDAY: 'Ju', FRIDAY: 'Vi', SATURDAY: 'Sá', SUNDAY: 'Do',
};

export const dayLabel: Record<DayOfWeek, string> = {
  MONDAY: 'Lunes', TUESDAY: 'Martes', WEDNESDAY: 'Miércoles', THURSDAY: 'Jueves', FRIDAY: 'Viernes', SATURDAY: 'Sábado', SUNDAY: 'Domingo',
};

export const workScheduleStatusLabel: Record<WorkScheduleStatus, string> = {
  DRAFT: 'Borrador', SCHEDULED: 'Programado', ACTIVE: 'Vigente', FINISHED: 'Periodo concluido', INACTIVE: 'Dado de baja',
};

export const employeeRoleLabel: Record<EmployeeRole, string> = {
  TECH: 'Soporte técnico', SUBSCRIPTION_MANAGER: 'Gestor de suscripciones', CLEANING: 'Limpieza',
};

/** Minutes between two "HH:mm" times; negative or zero when the block is not valid. */
export function blockMinutes(startTime: string, endTime: string): number {
  return toMinutes(endTime) - toMinutes(startTime);
}

export function totalHours(shifts: readonly Pick<WorkShift, 'startTime' | 'endTime'>[]): number {
  const minutes = shifts.reduce((sum, shift) => sum + Math.max(0, blockMinutes(shift.startTime, shift.endTime)), 0);
  return Math.round(minutes / 6) / 10;
}

/** Validation message for the blocks of one day, or null when they are valid. */
export function dayBlocksError(blocks: readonly Pick<WorkShift, 'startTime' | 'endTime'>[]): string | null {
  if (blocks.some(block => !block.startTime || !block.endTime)) return 'Completa la hora de inicio y fin de cada bloque.';
  if (blocks.some(block => blockMinutes(block.startTime, block.endTime) <= 0)) return 'Cada bloque debe terminar después de empezar y no cruzar la medianoche.';
  const sorted = [...blocks].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  for (let index = 1; index < sorted.length; index++) {
    if (toMinutes(sorted[index]!.startTime) < toMinutes(sorted[index - 1]!.endTime)) return 'Los bloques del mismo día no pueden cruzarse.';
  }
  return null;
}

/** "08:00:00" or "08:00" to "08:00", the format of time inputs. */
export function toInputTime(time: string): string { return time.slice(0, 5); }

export function formatHours(hours: number): string { return Number.isInteger(hours) ? `${hours}` : hours.toFixed(1); }

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

/** "2024-01-01" to "01 ene 2024". */
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
  return `${String(day).padStart(2, '0')} ${months[(month ?? 1) - 1]} ${year}`;
}

export function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]!.toUpperCase()).join('');
}

/** Text that explains how the configured hours compare with the associated contract. */
export function complianceText(schedule: Pick<WorkSchedule, 'contract' | 'compliance' | 'weeklyHours'>): string {
  const contract = schedule.contract;
  if (!contract) return 'El horario aún no está vinculado a un contrato: se vincula al publicarlo.';
  if (schedule.compliance === 'NO_REFERENCE') return `El contrato ${contract.code} no pacta horas semanales.`;
  const agreed = `El contrato ${contract.code} pacta ${contract.weeklyHours} h semanales`;
  if (schedule.compliance === 'COMPLIANT') return `${agreed}. No presenta horas en exceso.`;
  const difference = formatHours(Math.abs(schedule.weeklyHours - (contract.weeklyHours ?? 0)));
  return schedule.compliance === 'OVER' ? `${agreed}: el horario lo excede en ${difference} h.` : `${agreed}: faltan ${difference} h por asignar.`;
}

export const complianceLabel: Record<WorkloadCompliance, string> = {
  COMPLIANT: 'En cumplimiento', UNDER: 'Horas por asignar', OVER: 'Exceso de horas', NO_REFERENCE: 'Sin horas pactadas',
};
