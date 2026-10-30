import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContractModality, ContractStatus, contractModalityLabel, contractStatusLabel } from '../../../domain/contract.entity';
import { HcmStore } from '../../../application/hcm.store';

@Component({ selector: 'app-contracts-list', imports: [RouterLink], templateUrl: './contracts-list.html' })
export class ContractsList implements OnInit {
  protected readonly store = inject(HcmStore);
  protected readonly statusLabel = contractStatusLabel;
  protected readonly modalityLabel = contractModalityLabel;
  ngOnInit(): void { void this.store.loadContracts(); }
  protected search(event: Event): void { this.store.setFilters({ search: (event.target as HTMLInputElement).value }); }
  protected status(event: Event): void { this.store.setFilters({ status: (event.target as HTMLSelectElement).value as ContractStatus | 'ALL' }); }
  protected modality(event: Event): void { this.store.setFilters({ modality: (event.target as HTMLSelectElement).value as ContractModality | 'ALL' }); }
}
