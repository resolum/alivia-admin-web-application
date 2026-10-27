import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HcmStore } from '../../../application/hcm.store';
import { CreateContract } from '../../../domain/contract.entity';
import { CURRENT_BUSINESS_ID } from '../../../../shared/infrastructure/api.config';

@Component({ selector: 'app-contract-form', imports: [ReactiveFormsModule, RouterLink], templateUrl: './contract-form.html', styleUrl: './contract-form.css' })
export class ContractForm implements OnInit {
  protected readonly store = inject(HcmStore); private readonly router = inject(Router); private readonly route = inject(ActivatedRoute);
  protected readonly saving = signal(false); protected readonly message = signal(''); protected readonly editing = signal(false);
  protected readonly form = new FormGroup({
    code: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^CTR-ALV-\d{4}-\d{4,8}$/)] }),
    employeeId: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    position: new FormControl('Técnico de dispositivos', { nonNullable: true, validators: Validators.required }),
    modality: new FormControl<'HOURLY'|'SERVICE'>('SERVICE', { nonNullable: true }),
    weeklyHours: new FormControl(40, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    startDate: new FormControl('2024-12-01', { nonNullable: true, validators: Validators.required }),
    endDate: new FormControl('2025-11-30', { nonNullable: true }),
    initialStatus: new FormControl<'PENDING'|'ACTIVE'>('PENDING', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true, validators: Validators.maxLength(300) }),
  });
  async ngOnInit(): Promise<void> {
    this.generateCode();
    await this.store.loadEmployees();
    const employeeId = Number(this.route.snapshot.paramMap.get('employeeId'));
    const contractId = Number(this.route.snapshot.paramMap.get('contractId'));
    if (!employeeId || !contractId) { if (this.store.employees()[0]) this.form.controls.employeeId.setValue(this.store.employees()[0]!.id); return; }
    this.editing.set(true);
    await this.store.selectContract(employeeId, contractId);
    const contract = this.store.selected();
    if (contract) this.form.patchValue({ code: contract.code, employeeId: contract.employeeId, position: contract.position, modality: contract.modality, weeklyHours: contract.weeklyHours, startDate: contract.startDate, endDate: contract.endDate ?? '', initialStatus: contract.status === 'ACTIVE' ? 'ACTIVE' : 'PENDING', notes: contract.notes });
  }
  protected async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.message.set('');
    try {
      const value = this.form.getRawValue();
      const input: CreateContract = { ...value, businessId: CURRENT_BUSINESS_ID };
      const employeeId = Number(this.route.snapshot.paramMap.get('employeeId')); const contractId = Number(this.route.snapshot.paramMap.get('contractId'));
      if (this.editing() && employeeId && contractId) {
        const { position, modality, weeklyHours, startDate, endDate, notes } = input;
        await this.store.updateContract(employeeId, contractId, { position, modality, weeklyHours, startDate, endDate, notes });
      } else await this.store.saveContract(input);
      await this.router.navigate(['/hcm/contracts']);
    } catch (error) { this.message.set(error instanceof Error ? error.message : 'No se pudo guardar el contrato.'); }
    finally { this.saving.set(false); }
  }

  protected generateCode(): void {
    if (this.editing()) return;
    const digits = crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000;
    this.form.controls.code.setValue(`CTR-ALV-${new Date().getFullYear()}-${digits.toString().padStart(6, '0')}`);
  }
}
