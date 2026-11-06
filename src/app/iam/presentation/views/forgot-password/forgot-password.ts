import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IamStore } from '../../../application/iam.store';

/** Asks for the account email and sends it a temporary link to choose a new password. */
@Component({ selector: 'app-forgot-password', imports: [ReactiveFormsModule, RouterLink], templateUrl: './forgot-password.html', styleUrl: '../activate-account/activate-account.css' })
export class ForgotPassword {
  private readonly iam = inject(IamStore);
  protected readonly email = new FormControl(inject(ActivatedRoute).snapshot.queryParamMap.get('email') ?? '', {
    nonNullable: true, validators: [Validators.required, Validators.pattern(/^\s*[^\s@]+@[^\s@]+\.[^\s@]{2,}\s*$/)],
  });
  protected readonly sending = signal(false);
  protected readonly error = signal('');
  /** Address the link went to; null while the form is shown. */
  protected readonly sentTo = signal<string | null>(null);

  protected async submit(): Promise<void> {
    if (this.email.invalid) { this.email.markAsTouched(); return; }
    this.sending.set(true); this.error.set('');
    const email = this.email.value.trim();
    try { await this.iam.requestPasswordRecovery(email); this.sentTo.set(email); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudo enviar el enlace de recuperación.'); }
    finally { this.sending.set(false); }
  }
}
