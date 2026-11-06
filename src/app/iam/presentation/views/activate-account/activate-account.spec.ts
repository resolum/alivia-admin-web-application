import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { IamStore } from '../../../application/iam.store';
import { ActivateAccount } from './activate-account';

type Page = { state(): string; error(): string; account(): unknown; valid(): boolean; form: { setValue(value: object): void }; submit(): Promise<void> };

describe('ActivateAccount', () => {
  const iam = { getActivation: vi.fn(), activate: vi.fn(), getPasswordReset: vi.fn(), resetPassword: vi.fn() };
  let data: object = {};
  let token: string | null;

  async function open(): Promise<Page> {
    TestBed.configureTestingModule({ providers: [
      { provide: IamStore, useValue: iam },
      { provide: ActivatedRoute, useValue: { snapshot: { data, queryParamMap: { get: () => token } } } },
    ] });
    const page = TestBed.runInInjectionContext(() => new ActivateAccount());
    page.ngOnInit();
    for (let tick = 0; tick < 3; tick++) await Promise.resolve();
    return page as unknown as Page;
  }

  beforeEach(() => { Object.values(iam).forEach(mock => mock.mockReset()); token = 'abc'; data = {}; TestBed.resetTestingModule(); });

  it('rejects a link without token or an invalid one', async () => {
    token = null;
    expect((await open()).state()).toBe('invalid');
    TestBed.resetTestingModule();
    token = 'abc';
    iam.getActivation.mockRejectedValue(new Error('El enlace de activación venció.'));
    const page = await open();
    expect(page.state()).toBe('invalid');
    expect(page.error()).toContain('venció');
  });

  it('activates the account once the password meets the policy and is confirmed', async () => {
    iam.getActivation.mockResolvedValue({ email: 'ana@alivia.pe', fullName: 'Ana Pérez', expiresAt: '' });
    const page = await open();
    expect(page.state()).toBe('ready');

    page.form.setValue({ password: 'debil', confirmation: 'debil' });
    expect(page.valid()).toBe(false);
    await page.submit();
    expect(iam.activate).not.toHaveBeenCalled();

    page.form.setValue({ password: 'Clave#2026x', confirmation: 'Clave#2026x' });
    expect(page.valid()).toBe(true);
    iam.activate.mockRejectedValueOnce(new Error('La contraseña no cumple los requisitos de seguridad.'));
    await page.submit();
    expect(page.error()).toContain('requisitos');

    await page.submit();
    expect(iam.activate).toHaveBeenLastCalledWith('abc', 'Clave#2026x');
    expect(page.state()).toBe('done');
  });

  it('resets a password from a valid recovery link', async () => {
    data = { mode: 'reset' };
    iam.getPasswordReset.mockResolvedValue({ email: 'ana@alivia.pe', expiresAt: '' });
    const page = await open();
    expect(iam.getActivation).not.toHaveBeenCalled();
    page.form.setValue({ password: 'Clave#2026x', confirmation: 'Clave#2026x' });
    await page.submit();
    expect(iam.resetPassword).toHaveBeenCalledWith('abc', 'Clave#2026x');
    expect(page.state()).toBe('done');
  });

  it('offers a new recovery link when the link expired, even while the form was open', async () => {
    data = { mode: 'reset' };
    iam.getPasswordReset.mockRejectedValueOnce(new Error('El enlace de recuperación venció. Solicita uno nuevo.'));
    expect((await open()).state()).toBe('invalid');

    TestBed.resetTestingModule();
    iam.getPasswordReset.mockResolvedValue({ email: 'ana@alivia.pe', expiresAt: '' });
    iam.resetPassword.mockRejectedValue(new Error('El enlace de recuperación venció. Solicita uno nuevo.'));
    const page = await open();
    page.form.setValue({ password: 'Clave#2026x', confirmation: 'Clave#2026x' });
    await page.submit();
    expect(page.state()).toBe('invalid');
    expect(page.error()).toContain('venció');
  });
});
