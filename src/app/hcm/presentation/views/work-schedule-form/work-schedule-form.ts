import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { WorkSchedulesStore } from '../../../application/work-schedules.store';
import { Contract, contractModalityLabel, contractStatusLabel } from '../../../domain/contract.entity';
import {
  dayBlocksError, DayOfWeek, dayLabel, dayShortLabel, formatDate, formatHours, SaveWorkSchedule, toInputTime, totalHours,
  WEEK_DAYS, WorkSchedule, WorkScheduleStatus,
} from '../../../domain/work-schedule.entity';
import { HcmApiError } from '../../../infrastructure/hcm.api';
import { WorkScheduleSummary } from '../../components/work-schedule-summary/work-schedule-summary';

interface TimeBlock { startTime: string; endTime: string; }
interface DayPlan { day: DayOfWeek; enabled: boolean; blocks: TimeBlock[]; }
/** The contract the schedule is configured in; it also fixes the employee. */
type ScheduleContract = Pick<Contract, 'id' | 'code' | 'employeeId' | 'employeeName' | 'modality' | 'startDate' | 'endDate' | 'status'> & { weeklyHours: number | null };

const WEEKDAYS: readonly DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

function defaultPlan(): DayPlan[] {
  return WEEK_DAYS.map(day => WEEKDAYS.includes(day)
    ? { day, enabled: true, blocks: [{ startTime: '08:00', endTime: '12:00' }, { startTime: '13:00', endTime: '17:00' }] }
    : { day, enabled: false, blocks: [] });
}

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

@Component({ selector: 'app-work-schedule-form', imports: [ReactiveFormsModule, RouterLink, WorkScheduleSummary], templateUrl: './work-schedule-form.html', styleUrl: './work-schedule-form.css' })
export class WorkScheduleForm implements OnInit {
  protected readonly store = inject(WorkSchedulesStore); private readonly router = inject(Router); private readonly route = inject(ActivatedRoute);
  protected readonly dayLabel = dayLabel; protected readonly dayShortLabel = dayShortLabel;
  protected readonly formatHours = formatHours; protected readonly formatDate = formatDate; protected readonly totalHours = totalHours;
  protected readonly dayBlocksError = dayBlocksError;
  protected readonly modalityLabel = contractModalityLabel; protected readonly contractStatusLabel = contractStatusLabel;
  /** True when the form was opened from a contract or to edit: the contract cannot change. */
  protected readonly contractLocked = signal(false);
  protected readonly saving = signal(false); protected readonly message = signal(''); protected readonly conflict = signal(false);
  protected readonly editing = signal<WorkSchedule | null>(null);
  protected readonly days = signal<DayPlan[]>(defaultPlan());
  protected readonly form = new FormGroup({
    contractId: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    startDate: new FormControl(today(), { nonNullable: true, validators: Validators.required }),
    endDate: new FormControl('', { nonNullable: true }),
    indefinite: new FormControl(true, { nonNullable: true }),
  });
  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  protected readonly configuredHours = computed(() => totalHours(this.days().filter(day => day.enabled).flatMap(day => day.blocks)));
  protected readonly workingDaysList = computed(() => this.days().filter(day => day.enabled && day.blocks.length > 0).map(day => day.day));
  private readonly editedContract = signal<ScheduleContract | null>(null);
  protected readonly bindingContract = computed<ScheduleContract | null>(() => {
    const contractId = Number(this.value().contractId ?? this.form.controls.contractId.value);
    return this.editedContract() ?? this.store.openContracts().find(contract => contract.id === contractId) ?? null;
  });
  protected readonly applicationStatus = computed<WorkScheduleStatus>(() => {
    const editing = this.editing();
    if (editing?.status === 'DRAFT' || editing?.status === 'INACTIVE') return editing.status;
    return (this.value().startDate ?? '') > today() ? 'SCHEDULED' : 'ACTIVE';
  });
  protected readonly hasBlockErrors = computed(() => this.days().some(day => day.enabled && dayBlocksError(day.blocks) !== null));

  ngOnInit(): void { void this.initialize(); }

  private async initialize(): Promise<void> {
    const employeeId = Number(this.route.snapshot.paramMap.get('employeeId'));
    const workScheduleId = Number(this.route.snapshot.paramMap.get('workScheduleId'));
    if (!employeeId || !workScheduleId) {
      await this.store.loadOpenContracts();
      const fromContract = this.store.openContracts().find(contract => contract.id === Number(this.route.snapshot.queryParamMap.get('contractId')));
      if (fromContract) { this.contractLocked.set(true); this.form.controls.contractId.disable(); }
      this.selectContract(fromContract ?? this.store.openContracts()[0] ?? null);
      return;
    }
    await this.store.selectSchedule(employeeId, workScheduleId);
    const schedule = this.store.selected();
    if (!schedule) return;
    this.editing.set(schedule);
    if (schedule.contract) this.editedContract.set({ ...schedule.contract, employeeId: schedule.employeeId, employeeName: schedule.employeeName });
    this.form.patchValue({ contractId: schedule.contract?.id ?? 0, name: schedule.name, startDate: schedule.startDate, endDate: schedule.endDate ?? '', indefinite: !schedule.endDate });
    this.contractLocked.set(true); this.form.controls.contractId.disable();
    this.days.set(WEEK_DAYS.map(day => {
      const blocks = schedule.shifts.filter(shift => shift.day === day).map(shift => ({ startTime: toInputTime(shift.startTime), endTime: toInputTime(shift.endTime) }));
      return { day, enabled: blocks.length > 0, blocks };
    }));
  }

