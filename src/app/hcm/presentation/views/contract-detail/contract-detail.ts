import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HcmStore } from '../../../application/hcm.store';
import { WorkSchedulesStore } from '../../../application/work-schedules.store';
import { formatDate, formatHours, workScheduleStatusLabel } from '../../../domain/work-schedule.entity';
import { contractModalityLabel, contractStatusLabel } from '../../../domain/contract.entity';

@Component({ selector: 'app-contract-detail', imports: [RouterLink], templateUrl: './contract-detail.html' })
export class ContractDetail implements OnInit {
  protected readonly store = inject(HcmStore); private readonly route = inject(ActivatedRoute);
  protected readonly schedules = inject(WorkSchedulesStore);
  protected readonly statusLabel = contractStatusLabel; protected readonly modalityLabel = contractModalityLabel;
  protected readonly scheduleStatusLabel = workScheduleStatusLabel; protected readonly formatDate = formatDate; protected readonly formatHours = formatHours;
  protected readonly activating = signal(false); protected readonly message = signal('');
  ngOnInit(): void {
    const contractId = Number(this.route.snapshot.paramMap.get('contractId'));
    void this.store.selectContract(Number(this.route.snapshot.paramMap.get('employeeId')), contractId);
    void this.schedules.loadContractSchedules(contractId);
  }

  protected async activate(employeeId: number, contractId: number): Promise<void> {
    this.activating.set(true); this.message.set('');
    try { await this.store.activateContract(employeeId, contractId); }
    catch (error) { this.message.set(error instanceof Error ? error.message : 'No se pudo activar el contrato.'); }
    finally { this.activating.set(false); }
  }
}
