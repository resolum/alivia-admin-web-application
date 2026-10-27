import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EmployeesStore } from '../../../application/employees.store';
import { DNI_PATTERN, Employee, employeeCode, MOBILE_PATTERN, toPhoneNumber } from '../../../domain/employee.entity';
import { EmployeeRole, employeeRoleLabel, formatDate } from '../../../domain/work-schedule.entity';
import { HcmApiError } from '../../../infrastructure/hcm.api';
import { DateSelect } from '../../components/date-select/date-select';

type Step = 1 | 2 | 3 | 4;

function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** A birth date must be before today: any past day, month or year is valid. */
function pastDate(control: AbstractControl): ValidationErrors | null {
  return control.value && control.value >= localDate(new Date()) ? { notPast: true } : null;
}

function sameEmail(group: AbstractControl): ValidationErrors | null {
  const { corporateEmail, confirmEmail } = group.value as { corporateEmail: string; confirmEmail: string };
  return corporateEmail && confirmEmail && corporateEmail.trim().toLowerCase() !== confirmEmail.trim().toLowerCase() ? { emailMismatch: true } : null;
}

@Component({ selector: 'app-employee-form', imports: [ReactiveFormsModule, RouterLink, DateSelect], templateUrl: './employee-form.html', styleUrl: './employee-form.css' })
export class EmployeeForm {
  private readonly store = inject(EmployeesStore);
  protected readonly roleLabel = employeeRoleLabel; protected readonly formatDate = formatDate; protected readonly employeeCode = employeeCode;
  protected readonly steps = [{ step: 1, title: 'Información personal', hint: 'Datos y DNI' }, { step: 2, title: 'Información laboral', hint: 'Rol' }, { step: 3, title: 'Acceso plataforma', hint: 'Correo Alivia' }, { step: 4, title: 'Revisión', hint: 'Confirmación' }] as const;
  protected readonly step = signal<Step>(1);
  protected readonly saving = signal(false); protected readonly message = signal('');
  protected readonly registered = signal<Employee | null>(null);
  protected readonly personal = new FormGroup({
    dni: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(DNI_PATTERN)] }),
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
    paternalSurname: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
    maternalSurname: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
    birthDate: new FormControl('', { nonNullable: true, validators: [Validators.required, pastDate] }),
    mobile: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(MOBILE_PATTERN)] }),
  });
  protected readonly work = new FormGroup({ role: new FormControl<EmployeeRole>('TECH', { nonNullable: true }) });
  protected readonly access = new FormGroup({
    corporateEmail: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    confirmEmail: new FormControl('', { nonNullable: true, validators: Validators.required }),
  }, { validators: sameEmail });
  protected readonly confirmed = new FormControl(false, { nonNullable: true });
  private readonly personalValue = toSignal(this.personal.valueChanges, { initialValue: this.personal.getRawValue() });
  protected readonly fullName = computed(() => {
    const value = this.personalValue();
    return [value.firstName, value.paternalSurname, value.maternalSurname].map(part => part?.trim()).filter(Boolean).join(' ');
  });

  protected next(): void {
    const group = [this.personal, this.work, this.access][this.step() - 1];
    if (group?.invalid) { group.markAllAsTouched(); return; }
    this.step.update(step => Math.min(step + 1, 4) as Step);
  }

  protected back(): void { this.step.update(step => Math.max(step - 1, 1) as Step); }

  /** Only steps already completed can be reopened from the stepper or the summary. */
  protected goTo(step: Step): void { if (step < this.step()) this.step.set(step); }

  protected invalid(control: AbstractControl): boolean { return control.invalid && control.touched; }

  /** DNI and mobile only take digits: anything else typed or pasted is dropped. */
  protected digitsOnly(control: AbstractControl, event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    if (digits !== input.value) { input.value = digits; control.setValue(digits); }
  }

  protected mobileError(): string {
    const mobile = this.personal.controls.mobile.value;
    if (!mobile) return 'Ingresa el número de celular.';
    if (!mobile.startsWith('9')) return 'Un celular en Perú empieza con 9.';
    return `Faltan ${9 - mobile.length} dígitos: el celular tiene 9.`;
  }

  protected async submit(): Promise<void> {
    if (!this.confirmed.value || this.personal.invalid || this.access.invalid) return;
    const personal = this.personal.getRawValue();
    this.saving.set(true); this.message.set('');
    try {
      this.registered.set(await this.store.create({
        corporateEmail: this.access.getRawValue().corporateEmail.trim().toLowerCase(),
        phoneNumber: toPhoneNumber(personal.mobile), dni: personal.dni, birthDate: personal.birthDate,
        firstName: personal.firstName.trim(),
        lastName: `${personal.paternalSurname.trim()} ${personal.maternalSurname.trim()}`,
        role: this.work.getRawValue().role,
      }));
    } catch (error) {
      const conflict = error instanceof HcmApiError && error.status === 409;
      this.message.set(conflict ? `${error.message} Revisa el DNI y el correo institucional.` : error instanceof Error ? error.message : 'No se pudo registrar al empleado.');
    } finally { this.saving.set(false); }
  }
}
