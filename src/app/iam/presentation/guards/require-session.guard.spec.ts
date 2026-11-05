import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { IamStore } from '../../application/iam.store';
import { guestOnly, requireAdministration, requireSession, requireSubscriptionManager, requireTechnician } from './require-session.guard';

describe('requireSession', () => {
  it('redirects to sign-in without a valid or renewable session', async () => {
    const iam = { ensureSession: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: IamStore, useValue: iam }] });
    const guard = () => TestBed.runInInjectionContext(() => requireSession({} as never, { url: '/hcm/work-schedules' } as never));

    iam.ensureSession.mockResolvedValue(false);
    const redirect = await guard() as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(redirect)).toBe('/sign-in?returnUrl=%2Fhcm%2Fwork-schedules');

    iam.ensureSession.mockResolvedValue(true);
    expect(await guard()).toBe(true);
  });

  it('sends a signed-in user from the sign-in page to their portal', () => {
    const iam = { isAuthenticated: vi.fn(), homeUrl: vi.fn(() => '/hcm/contracts') };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: IamStore, useValue: iam }] });
    const run = () => TestBed.runInInjectionContext(() => guestOnly({} as never, {} as never));

    iam.isAuthenticated.mockReturnValue(false);
    expect(run()).toBe(true);
    iam.isAuthenticated.mockReturnValue(true);
    expect(TestBed.inject(Router).serializeUrl(run() as UrlTree)).toBe('/hcm/contracts');
  });

  it('keeps technicians in their portal and everyone else in the administration', () => {
    const iam = { isTechnician: vi.fn(), isSubscriptionManager: vi.fn().mockReturnValue(false), isAdministrator: vi.fn().mockReturnValue(false), homeUrl: vi.fn() };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: IamStore, useValue: iam }] });
    const run = (guard: typeof requireTechnician) => TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    const url = (tree: unknown) => TestBed.inject(Router).serializeUrl(tree as UrlTree);

    iam.isTechnician.mockReturnValue(true); iam.homeUrl.mockReturnValue('/technician/home');
    expect(run(requireTechnician)).toBe(true);
    expect(url(run(requireAdministration))).toBe('/technician/home');

    iam.isTechnician.mockReturnValue(false); iam.isAdministrator.mockReturnValue(true); iam.homeUrl.mockReturnValue('/hcm/contracts');
    expect(run(requireAdministration)).toBe(true);
    expect(url(run(requireTechnician))).toBe('/hcm/contracts');
    expect(url(run(requireSubscriptionManager))).toBe('/hcm/contracts');

    iam.isAdministrator.mockReturnValue(false); iam.isSubscriptionManager.mockReturnValue(true); iam.homeUrl.mockReturnValue('/commercial/home');
    expect(run(requireSubscriptionManager)).toBe(true);
    expect(url(run(requireAdministration))).toBe('/commercial/home');

    // A role with no portal (cleaning staff, an unknown role) is denied everywhere.
    iam.isSubscriptionManager.mockReturnValue(false); iam.homeUrl.mockReturnValue('/access-denied');
    expect(url(run(requireAdministration))).toBe('/access-denied');
    expect(url(run(requireTechnician))).toBe('/access-denied');
    expect(url(run(requireSubscriptionManager))).toBe('/access-denied');
  });
});
