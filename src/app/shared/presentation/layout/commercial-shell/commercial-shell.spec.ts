import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { CommercialShell } from './commercial-shell';

describe('CommercialShell', () => {
  it('lists the commercial sections and names the active one', () => {
    const page = { data: { title: 'Planes' }, firstChild: null };
    const router = { navigate: vi.fn(), events: new Subject(), routerState: { snapshot: { root: { data: {}, firstChild: null as unknown } } } };
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }] });
    const shell = TestBed.runInInjectionContext(() => new CommercialShell()) as unknown as {
      breadcrumb(): string; sections: { links: unknown[] }[];
    };

    expect(shell.sections.flatMap(section => section.links)).toHaveLength(5);
    router.routerState.snapshot.root.firstChild = page;
    router.events.next(new NavigationEnd(1, '/commercial/plans', '/commercial/plans'));
    expect(shell.breadcrumb()).toBe('Planes');
  });
});
