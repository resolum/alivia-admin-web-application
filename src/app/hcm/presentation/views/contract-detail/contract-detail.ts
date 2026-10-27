import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HcmStore } from '../../../application/hcm.store';
import { contractModalityLabel, contractStatusLabel } from '../../../domain/contract.entity';

@Component({ selector: 'app-contract-detail', imports: [RouterLink], templateUrl: './contract-detail.html' })
export class ContractDetail implements OnInit {
  protected readonly store = inject(HcmStore); private readonly route = inject(ActivatedRoute);
  protected readonly statusLabel = contractStatusLabel; protected readonly modalityLabel = contractModalityLabel;
  ngOnInit(): void { void this.store.selectContract(Number(this.route.snapshot.paramMap.get('employeeId')), Number(this.route.snapshot.paramMap.get('contractId'))); }
}
