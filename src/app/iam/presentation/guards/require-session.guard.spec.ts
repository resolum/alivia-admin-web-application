import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { IamStore } from '../../application/iam.store';
import { requireAdministration, requireSession, requireSubscriptionManager, requireTechnician } from './require-session.guard';

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
    const iam = { isTechnician: vi.fn(), isSubscriptionManager: vi.fn().mockReturnValue(false), homeUrl: vi.fn() };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: IamStore, useValue: iam }] });
    const run = (guard: typeof requireTechnician) => TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    const url = (tree: unknown) => TestBed.inject(Router).serializeUrl(tree as UrlTree);

    iam.isTechnician.mockReturnValue(true); iam.homeUrl.mockReturnValue('/technician/home');
    expect(run(requireTechnician)).toBe(true);
    expect(url(run(requireAdministration))).toBe('/technician/home');

    iam.isTechnician.mockReturnValue(false); iam.homeUrl.mockReturnValue('/hcm/contracts');
    expect(run(requireAdministration)).toBe(true);
    expect(url(run(requireTechnician))).toBe('/hcm/contracts');
    expect(url(run(requireSubscriptionManager))).toBe('/hcm/contracts');

    iam.isSubscriptionManager.mockReturnValue(true); iam.homeUrl.mockReturnValue('/commercial/home');
    expect(run(requireSubscriptionManager)).toBe(true);
    expect(url(run(requireAdministration))).toBe('/commercial/home');
  });
});