  protected changeContract(): void { this.selectContract(this.bindingContract()); }

  /** Starts the schedule with the contract (or today, if the contract already started). */
  private selectContract(contract: ScheduleContract | null): void {
    this.form.patchValue({ contractId: contract?.id ?? 0, startDate: contract && contract.startDate > today() ? contract.startDate : today() });
  }

  protected toggleDay(day: DayOfWeek): void {
    this.updateDay(day, plan => ({ ...plan, enabled: !plan.enabled, blocks: !plan.enabled && plan.blocks.length === 0 ? [{ startTime: '08:00', endTime: '12:00' }] : plan.blocks }));
  }

  protected addBlock(day: DayOfWeek): void {
    this.updateDay(day, plan => {
      const last = plan.blocks.at(-1);
      const start = last ? last.endTime : '08:00';
      return { ...plan, enabled: true, blocks: [...plan.blocks, { startTime: start, endTime: start < '20:00' ? addHours(start, 4) : '23:59' }] };
    });
  }

  protected removeBlock(day: DayOfWeek, index: number): void {
    this.updateDay(day, plan => ({ ...plan, blocks: plan.blocks.filter((_, position) => position !== index) }));
  }

  protected setTime(day: DayOfWeek, index: number, field: keyof TimeBlock, event: Event): void {
    const time = (event.target as HTMLInputElement).value;
    this.updateDay(day, plan => ({ ...plan, blocks: plan.blocks.map((block, position) => position === index ? { ...block, [field]: time } : block) }));
  }

  /** Copies Monday's blocks to Tuesday through Friday. */
  protected copyMondayToWeekdays(): void {
    const monday = this.days().find(plan => plan.day === 'MONDAY')!;
    this.days.update(plans => plans.map(plan => WEEKDAYS.includes(plan.day) && plan.day !== 'MONDAY'
      ? { ...plan, enabled: monday.enabled, blocks: monday.blocks.map(block => ({ ...block })) } : plan));
  }

  protected setIndefinite(event: Event): void {
    const indefinite = (event.target as HTMLInputElement).checked;
    this.form.patchValue({ indefinite, endDate: indefinite ? '' : this.form.controls.endDate.value });
  }

  protected async save(draft: boolean): Promise<void> {
    this.message.set(''); this.conflict.set(false);
    if (this.form.invalid) { this.form.markAllAsTouched(); this.message.set('Completa los campos obligatorios.'); return; }
    if (this.hasBlockErrors()) { this.message.set('Corrige los bloques horarios marcados antes de guardar.'); return; }
    const value = this.form.getRawValue();
    const endDate = value.indefinite || !value.endDate ? null : value.endDate;
    if (endDate && endDate < value.startDate) { this.message.set('La fecha de término no puede ser anterior a la de inicio.'); return; }
    const contract = this.bindingContract();
    if (!contract) { this.message.set('Elige el contrato dentro del cual se configura este horario.'); return; }
    if (value.startDate < contract.startDate || (endDate ?? value.startDate) > contract.endDate || value.startDate > contract.endDate) {
      this.message.set(`La vigencia del horario debe estar dentro del contrato ${contract.code} (${formatDate(contract.startDate)} – ${formatDate(contract.endDate)}).`); return;
    }
    const shifts = this.days().filter(plan => plan.enabled).flatMap(plan => plan.blocks.map(block => ({ day: plan.day, ...block })));
    if (!draft && shifts.length === 0) { this.message.set('Configura al menos un bloque horario para registrar el horario.'); return; }
    const input: SaveWorkSchedule = { name: value.name.trim(), startDate: value.startDate, endDate, shifts, draft };
    this.saving.set(true);
    try {
      const editing = this.editing();
      if (editing) await this.store.updateSchedule(editing.employeeId, editing.id, input);
      else await this.store.createSchedule(contract.employeeId, contract.id, input);
      await this.router.navigate(['/hcm/work-schedules']);
    } catch (error) { this.showError(error); }
    finally { this.saving.set(false); }
  }

  protected async deactivate(): Promise<void> {
    const editing = this.editing();
    if (!editing || !window.confirm(`¿Dar de baja el horario ${editing.code}? Ya no podrá modificarse.`)) return;
    this.saving.set(true); this.message.set('');
    try { await this.store.deactivateSchedule(editing.employeeId, editing.id); await this.router.navigate(['/hcm/work-schedules']); }
    catch (error) { this.showError(error); }
    finally { this.saving.set(false); }
  }

  private showError(error: unknown): void {
    this.conflict.set(error instanceof HcmApiError && error.status === 409);
    this.message.set(error instanceof Error ? error.message : 'No se pudo guardar el horario.');
  }

  private updateDay(day: DayOfWeek, change: (plan: DayPlan) => DayPlan): void {
    this.days.update(plans => plans.map(plan => plan.day === day ? change(plan) : plan));
  }
}

function addHours(time: string, hours: number): string {
  const [hour, minute] = time.split(':').map(Number);
  return `${String(Math.min((hour ?? 0) + hours, 23)).padStart(2, '0')}:${String(minute ?? 0).padStart(2, '0')}`;
}
