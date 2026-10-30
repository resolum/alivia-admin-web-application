import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IamStore } from '../../../../iam/application/iam.store';

/**
 * Account block at the bottom of every portal sidebar (administration, technicians and commercial):
 * avatar with initials, name, role and the menu to sign out.
 */
@Component({ selector: 'app-shell-account', templateUrl: './shell-account.html', styleUrl: './shell-account.css' })
export class ShellAccount implements OnInit {
  private readonly iam = inject(IamStore); private readonly router = inject(Router);
  /** Role shown under the name. */
  readonly role = input.required<string>();
  /** Name used when the account has no staff profile, as the administrator. */
  readonly fallbackName = input<string | null>(null);
  protected readonly menuOpen = signal(false);
  private readonly staffName = signal<string | null>(null);
  protected readonly name = computed(() => this.staffName() ?? this.fallbackName() ?? this.iam.currentEmail() ?? 'Usuario Alivia');
  protected readonly initials = computed(() => this.name().replace(/@.*/, '').split(/[\s._-]+/)
    .filter(word => word && !/^dr[a]?\.?$/i.test(word)).slice(0, 2).map(word => word[0]!.toUpperCase()).join(''));

  ngOnInit(): void { void this.iam.staffName().then(name => this.staffName.set(name)); }

  protected signOut(): void { this.iam.signOut(); void this.router.navigate(['/sign-in']); }
}
