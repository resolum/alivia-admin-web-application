import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { PortalShell } from './portal-shell';

describe('PortalShell', () => {
  it('names the active section in the breadcrumb', () => {
    const page = { data: { title: 'Planes' }, firstChild: null };
    const router = { navigate: vi.fn(), events: new Subject(), routerState: { snapshot: { root: { data: {}, firstChild: null as unknown } } } };
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }] });
    const shell = TestBed.runInInjectionContext(() => new PortalShell()) as unknown as { breadcrumb(): string };

    expect(shell.breadcrumb()).toBe('');
    router.routerState.snapshot.root.firstChild = page;
    router.events.next(new NavigationEnd(1, '/commercial/plans', '/commercial/plans'));
    expect(shell.breadcrumb()).toBe('Planes');
  });
});
