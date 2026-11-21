import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IamStore } from '../../../application/iam.store';
import { meetsPasswordPolicy, MOBILE_PATTERN, PASSWORD_RULES, toPhoneNumber } from '../../../domain/sign-in.command';
import { EmailAlreadyRegistered } from '../../../infrastructure/iam.api';

const EMAIL_PATTERN = /^\s*[^\s@]+@[^\s@]+\.[^\s@]{2,}\s*$/;
const NAME_MAX_LENGTH = 75;
const strongPassword = (control: AbstractControl) => meetsPasswordPolicy(control.value) ? null : { weak: true };

/** Registers the administrator of a business; the account stays pending until the email is verified. */
@Component({ selector: 'app-sign-up', imports: [ReactiveFormsModule, RouterLink], templateUrl: './sign-up.html', styleUrls: ['../sign-in/sign-in.css', './sign-up.css'] })
export class SignUp {
  private readonly iam = inject(IamStore);
  protected readonly rules = PASSWORD_RULES;
  protected readonly loading = signal(false); protected readonly resending = signal(false);
  protected readonly error = signal(''); protected readonly emailTaken = signal(false);
  protected readonly notice = signal('');
  protected readonly showPassword = signal(false);
  /** Masked address the verification link went to; null while the form is shown. */
  protected readonly sentTo = signal<string | null>(null);
  protected readonly form = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(NAME_MAX_LENGTH)] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(NAME_MAX_LENGTH)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(EMAIL_PATTERN)] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(MOBILE_PATTERN)] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, strongPassword] }),
    confirmation: new FormControl('', { nonNullable: true, validators: Validators.required }),
    acceptedTerms: new FormControl(false, { nonNullable: true, validators: Validators.requiredTrue }),
  });
  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly password = computed(() => this.value().password ?? '');
  protected readonly matches = computed(() => this.password() === this.value().confirmation);

  protected invalid(field: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[field];
    const mismatch = field === 'confirmation' && control.value !== '' && !this.matches();
    return (control.invalid || mismatch) && control.touched;
  }

  /** Keeps the phone as the 9 digits the pattern checks, whatever spaces the user typed. */
  protected normalizePhone(): void {
    const control = this.form.controls.phone;
    control.setValue(control.value.replace(/\D/g, '').replace(/^51(?=9\d{8}$)/, ''));
  }

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.matches()) { this.focusFirstInvalid(); return; }
    this.loading.set(true); this.error.set(''); this.emailTaken.set(false);
    const { firstName, lastName, email, phone, password, acceptedTerms } = this.form.getRawValue();
    try {
      this.sentTo.set(await this.iam.signUp({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phoneNumber: toPhoneNumber(phone), password, acceptedTerms }));
    } catch (error) {
      if (error instanceof EmailAlreadyRegistered) this.emailTaken.set(true);
      else this.error.set(error instanceof Error ? error.message : 'No se pudo crear la cuenta.');
    } finally { this.loading.set(false); }
  }

  protected async resend(): Promise<void> {
    this.resending.set(true); this.notice.set(''); this.error.set('');
    try { await this.iam.resendVerification(this.form.controls.email.value.trim()); this.notice.set('Te enviamos un nuevo enlace. El anterior ya no funciona.'); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudo reenviar el enlace.'); }
    finally { this.resending.set(false); }
  }

  private focusFirstInvalid(): void {
    const field = (Object.keys(this.form.controls) as (keyof typeof this.form.controls)[]).find(name => this.invalid(name));
    if (field && typeof document !== 'undefined') document.getElementById(`sign-up-${field}`)?.focus();
  }
}
