import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { IamStore } from '../../../application/iam.store';
import { ActivateAccount } from './activate-account';

type Page = { state(): string; error(): string; account(): unknown; valid(): boolean; form: { setValue(value: object): void }; submit(): Promise<void> };

describe('ActivateAccount', () => {
  const iam = { getActivation: vi.fn(), activate: vi.fn() };
  let token: string | null;

  async function open(): Promise<Page> {
    TestBed.configureTestingModule({ providers: [
      { provide: IamStore, useValue: iam },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => token } } } },
    ] });
    const page = TestBed.runInInjectionContext(() => new ActivateAccount());
    page.ngOnInit();
    for (let tick = 0; tick < 3; tick++) await Promise.resolve();
    return page as unknown as Page;
  }

  beforeEach(() => { iam.getActivation.mockReset(); iam.activate.mockReset(); token = 'abc'; });

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
});
