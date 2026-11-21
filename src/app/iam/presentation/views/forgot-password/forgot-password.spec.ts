import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { IamStore } from '../../../application/iam.store';
import { ForgotPassword } from './forgot-password';

type Page = { email: { value: string; setValue(value: string): void }; submit(): Promise<void>; sentTo(): string | null; error(): string };

describe('ForgotPassword', () => {
  const iam = { requestPasswordRecovery: vi.fn() };

  function open(email: string | null = null): Page {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [
      { provide: IamStore, useValue: iam },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => email } } } },
    ] });
    return TestBed.runInInjectionContext(() => new ForgotPassword()) as unknown as Page;
  }

  beforeEach(() => { iam.requestPasswordRecovery.mockReset(); });

  it('keeps the email typed on the sign-in page and sends the link', async () => {
    const page = open('ana@alivia.pe');
    expect(page.email.value).toBe('ana@alivia.pe');
    await page.submit();
    expect(iam.requestPasswordRecovery).toHaveBeenCalledWith('ana@alivia.pe');
    expect(page.sentTo()).toBe('ana@alivia.pe');
  });

  it('does not send an invalid email and shows the backend refusal', async () => {
    const page = open();
    page.email.setValue('ana@');
    await page.submit();
    expect(iam.requestPasswordRecovery).not.toHaveBeenCalled();

    iam.requestPasswordRecovery.mockImplementation(async () => { throw new Error('No fue posible iniciar la recuperación con ese correo.'); });
    page.email.setValue('nadie@alivia.pe');
    await page.submit();
    expect(page.sentTo()).toBeNull();
    expect(page.error()).toContain('No fue posible');
  });
});
