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

  it('sends technicians to their portal', () => {
    const technician = `h.${btoa(JSON.stringify({ role: 'TECHNICIAN' }))}.s`;
    const admin = `h.${btoa(JSON.stringify({ role: 'ADMINISTRATOR' }))}.s`;
    const api = { accessToken: vi.fn().mockReturnValueOnce(technician).mockReturnValueOnce(admin) };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: IamApi, useValue: api }] });
    const store = TestBed.inject(IamStore);
    expect(store.homeUrl()).toBe('/technician/my-day');
    expect(store.homeUrl()).toBe('/hcm/contracts');
  });
});
