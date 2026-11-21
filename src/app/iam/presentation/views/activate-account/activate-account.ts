import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IamStore } from '../../../application/iam.store';
import { meetsPasswordPolicy, PASSWORD_RULES } from '../../../domain/sign-in.command';

type State = 'loading' | 'invalid' | 'ready' | 'done';
/** "activation": invitation link of a new employee. "reset": code from the password recovery email (route data `mode`). */
export type PasswordLinkMode = 'activation' | 'reset';

/** Page where the owner of an invitation link or a recovery code chooses a new password. */
@Component({ selector: 'app-activate-account', imports: [ReactiveFormsModule, RouterLink], templateUrl: './activate-account.html', styleUrl: './activate-account.css' })
export class ActivateAccount implements OnInit {
  private readonly iam = inject(IamStore); private readonly route = inject(ActivatedRoute);
  protected readonly mode: PasswordLinkMode = this.route.snapshot.data?.['mode'] ?? 'activation';
  protected readonly rules = PASSWORD_RULES;
  protected readonly state = signal<State>('loading');
  protected readonly account = signal<{ email: string; fullName?: string } | null>(null);
  protected readonly error = signal(''); protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly showPassword = signal(false); protected readonly showConfirmation = signal(false);
  protected readonly form = new FormGroup({
    code: new FormControl('', { nonNullable: true }),
    password: new FormControl('', { nonNullable: true, validators: Validators.required }),
    confirmation: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });
  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly password = computed(() => this.value().password ?? '');
  protected readonly matches = computed(() => this.password() !== '' && this.password() === this.value().confirmation);
  protected readonly meetsPolicy = computed(() => meetsPasswordPolicy(this.password()));
  protected readonly codeOk = computed(() => this.mode !== 'reset' || /^\d{6}$/.test((this.value().code ?? '').trim()));
  protected readonly valid = computed(() => this.codeOk() && this.meetsPolicy() && this.matches());
  private token = '';

  ngOnInit(): void { void this.load(); }

  private async load(): Promise<void> {
    if (this.mode === 'reset') {
      // IAM checks the code only when the new password is sent; here we just need the address.
      const email = this.route.snapshot.queryParamMap.get('email')?.trim();
      if (email) { this.account.set({ email }); this.state.set('ready'); }
      else this.fail('Primero solicita un código de recuperación con tu correo.');
      return;
    }
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) { this.fail('El enlace de activación no es válido o ya fue usado.'); return; }
    try {
      this.account.set(await this.iam.getActivation(this.token));
      this.state.set('ready');
    } catch (error) { this.fail(error instanceof Error ? error.message : 'No se pudo revisar el enlace.'); }
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (!this.valid()) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.error.set('');
    try {
      if (this.mode === 'reset') await this.iam.resetPassword(this.account()!.email, this.value().code!.trim(), this.password());
      else await this.iam.activate(this.token, this.password());
      this.state.set('done');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar la contraseña.';
      // An expired link or code cannot be retried: offer a new one. A mistyped code stays inline.
      if (/venció|no es válido/.test(message)) this.fail(message); else this.error.set(message);
    } finally { this.saving.set(false); }
  }

  private fail(message: string): void { this.error.set(message); this.state.set('invalid'); }
}
