import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { IamStore } from '../../../../iam/application/iam.store';
import { AdminShell } from './admin-shell';

describe('AdminShell', () => {
  it('signs out and goes to the sign-in page', () => {
    const iam = { signOut: vi.fn() };
    const router = { navigate: vi.fn(), events: new Subject(), routerState: { snapshot: { root: { data: {}, firstChild: null } } } };
    TestBed.configureTestingModule({ providers: [{ provide: IamStore, useValue: iam }, { provide: Router, useValue: router }] });
    const shell = TestBed.runInInjectionContext(() => new AdminShell());

    (shell as unknown as { signOut(): void }).signOut();
    expect(iam.signOut).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/sign-in']);
  });

  it('shows the breadcrumb of the deepest active route', () => {
    const page = { data: { breadcrumb: [{ label: 'Capital humano' }, { label: 'Empleados' }] }, firstChild: null };
    const router = { navigate: vi.fn(), events: new Subject(), routerState: { snapshot: { root: { data: {}, firstChild: null as unknown } } } };
    TestBed.configureTestingModule({ providers: [{ provide: IamStore, useValue: { signOut: vi.fn() } }, { provide: Router, useValue: router }] });
    const shell = TestBed.runInInjectionContext(() => new AdminShell()) as unknown as { breadcrumb(): { label: string }[] };
    expect(shell.breadcrumb()).toEqual([]);

    router.routerState.snapshot.root.firstChild = page;
    router.events.next(new NavigationEnd(1, '/hcm/employees', '/hcm/employees'));
    expect(shell.breadcrumb().map(crumb => crumb.label)).toEqual(['Capital humano', 'Empleados']);
  });
});
