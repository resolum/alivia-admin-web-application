import { TestBed } from '@angular/core/testing';
import { IamStore } from '../../../application/iam.store';
import { EmailAlreadyRegistered } from '../../../infrastructure/iam.api';
import { SignUp } from './sign-up';

type Page = {
  form: { setValue(value: object): void; patchValue(value: object): void };
  submit(): Promise<void>; resend(): Promise<void>; normalizePhone(): void;
  sentTo(): string | null; emailTaken(): boolean; error(): string; notice(): string; invalid(field: string): boolean;
};

const valid = { firstName: ' Carlos ', lastName: 'Mendoza', email: 'Carlos@ClinicaSanPablo.pe', phone: '987654321', password: 'Clave#2026x', confirmation: 'Clave#2026x', acceptedTerms: true };

describe('SignUp', () => {
  const iam = { signUp: vi.fn(), resendVerification: vi.fn() };
  let page: Page;

  beforeEach(() => {
    Object.values(iam).forEach(mock => mock.mockReset());
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: IamStore, useValue: iam }] });
    page = TestBed.runInInjectionContext(() => new SignUp()) as unknown as Page;
  });

  it('does not send an incomplete form, a weak password or a wrong confirmation', async () => {
    await page.submit();
    page.form.setValue({ ...valid, password: 'debil123', confirmation: 'debil123' });
    await page.submit();
    page.form.setValue({ ...valid, confirmation: 'Otra#2026x' });
    await page.submit();
    expect(page.invalid('confirmation')).toBe(true);
    page.form.setValue({ ...valid, acceptedTerms: false });
    await page.submit();
    expect(iam.signUp).not.toHaveBeenCalled();
  });

  it('registers the administrator and shows where the link went', async () => {
    iam.signUp.mockResolvedValue('c***@clinicasanpablo.pe');
    page.form.setValue({ ...valid, phone: '+51 987 654 321' });
    page.normalizePhone();
    await page.submit();
    expect(iam.signUp).toHaveBeenCalledWith({ firstName: 'Carlos', lastName: 'Mendoza', email: 'Carlos@ClinicaSanPablo.pe', phoneNumber: '51987654321', password: 'Clave#2026x', acceptedTerms: true });
    expect(page.sentTo()).toBe('c***@clinicasanpablo.pe');

    await page.resend();
    expect(iam.resendVerification).toHaveBeenCalledWith('Carlos@ClinicaSanPablo.pe');
    expect(page.notice()).toContain('nuevo enlace');
  });

  it('offers sign in when the email already has an account, and shows other errors', async () => {
    page.form.setValue(valid);
    iam.signUp.mockImplementationOnce(async () => { throw new EmailAlreadyRegistered('taken'); });
    await page.submit();
    expect(page.emailTaken()).toBe(true);

    iam.signUp.mockImplementationOnce(async () => { throw new Error('El registro no está disponible en este momento.'); });
    await page.submit();
    expect(page.emailTaken()).toBe(false);
    expect(page.error()).toContain('no está disponible');
    expect(page.sentTo()).toBeNull();
  });
});
