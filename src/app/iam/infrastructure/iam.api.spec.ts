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

  it('reads an invitation and activates the account', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ email: 'ana@alivia.pe', fullName: 'Ana Pérez', expiresAt: '2026-10-29T15:00:00' }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const api = new IamApi();

    expect((await api.getActivation('a b')).fullName).toBe('Ana Pérez');
    await api.activate('a b', 'Clave#2026x');
    expect(String(fetchMock.mock.calls[0]![0])).toBe('/api/v1/auth/activation?token=a+b');
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ token: 'a b', password: 'Clave#2026x' });
  });

  it('explains expired links, weak passwords and unknown links', async () => {
    const problem = (body: object) => new Response(JSON.stringify(body), { status: 400, headers: { 'content-type': 'application/problem+json' } });
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(problem({ code: 'verification_token_expired' }))
      .mockResolvedValueOnce(problem({ code: 'validation_failed', errors: [{ field: 'password', code: 'password_weak' }] }))
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response('', { status: 500 }))
      .mockRejectedValueOnce(new TypeError('offline')));
    const api = new IamApi();

    await expect(api.getActivation('x')).rejects.toThrow('venció');
    await expect(api.activate('x', 'debil')).rejects.toThrow('requisitos de seguridad');
    await expect(api.getActivation('x')).rejects.toThrow('no es válido');
    await expect(api.getActivation('x')).rejects.toThrow('(500)');
    await expect(api.getActivation('x')).rejects.toThrow('No se pudo conectar');
  });
});
