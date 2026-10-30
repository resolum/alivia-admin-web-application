import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { IamStore } from '../../application/iam.store';
import { requireAdministration, requireSession, requireTechnician } from './require-session.guard';

describe('requireSession', () => {
  it('redirects to sign-in without a valid session', () => {
    const iam = { isAuthenticated: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: IamStore, useValue: iam }] });
    const guard = () => TestBed.runInInjectionContext(() => requireSession({} as never, { url: '/hcm/work-schedules' } as never));

    iam.isAuthenticated.mockReturnValue(false);
    const redirect = guard() as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(redirect)).toBe('/sign-in?returnUrl=%2Fhcm%2Fwork-schedules');

    iam.isAuthenticated.mockReturnValue(true);
    expect(guard()).toBe(true);
  });

  it('keeps technicians in their portal and everyone else in the administration', () => {
    const iam = { isTechnician: vi.fn(), homeUrl: vi.fn() };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: IamStore, useValue: iam }] });
    const run = (guard: typeof requireTechnician) => TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    const url = (tree: unknown) => TestBed.inject(Router).serializeUrl(tree as UrlTree);

    iam.isTechnician.mockReturnValue(true); iam.homeUrl.mockReturnValue('/technician/my-day');
    expect(run(requireTechnician)).toBe(true);
    expect(url(run(requireAdministration))).toBe('/technician/my-day');

    iam.isTechnician.mockReturnValue(false); iam.homeUrl.mockReturnValue('/hcm/contracts');
    expect(run(requireAdministration)).toBe(true);
    expect(url(run(requireTechnician))).toBe('/hcm/contracts');
  });
});
