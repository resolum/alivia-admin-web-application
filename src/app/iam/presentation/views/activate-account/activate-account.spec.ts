import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { IamStore } from '../../../application/iam.store';
import { ActivateAccount } from './activate-account';

type Page = { state(): string; error(): string; account(): unknown; valid(): boolean; form: { setValue(value: object): void }; submit(): Promise<void> };

describe('ActivateAccount', () => {
  const iam = { getActivation: vi.fn(), activate: vi.fn(), resetPassword: vi.fn() };
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

    page.form.setValue({ code: '', password: 'debil', confirmation: 'debil' });
    expect(page.valid()).toBe(false);
    await page.submit();
    expect(iam.activate).not.toHaveBeenCalled();

    page.form.setValue({ code: '', password: 'Clave#2026x', confirmation: 'Clave#2026x' });
    expect(page.valid()).toBe(true);
    iam.activate.mockRejectedValueOnce(new Error('La contraseña no cumple los requisitos de seguridad.'));
    await page.submit();
    expect(page.error()).toContain('requisitos');

    await page.submit();
    expect(iam.activate).toHaveBeenLastCalledWith('abc', 'Clave#2026x');
    expect(page.state()).toBe('done');
  });

  it('resets a password with the emailed 6-digit code', async () => {
    data = { mode: 'reset' };
    token = 'ana@alivia.pe'; // the route mock answers every query param with this value
    const page = await open();
    expect(iam.getActivation).not.toHaveBeenCalled();
    expect(page.state()).toBe('ready');

    page.form.setValue({ code: '12a', password: 'Clave#2026x', confirmation: 'Clave#2026x' });
    await page.submit();
    expect(iam.resetPassword).not.toHaveBeenCalled();

    page.form.setValue({ code: ' 482915 ', password: 'Clave#2026x', confirmation: 'Clave#2026x' });
    await page.submit();
    expect(iam.resetPassword).toHaveBeenCalledWith('ana@alivia.pe', '482915', 'Clave#2026x');
    expect(page.state()).toBe('done');
  });

  it('asks for a code first, keeps a wrong code inline and rejects an expired one', async () => {
    data = { mode: 'reset' };
    token = null;
    expect((await open()).state()).toBe('invalid');

    TestBed.resetTestingModule();
    token = 'ana@alivia.pe';
    iam.resetPassword
      .mockRejectedValueOnce(new Error('El código no es correcto o ya no se puede usar. Revísalo o solicita uno nuevo.'))
      .mockRejectedValueOnce(new Error('El código venció. Solicita uno nuevo para cambiar tu contraseña.'));
    const page = await open();
    page.form.setValue({ code: '000000', password: 'Clave#2026x', confirmation: 'Clave#2026x' });
    await page.submit();
    expect(page.state()).toBe('ready');
    expect(page.error()).toContain('no es correcto');
    await page.submit();
    expect(page.state()).toBe('invalid');
    expect(page.error()).toContain('venció');
  });
});
