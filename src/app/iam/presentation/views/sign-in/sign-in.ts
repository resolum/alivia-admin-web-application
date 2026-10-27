import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IamStore } from '../../../application/iam.store';

@Component({ selector: 'app-sign-in', imports: [ReactiveFormsModule], templateUrl: './sign-in.html', styleUrl: './sign-in.css' })
export class SignIn {
  private readonly iam = inject(IamStore); private readonly router = inject(Router); private readonly route = inject(ActivatedRoute);
  protected readonly loading = signal(false); protected readonly error = signal('');
  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });

  protected async submit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true); this.error.set('');
    try {
      await this.iam.signIn(this.form.getRawValue());
      await this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') || '/hcm/contracts');
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudo iniciar sesión.'); }
    finally { this.loading.set(false); }
  }
}
