import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { IamStore } from '../../../../iam/application/iam.store';
import { AdminShell } from './admin-shell';

describe('AdminShell', () => {
  it('signs out and goes to the sign-in page', () => {
    const iam = { signOut: vi.fn() };
    const router = { navigate: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: IamStore, useValue: iam }, { provide: Router, useValue: router }] });
    const shell = TestBed.runInInjectionContext(() => new AdminShell());

    (shell as unknown as { signOut(): void }).signOut();
    expect(iam.signOut).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/sign-in']);
  });
});
