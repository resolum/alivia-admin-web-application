import { computed, inject, Injectable, signal } from '@angular/core';
import { incompatibility, UserAccount, UserRole } from '../domain/user-role.entity';
import { UsersApi } from '../infrastructure/users.api';

export type RoleFilter = UserRole | 'ALL' | 'NONE';
export interface RoleChange { userId: string; role: UserRole; }

@Injectable({ providedIn: 'root' })
export class UserRolesStore {
  private readonly api = inject(UsersApi);
  private readonly usersState = signal<UserAccount[]>([]);
  readonly users = this.usersState.asReadonly();
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly roleFilter = signal<RoleFilter>('ALL');
  /** Role being granted or withdrawn, so only that switch waits for the backend. */
  readonly pending = signal<RoleChange | null>(null);
  /** Last rejected change, shown next to the role it was about. */
  readonly rejection = signal<(RoleChange & { message: string }) | null>(null);

  readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const filter = this.roleFilter();
    return this.usersState().filter(user => (filter === 'ALL' || (filter === 'NONE' ? user.roles.length === 0 : user.roles.includes(filter)))
      && (!term || `${user.fullName} ${user.email}`.toLowerCase().includes(term)));
  });

  async load(): Promise<void> {
    this.loading.set(true); this.error.set(null);
    try { this.usersState.set(await this.api.listUsers()); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudieron consultar los usuarios.'); }
    finally { this.loading.set(false); }
  }

  /** Grants or withdraws one role; an incompatible grant is rejected before reaching the backend. */
  async toggle(user: UserAccount, role: UserRole): Promise<void> {
    if (this.pending()) return;
    const granting = !user.roles.includes(role);
    this.rejection.set(null);
    const conflict = granting ? incompatibility(user.roles, role) : null;
    if (conflict) { this.rejection.set({ userId: user.id, role, message: conflict }); return; }
    this.pending.set({ userId: user.id, role });
    try {
      const updated = granting ? await this.api.assignRole(user.id, role) : await this.api.withdrawRole(user.id, role);
      this.usersState.update(users => users.map(item => item.id === updated.id ? updated : item));
    } catch (error) {
      this.rejection.set({ userId: user.id, role, message: error instanceof Error ? error.message : 'No se pudo actualizar la responsabilidad.' });
    } finally { this.pending.set(null); }
  }
}
