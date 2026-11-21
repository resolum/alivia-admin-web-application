import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HcmStore } from '../../../application/hcm.store';
import { WorkSchedulesStore } from '../../../application/work-schedules.store';
import { formatDate, formatHours, workScheduleStatusLabel } from '../../../domain/work-schedule.entity';
import { Contract, contractActionLabel, contractModalityLabel, contractStatusLabel, ContractVersion } from '../../../domain/contract.entity';

@Component({ selector: 'app-contract-detail', imports: [RouterLink], templateUrl: './contract-detail.html', styleUrl: './contract-detail.css' })
export class ContractDetail implements OnInit {
  protected readonly store = inject(HcmStore); private readonly route = inject(ActivatedRoute);
  protected readonly schedules = inject(WorkSchedulesStore);
  protected readonly statusLabel = contractStatusLabel; protected readonly modalityLabel = contractModalityLabel;
  protected readonly actionLabel = contractActionLabel;
  protected readonly scheduleStatusLabel = workScheduleStatusLabel; protected readonly formatDate = formatDate; protected readonly formatHours = formatHours;
  protected readonly activating = signal(false); protected readonly message = signal('');
  protected readonly saving = signal(false);
  /** Renewal form, open with the dates being typed. */
  protected readonly renewal = signal<{ startDate: string; endDate: string } | null>(null);
  /** null while the history loads. */
  protected readonly history = signal<ContractVersion[] | null>(null);
  protected readonly historyError = signal('');
  private readonly employeeId = Number(this.route.snapshot.paramMap.get('employeeId'));
  private readonly contractId = Number(this.route.snapshot.paramMap.get('contractId'));

  ngOnInit(): void {
    void this.store.selectContract(this.employeeId, this.contractId);
    void this.schedules.loadContractSchedules(this.contractId);
    void this.loadHistory();
  }

  protected async activate(employeeId: number, contractId: number): Promise<void> {
    this.activating.set(true); this.message.set('');
    try { await this.store.activateContract(employeeId, contractId); void this.loadHistory(); }
    catch (error) { this.message.set(error instanceof Error ? error.message : 'No se pudo activar el contrato.'); }
    finally { this.activating.set(false); }
  }

  /** Renewing keeps the current start by default and asks only for the new end. */
  protected openRenewal(contract: Contract): void {
    this.message.set('');
    this.renewal.set({ startDate: contract.startDate, endDate: '' });
  }

  protected setRenewal(field: 'startDate' | 'endDate', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.renewal.update(current => current && { ...current, [field]: value });
  }

  protected async renew(contract: Contract, event: Event): Promise<void> {
    event.preventDefault();
    const period = this.renewal();
    if (!period) return;
    if (!period.startDate || !period.endDate) { this.message.set('Indica el inicio y el nuevo término del contrato.'); return; }
    if (contract.endDate && period.endDate <= contract.endDate) { this.message.set(`El nuevo término debe ser posterior al ${contract.endDate}.`); return; }
    if (period.endDate < period.startDate) { this.message.set('El término no puede ser anterior al inicio.'); return; }
    await this.run(() => this.store.renewContract(contract.employeeId, contract.id, period), 'No se pudo renovar el contrato.');
    if (!this.message()) this.renewal.set(null);
  }

  protected async terminate(contract: Contract): Promise<void> {
    if (!window.confirm(`¿Finalizar el contrato ${contract.code}? Quedará en el historial y ya no podrá modificarse ni renovarse.`)) return;
    await this.run(() => this.store.terminateContract(contract.employeeId, contract.id), 'No se pudo finalizar el contrato.');
  }

  protected moment(value: string): string { return value.replace('T', ' ').slice(0, 16); }

  private async run(change: () => Promise<unknown>, fallback: string): Promise<void> {
    this.saving.set(true); this.message.set('');
    try { await change(); void this.loadHistory(); }
    catch (error) { this.message.set(error instanceof Error ? error.message : fallback); }
    finally { this.saving.set(false); }
  }

  private async loadHistory(): Promise<void> {
    this.historyError.set('');
    try { this.history.set((await this.store.contractHistory(this.employeeId, this.contractId)).sort((a, b) => b.version - a.version)); }
    catch (error) { this.history.set([]); this.historyError.set(error instanceof Error ? error.message : 'No se pudo consultar el historial.'); }
  }
}
