import { TestBed } from '@angular/core/testing';
import { IamApi } from '../infrastructure/iam.api';
import { IamStore } from './iam.store';

describe('IamStore', () => {
  it('checks the session token and delegates sign in and sign out', async () => {
    const live = `h.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 600 }))}.s`;
    const api = { accessToken: vi.fn().mockReturnValueOnce(live).mockReturnValueOnce(null), signIn: vi.fn(), signOut: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: IamApi, useValue: api }] });
    const store = TestBed.inject(IamStore);

    expect(store.isAuthenticated()).toBe(true);
    expect(store.isAuthenticated()).toBe(false);
    await store.signIn({ email: 'a@b.c', password: 'x' });
    store.signOut();
    expect(api.signIn).toHaveBeenCalledWith({ email: 'a@b.c', password: 'x' });
    expect(api.signOut).toHaveBeenCalled();
  });
});
