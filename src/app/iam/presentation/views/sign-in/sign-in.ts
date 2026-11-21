import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IamStore } from '../../../application/iam.store';

/** Same check the backend applies to an email: something@domain.tld, no spaces. */
const EMAIL_PATTERN = /^\s*[^\s@]+@[^\s@]+\.[^\s@]{2,}\s*$/;

@Component({ selector: 'app-sign-in', imports: [ReactiveFormsModule, RouterLink], templateUrl: './sign-in.html', styleUrl: './sign-in.css' })
export class SignIn {
  private readonly iam = inject(IamStore); private readonly router = inject(Router); private readonly route = inject(ActivatedRoute);
  protected readonly loading = signal(false); protected readonly error = signal('');
  protected readonly showPassword = signal(false);
  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(EMAIL_PATTERN)] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    remember: new FormControl(true, { nonNullable: true }),
  });

  protected invalid(field: 'email' | 'password'): boolean {
    const control = this.form.controls[field];
    return control.invalid && control.touched;
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true); this.error.set('');
    const { email, password, remember } = this.form.getRawValue();
    try {
      await this.iam.signIn({ email: email.trim(), password }, remember);
      await this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') || this.iam.homeUrl());
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudo iniciar sesión.'); }
    finally { this.loading.set(false); }
  }
}
