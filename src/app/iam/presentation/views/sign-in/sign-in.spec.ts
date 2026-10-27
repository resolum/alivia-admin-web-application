import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { IamStore } from '../../../application/iam.store';
import { SignIn } from './sign-in';

type SignInInternals = { form: { setValue(value: object): void }; submit(): Promise<void>; error(): string; loading(): boolean };

describe('SignIn', () => {
  const iam = { signIn: vi.fn() };
  const router = { navigateByUrl: vi.fn() };
  let returnUrl: string | null;
  let component: SignInInternals;

  beforeEach(() => {
    iam.signIn.mockReset(); router.navigateByUrl.mockReset(); returnUrl = null;
    TestBed.configureTestingModule({ providers: [
      { provide: IamStore, useValue: iam }, { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => returnUrl } } } },
    ] });
    component = TestBed.runInInjectionContext(() => new SignIn()) as unknown as SignInInternals;
  });

  it('does not call the backend with an invalid form', async () => {
    await component.submit();
    expect(iam.signIn).not.toHaveBeenCalled();
  });

  it('signs in and returns to the requested page', async () => {
    returnUrl = '/hcm/work-schedules';
    component.form.setValue({ email: 'admin@alivia.test', password: 'secret' });
    await component.submit();
    expect(iam.signIn).toHaveBeenCalledWith({ email: 'admin@alivia.test', password: 'secret' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/hcm/work-schedules');

    returnUrl = null;
    await component.submit();
    expect(router.navigateByUrl).toHaveBeenLastCalledWith('/hcm/contracts');
  });

  it('shows the sign-in error', async () => {
    iam.signIn.mockRejectedValue(new Error('Correo o contraseña incorrectos.'));
    component.form.setValue({ email: 'admin@alivia.test', password: 'bad' });
    await component.submit();
    expect(component.error()).toBe('Correo o contraseña incorrectos.');
    expect(component.loading()).toBe(false);
  });
});
