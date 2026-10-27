import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IamStore } from '../../../application/iam.store';
import { AccountActivation, meetsPasswordPolicy, PASSWORD_RULES } from '../../../domain/sign-in.command';

type State = 'loading' | 'invalid' | 'ready' | 'done';

/** Page opened from the invitation email: the new employee chooses their password. */
@Component({ selector: 'app-activate-account', imports: [ReactiveFormsModule, RouterLink], templateUrl: './activate-account.html', styleUrl: '../sign-in/sign-in.css' })
export class ActivateAccount implements OnInit {
  private readonly iam = inject(IamStore); private readonly route = inject(ActivatedRoute);
  protected readonly rules = PASSWORD_RULES;
  protected readonly state = signal<State>('loading');
  protected readonly account = signal<AccountActivation | null>(null);
  protected readonly error = signal(''); protected readonly saving = signal(false);
  protected readonly form = new FormGroup({
    password: new FormControl('', { nonNullable: true, validators: Validators.required }),
    confirmation: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });
  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly password = computed(() => this.value().password ?? '');
  protected readonly matches = computed(() => this.password() !== '' && this.password() === this.value().confirmation);
  protected readonly valid = computed(() => meetsPasswordPolicy(this.password()) && this.matches());
  private token = '';

  ngOnInit(): void { void this.load(); }

  private async load(): Promise<void> {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) { this.fail('El enlace de activación no es válido o ya fue usado.'); return; }
    try { this.account.set(await this.iam.getActivation(this.token)); this.state.set('ready'); }
    catch (error) { this.fail(error instanceof Error ? error.message : 'No se pudo revisar el enlace.'); }
  }

  protected async submit(): Promise<void> {
    if (!this.valid()) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.error.set('');
    try { await this.iam.activate(this.token, this.password()); this.state.set('done'); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudo activar la cuenta.'); }
    finally { this.saving.set(false); }
  }

  private fail(message: string): void { this.error.set(message); this.state.set('invalid'); }
}
