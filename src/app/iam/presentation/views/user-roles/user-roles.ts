import { Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { RoleFilter, UserRolesStore } from '../../../application/user-roles.store';
import { capabilitiesOf, incompatibility, ROLE_CATALOG, USER_ROLES, UserAccount, UserRole, userStatusLabel } from '../../../domain/user-role.entity';

/** US-17: who has which responsibility, and the switches to grant or withdraw each one. */
@Component({
  selector: 'app-user-roles', templateUrl: './user-roles.html', styleUrl: './user-roles.css',
  host: { '(document:keydown.escape)': 'close()' },
})
export class UserRoles implements OnInit {
  protected readonly store = inject(UserRolesStore);
  protected readonly catalog = ROLE_CATALOG; protected readonly statusLabel = userStatusLabel;
  protected readonly roles = USER_ROLES;
  protected readonly scopes = (['Negocio', 'Hogar'] as const).map(scope => ({ scope, roles: USER_ROLES.filter(role => ROLE_CATALOG[role].scope === scope) }));
  private readonly selectedId = signal<string | null>(null);
  /** Read from the store so the drawer shows the backend's answer after each change. */
  protected readonly selected = computed(() => this.store.users().find(user => user.id === this.selectedId()) ?? null);
  protected readonly capabilities = computed(() => capabilitiesOf(this.selected()?.roles ?? []));
  private readonly drawer = viewChild<ElementRef<HTMLElement>>('drawer');
  private opener: HTMLElement | null = null;

  ngOnInit(): void { void this.store.load(); }

  protected open(user: UserAccount, event: Event): void {
    this.opener = event.currentTarget as HTMLElement;
    this.store.rejection.set(null);
    this.selectedId.set(user.id);
    setTimeout(() => this.drawer()?.nativeElement.focus());
  }

  protected close(): void {
    if (!this.selectedId()) return;
    this.selectedId.set(null);
    this.opener?.focus();
  }

  protected search(event: Event): void { this.store.search.set((event.target as HTMLInputElement).value); }
  protected filter(event: Event): void { this.store.roleFilter.set((event.target as HTMLSelectElement).value as RoleFilter); }

  protected conflict(user: UserAccount, role: UserRole): string | null {
    return user.roles.includes(role) ? null : incompatibility(user.roles, role);
  }

  protected isPending(user: UserAccount, role: UserRole): boolean {
    const pending = this.store.pending();
    return pending?.userId === user.id && pending.role === role;
  }

  protected rejectionFor(user: UserAccount, role: UserRole): string | null {
    const rejection = this.store.rejection();
    return rejection?.userId === user.id && rejection.role === role ? rejection.message : null;
  }

  protected initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]!.toUpperCase()).join('') || '?';
  }

  protected capabilityCount(user: UserAccount): number { return capabilitiesOf(user.roles).length; }

  protected grantedBy(roles: UserRole[]): string { return roles.map(role => ROLE_CATALOG[role].label).join(' · '); }
}
