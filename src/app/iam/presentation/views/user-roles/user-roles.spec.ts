import { TestBed } from '@angular/core/testing';
import { UserAccount } from '../../../domain/user-role.entity';
import { UsersApi } from '../../../infrastructure/users.api';
import { UserRoles } from './user-roles';

const ana: UserAccount = { id: 'u1', email: 'ana@alivia.pe', fullName: 'Ana Pérez', status: 'ACTIVE', roles: ['TECH'] };
const luis: UserAccount = { id: 'u2', email: 'luis@alivia.pe', fullName: 'Luis Rojas', status: 'SUSPENDED', roles: [] };

describe('UserRoles', () => {
  const api = { listUsers: vi.fn(), assignRole: vi.fn(), withdrawRole: vi.fn() };

  async function render(users: UserAccount[] | Error) {
    Object.values(api).forEach(mock => mock.mockReset());
    if (users instanceof Error) api.listUsers.mockImplementation(async () => { throw users; });
    else api.listUsers.mockResolvedValue(users);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: UsersApi, useValue: api }] });
    const fixture = TestBed.createComponent(UserRoles);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('lists users with their responsibilities and filters them', async () => {
    const { fixture, element } = await render([ana, luis]);
    expect(element.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(element.textContent).toContain('Técnico o instalador');
    expect(element.textContent).toContain('Sin responsabilidad');

    const search = element.querySelector<HTMLInputElement>('#user-search')!;
    search.value = 'zzz'; search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(element.textContent).toContain('No encontramos usuarios');

    search.value = ''; search.dispatchEvent(new Event('input'));
    const filter = element.querySelector<HTMLSelectElement>('#role-filter')!;
    filter.value = 'NONE'; filter.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('grants a role from the drawer, rejects an incompatible one and closes with Escape', async () => {
    const { fixture, element } = await render([ana]);
    const manage = element.querySelector<HTMLButtonElement>('.view-link')!;
    manage.click();
    fixture.detectChanges();
    const drawer = element.querySelector('.drawer')!;
    expect(drawer.textContent).toContain('Ana Pérez');
    expect(drawer.textContent).toContain('Atender órdenes de evaluación e instalación');
    expect(drawer.textContent).toContain('No compatible con su rol actual');

    const switches = () => [...element.querySelectorAll<HTMLButtonElement>('.switch')];
    const byRole = (label: string) => switches().find(button => button.getAttribute('aria-labelledby') === `role-${label}`)!;

    byRole('SUBSCRIPTION_MANAGER').click();
    await fixture.whenStable(); fixture.detectChanges();
    expect(api.assignRole).not.toHaveBeenCalled();
    expect(element.querySelector('.rejection')!.textContent).toContain('no puede aprobar su suscripción');

    api.assignRole.mockResolvedValue({ ...ana, roles: ['TECH', 'ADMIN'] });
    byRole('ADMIN').click();
    await fixture.whenStable(); fixture.detectChanges();
    expect(api.assignRole).toHaveBeenCalledWith('u1', 'ADMIN');
    expect(byRole('ADMIN').getAttribute('aria-checked')).toBe('true');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(element.querySelector('.drawer')).toBeNull();
  });

  it('shows the empty and the error states', async () => {
    expect((await render([])).element.textContent).toContain('Todavía no hay usuarios en tu negocio');
    const failed = await render(new Error('No se pudo conectar con el servicio de usuarios.'));
    expect(failed.element.querySelector('[role="alert"]')!.textContent).toContain('No se pudo conectar');
  });
});
