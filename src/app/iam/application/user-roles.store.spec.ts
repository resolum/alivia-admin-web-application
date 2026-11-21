import { TestBed } from '@angular/core/testing';
import { UserAccount } from '../domain/user-role.entity';
import { UsersApi } from '../infrastructure/users.api';
import { UserRolesStore } from './user-roles.store';

const ana: UserAccount = { id: 'u1', email: 'ana@alivia.pe', fullName: 'Ana Pérez', status: 'ACTIVE', roles: ['TECH'] };
const luis: UserAccount = { id: 'u2', email: 'luis@alivia.pe', fullName: 'Luis Rojas', status: 'ACTIVE', roles: [] };

describe('UserRolesStore', () => {
  const api = { listUsers: vi.fn(), assignRole: vi.fn(), withdrawRole: vi.fn() };
  let store: UserRolesStore;

  beforeEach(async () => {
    Object.values(api).forEach(mock => mock.mockReset());
    api.listUsers.mockResolvedValue([ana, luis]);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: UsersApi, useValue: api }] });
    store = TestBed.inject(UserRolesStore);
    await store.load();
  });

  it('filters by name, email and role', () => {
    store.search.set('LUIS');
    expect(store.filtered()).toEqual([luis]);
    store.search.set('');
    store.roleFilter.set('TECH');
    expect(store.filtered()).toEqual([ana]);
    store.roleFilter.set('NONE');
    expect(store.filtered()).toEqual([luis]);
  });

  it('grants and withdraws a role with the backend answer', async () => {
    api.assignRole.mockResolvedValue({ ...ana, roles: ['TECH', 'ADMIN'] });
    await store.toggle(ana, 'ADMIN');
    expect(api.assignRole).toHaveBeenCalledWith('u1', 'ADMIN');
    expect(store.users()[0]!.roles).toEqual(['TECH', 'ADMIN']);

    api.withdrawRole.mockResolvedValue({ ...ana, roles: ['ADMIN'] });
    await store.toggle(store.users()[0]!, 'TECH');
    expect(api.withdrawRole).toHaveBeenCalledWith('u1', 'TECH');
    expect(store.users()[0]!.roles).toEqual(['ADMIN']);
    expect(store.pending()).toBeNull();
  });

  it('rejects an incompatible grant before calling the backend', async () => {
    await store.toggle(ana, 'SUBSCRIPTION_MANAGER');
    expect(api.assignRole).not.toHaveBeenCalled();
    expect(store.rejection()).toMatchObject({ userId: 'u1', role: 'SUBSCRIPTION_MANAGER' });
  });

  it('shows what the backend rejected, such as a missing permission', async () => {
    api.assignRole.mockRejectedValue(new Error('No tienes permiso para gestionar responsabilidades. El intento quedó registrado.'));
    await store.toggle(luis, 'CLEANING');
    expect(store.rejection()?.message).toContain('quedó registrado');
    expect(store.users()[1]!.roles).toEqual([]);
  });

  it('reports a failed load', async () => {
    api.listUsers.mockRejectedValue(new Error('No se pudo conectar con el servicio de usuarios.'));
    await store.load();
    expect(store.error()).toContain('No se pudo conectar');
    expect(store.loading()).toBe(false);
  });
});
