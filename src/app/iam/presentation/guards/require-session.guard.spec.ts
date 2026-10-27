import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { IamStore } from '../../application/iam.store';
import { requireSession } from './require-session.guard';

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
});
