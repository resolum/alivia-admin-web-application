import { Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { limaToday } from '../../../../operations/domain/technical-order.entity';
import { administrationIdOf, awaitsOutcome, isLate, MedicationAdministration, OutcomeResult, statusLabel } from '../../../domain/care.entity';
import { AssistanceApi, AssistanceApiError } from '../../../infrastructure/assistance.api';

const addDays = (date: string, days: number) => { const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); };
const timeFormat = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });

/** Confirms or omits scheduled doses and shows their verifiable history (US-37). */
@Component({ selector: 'app-medication-log', imports: [FormsModule], templateUrl: './medication-log.html', styleUrl: './medication-log.css' })
export class MedicationLog implements OnInit {
  private readonly api = inject(AssistanceApi);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  protected readonly from = signal(addDays(limaToday(), -6));
  protected readonly to = signal(limaToday());
  protected readonly doses = signal<MedicationAdministration[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly statusLabel = statusLabel;
  protected readonly late = isLate;

  protected readonly pending = computed(() => this.doses().filter(awaitsOutcome));
  protected readonly history = computed(() => this.doses().filter(dose => !awaitsOutcome(dose)).reverse());

  /** The dose being recorded; `existing` is set when the backend says it already had an outcome. */
  protected readonly editing = signal<{ dose: MedicationAdministration; result: OutcomeResult } | null>(null);
  protected readonly reason = signal('');
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly existing = signal<MedicationAdministration | null>(null);

  ngOnInit(): void { void this.load(); }

  protected async load(): Promise<void> {
    this.loading.set(true); this.error.set(null);
    try {
      const items = (await this.api.agenda(this.from(), this.to())).filter(item => item.activity.type === 'MEDICATION');
      // shortcut: one request per closed dose to read its real time and reason; a list endpoint would save the round trips.
      this.doses.set(await Promise.all(items.map(async item => {
        const dose: MedicationAdministration = {
          administrationId: administrationIdOf(item), medication: item.activity.title, assistedPerson: item.assistedPerson,
          date: item.date, startTime: item.startTime, endTime: item.endTime, responsible: item.responsible, status: item.status, outcome: null,
        };
        return awaitsOutcome(dose) && dose.status !== 'MISSED' ? dose : this.api.administration(dose.administrationId).catch(() => dose);
      })));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo consultar las administraciones.');
    } finally { this.loading.set(false); }
  }

  protected open(dose: MedicationAdministration, result: OutcomeResult): void {
    this.editing.set({ dose, result });
    this.reason.set(''); this.saveError.set(null); this.existing.set(null);
    this.dialog()?.nativeElement.showModal();
  }

  protected close(): void { this.dialog()?.nativeElement.close(); this.editing.set(null); }

  protected async save(): Promise<void> {
    const editing = this.editing();
    // The button is disabled while saving, and this guard stops a double submit by keyboard.
    if (!editing || this.saving()) return;
    if (editing.result === 'OMITTED' && !this.reason().trim()) { this.saveError.set('Indica el motivo de la omisión.'); return; }
    this.saving.set(true); this.saveError.set(null);
    try {
      this.replace(await this.api.recordOutcome(editing.dose.administrationId, editing.result, this.reason().trim() || null));
      this.close();
    } catch (error) {
      if (error instanceof AssistanceApiError && error.status === 409) {
        const current = await this.api.administration(editing.dose.administrationId).catch(() => null);
        if (current) { this.replace(current); this.existing.set(current); }
      }
      this.saveError.set(error instanceof Error ? error.message : 'No se pudo guardar el resultado.');
    } finally { this.saving.set(false); }
  }

  private replace(dose: MedicationAdministration): void {
    this.doses.update(list => list.map(item => item.administrationId === dose.administrationId ? dose : item));
  }

  protected person(dose: MedicationAdministration): string { return dose.assistedPerson?.name ?? 'Persona asistida'; }
  protected scheduled(dose: MedicationAdministration): string { return `${timeFormat.format(new Date(`${dose.date}T${dose.startTime.slice(0, 5)}:00Z`))} – ${dose.endTime.slice(0, 5)}`; }
  /** Wall-clock time in Lima as sent by the backend, shown as is. */
  protected actual(dose: MedicationAdministration): string { return dose.outcome?.occurredAt ? timeFormat.format(new Date(`${dose.outcome.occurredAt.slice(0, 16)}:00Z`)) : 'Sin registro'; }
  protected result(dose: MedicationAdministration): string {
    if (dose.outcome?.result === 'ADMINISTERED') return 'Administrada';
    if (dose.status === 'MISSED') return 'Vencida sin confirmación';
    return 'Omitida';
  }
  protected css(dose: MedicationAdministration): string {
    return dose.outcome?.result === 'ADMINISTERED' ? 'completed' : dose.status === 'MISSED' ? 'missed' : 'omitted';
  }
}
