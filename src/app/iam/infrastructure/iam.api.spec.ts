import { ACCESS_TOKEN_KEY, BUSINESS_ID_KEY } from '../../shared/infrastructure/api.config';
import { IamApi } from './iam.api';

describe('IamApi', () => {
  afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); });

  it('stores the access token after signing in and removes it on sign out', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ accessToken: 'abc' }), { status: 200 })));
    const api = new IamApi();

    await api.signIn({ email: 'admin@alivia.local', password: 'secret' });
    expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBe('abc');
    expect(api.accessToken()).toBe('abc');

    api.signOut();
    expect(api.accessToken()).toBeNull();
  });

  it('tells a blocked account apart from a CORS rejection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('{}', { status: 403, headers: { 'content-type': 'application/problem+json' } }))
      .mockResolvedValueOnce(new Response('Invalid CORS request', { status: 403, headers: { 'content-type': 'text/plain' } })));
    const api = new IamApi();
    await expect(api.signIn({ email: 'a@b.c', password: 'x' })).rejects.toThrow('bloqueada o inactiva');
    await expect(api.signIn({ email: 'a@b.c', password: 'x' })).rejects.toThrow('CORS');
  });

  it('keeps the business of the session from the response or the token claim', async () => {
    const token = `h.${btoa(JSON.stringify({ businessId: 4 }))}.s`;
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: 'abc', user: { businessId: 7 } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: token, user: {} }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: 'abc', user: {} }), { status: 200 })));
    const api = new IamApi();

    await api.signIn({ email: 'a@b.c', password: 'x' });
    expect(sessionStorage.getItem(BUSINESS_ID_KEY)).toBe('7');
    await api.signIn({ email: 'a@b.c', password: 'x' });
    expect(sessionStorage.getItem(BUSINESS_ID_KEY)).toBe('4');
    await api.signIn({ email: 'a@b.c', password: 'x' });
    expect(sessionStorage.getItem(BUSINESS_ID_KEY)).toBeNull();
  });

  it('explains rejected credentials', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));
    await expect(new IamApi().signIn({ email: 'a@b.c', password: 'x' })).rejects.toThrow('Correo o contraseña incorrectos.');
  });
});
