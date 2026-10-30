import { TestBed } from '@angular/core/testing';
import { IamApi } from '../infrastructure/iam.api';
import { IamStore } from './iam.store';

describe('IamStore', () => {
  it('checks the session token and delegates sign in and sign out', async () => {
    const live = `h.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 600 }))}.s`;
    const api = { accessToken: vi.fn().mockReturnValueOnce(live).mockReturnValueOnce(null), signIn: vi.fn(), signOut: vi.fn(), getActivation: vi.fn(), activate: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: IamApi, useValue: api }] });
    const store = TestBed.inject(IamStore);

    expect(store.isAuthenticated()).toBe(true);
    expect(store.isAuthenticated()).toBe(false);
    await store.signIn({ email: 'a@b.c', password: 'x' });
    store.signOut();
    await store.getActivation('t');
    await store.activate('t', 'Clave#2026x');
    expect(api.activate).toHaveBeenCalledWith('t', 'Clave#2026x');
    expect(api.signIn).toHaveBeenCalledWith({ email: 'a@b.c', password: 'x' });
    expect(api.signOut).toHaveBeenCalled();
  });

  it('sends each staff role to its portal', () => {
    const token = (claims: object) => `h.${btoa(JSON.stringify(claims))}.s`;
    let current = token({ role: 'TECHNICIAN' });
    const api = { accessToken: vi.fn(() => current) };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: IamApi, useValue: api }] });
    const store = TestBed.inject(IamStore);
    expect(store.homeUrl()).toBe('/technician/home');
    current = token({ role: 'SUBSCRIPTION_MANAGER', email: 'diego.ramos@alivia.test' });
    expect(store.homeUrl()).toBe('/commercial/home');
    expect(store.currentEmail()).toBe('diego.ramos@alivia.test');
    current = token({ role: 'ADMINISTRATOR' });
    expect(store.homeUrl()).toBe('/hcm/contracts');
  });
});
