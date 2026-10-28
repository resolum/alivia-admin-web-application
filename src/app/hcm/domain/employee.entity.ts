import { Contract } from './contract.entity';
import { DayOfWeek, dayShortLabel, EmployeeRole, toInputTime, WEEK_DAYS, WorkSchedule } from './work-schedule.entity';

export type EmployeeStatus = 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
export type ContractState = 'ACTIVE' | 'EXPIRING' | 'PENDING' | 'EXPIRED' | 'TERMINATED' | 'NONE';
export type Availability = 'AVAILABLE' | 'OFF_SHIFT' | 'UNAVAILABLE';

export interface Employee {
  id: number;
  businessId: number;
  userId: number;
  corporateEmail: string;
  photoUrl: string | null;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  dni: string;
  birthDate: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  createdAt: string;
}

export interface CreateEmployee {
  corporateEmail: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  dni: string;
  birthDate: string;
  role: EmployeeRole;
}

/** An employee with the contract and schedule that the list shows next to it. */
export interface EmployeeRow {
  employee: Employee;
  code: string;
  contractState: ContractState;
  contract: Contract | null;
  schedule: WorkSchedule | null;
  scheduleDays: string | null;
  scheduleHours: string | null;
  availability: Availability;
}

export const CONTRACT_EXPIRY_WARNING_DAYS = 30;

export const employeeStatusLabel: Record<EmployeeStatus, string> = { ACTIVE: 'Activo', SUSPENDED: 'Suspendido', TERMINATED: 'Cesado' };
export const contractStateLabel: Record<ContractState, string> = {
  ACTIVE: 'Vigente', EXPIRING: 'Próximo a vencer', PENDING: 'Pendiente', EXPIRED: 'Vencido', TERMINATED: 'Finalizado', NONE: 'Sin contrato',
};
export const availabilityLabel: Record<Availability, string> = { AVAILABLE: 'Disponible', OFF_SHIFT: 'Fuera de jornada', UNAVAILABLE: 'No disponible' };

/** Readable code such as ALV-TEC-0482, built from the role and the id. */
export function employeeCode(employee: Pick<Employee, 'id' | 'role'>): string {
  const prefix = { TECH: 'TEC', SUBSCRIPTION_MANAGER: 'GES', CLEANING: 'LIM' }[employee.role];
  return `ALV-${prefix}-${String(employee.id).padStart(4, '0')}`;
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** The contract that matters today: the one in effect, else the next pending one, else the latest. */
export function currentContract(contracts: readonly Contract[]): Contract | null {
  const byStart = [...contracts].sort((a, b) => b.startDate.localeCompare(a.startDate));
  return byStart.find(contract => contract.status === 'ACTIVE') ?? byStart.find(contract => contract.status === 'PENDING') ?? byStart[0] ?? null;
}

export function contractState(contract: Contract | null, today: string): ContractState {
  if (!contract) return 'NONE';
  if (contract.status === 'ACTIVE' && contract.endDate <= addDays(today, CONTRACT_EXPIRY_WARNING_DAYS)) return 'EXPIRING';
  return contract.status;
}

/** "Lun. – Vie." for consecutive days, otherwise the days separated by commas. */
export function daysLabel(days: readonly DayOfWeek[]): string {
  const ordered = WEEK_DAYS.filter(day => days.includes(day));
  if (ordered.length === 0) return '';
  const indexes = ordered.map(day => WEEK_DAYS.indexOf(day));
  const consecutive = indexes.every((index, position) => position === 0 || index === indexes[position - 1]! + 1);
  if (consecutive && ordered.length > 2) return `${dayShortLabel[ordered[0]!]}. – ${dayShortLabel[ordered.at(-1)!]}.`;
  return ordered.map(day => dayShortLabel[day]).join(', ');
}

const JS_DAYS: readonly DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

/** Available when the contract is in effect and a shift of the schedule covers this moment. */
export function availability(state: ContractState, schedule: WorkSchedule | null, now: Date): Availability {
  if (!schedule || (state !== 'ACTIVE' && state !== 'EXPIRING')) return 'UNAVAILABLE';
  const day = JS_DAYS[now.getDay()]!;
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const onShift = schedule.shifts.some(shift => shift.day === day && toInputTime(shift.startTime) <= time && time < toInputTime(shift.endTime));
  return onShift ? 'AVAILABLE' : 'OFF_SHIFT';
}

export interface AvailabilityCheck { label: string; met: boolean; }

/** The three conditions that make an employee available, so the admin sees which one is missing. */
export function availabilityChecks(row: Pick<EmployeeRow, 'contractState' | 'schedule' | 'availability'>): AvailabilityCheck[] {
  const inForce = row.contractState === 'ACTIVE' || row.contractState === 'EXPIRING';
  return [
    { label: 'Contrato vigente', met: inForce },
    { label: 'Horario laboral activo dentro del contrato', met: row.schedule !== null },
    { label: 'En uno de sus bloques horarios en este momento', met: row.availability === 'AVAILABLE' },
  ];
}

export function toEmployeeRow(employee: Employee, contracts: readonly Contract[], schedules: readonly WorkSchedule[], now: Date): EmployeeRow {
  const today = now.toISOString().slice(0, 10);
  const contract = currentContract(contracts.filter(item => item.employeeId === employee.id));
  const state = contractState(contract, today);
  const schedule = schedules.find(item => item.employeeId === employee.id && (item.status === 'ACTIVE' || item.status === 'SCHEDULED')) ?? null;
  // From the earliest start to the latest end, so split shifts (08-12 and 13-17) read 08:00 – 17:00.
  const times = (schedule?.shifts ?? []).map(shift => [toInputTime(shift.startTime), toInputTime(shift.endTime)] as const);
  const byTime = (a: string, b: string) => a.localeCompare(b);
  const span = times.length ? `${times.map(([start]) => start).sort(byTime)[0]} – ${times.map(([, end]) => end).sort(byTime).at(-1)}` : null;
  return {
    employee, code: employeeCode(employee), contractState: state, contract, schedule,
    scheduleDays: schedule ? daysLabel(schedule.workingDays) : null,
    scheduleHours: span,
    availability: availability(state, schedule, now),
  };
}

/** Peruvian mobile numbers: 9 digits starting with 9; the backend stores them with the 51 country code. */
export function toPhoneNumber(mobile: string): string { return `51${mobile.replace(/\D/g, '')}`; }

export const DNI_PATTERN = /^\d{8}$/;
export const MOBILE_PATTERN = /^9\d{8}$/;
