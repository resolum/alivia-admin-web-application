import { ACCESS_TOKEN_KEY, BUSINESS_ID_KEY, REFRESH_TOKEN_KEY } from '../../shared/infrastructure/api.config';
import { EmailAlreadyRegistered, IamApi } from './iam.api';

describe('IamApi', () => {
  afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); localStorage.clear(); });

  it('stores the access token after signing in and removes it on sign out', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ accessToken: 'abc' }), { status: 200 })));
    const api = new IamApi();

    await api.signIn({ email: 'admin@alivia.local', password: 'secret' });
    expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBe('abc');
    expect(api.accessToken()).toBe('abc');

    api.signOut();
    expect(api.accessToken()).toBeNull();
  });

  it('tells suspended and pending accounts apart, and both from a CORS rejection', async () => {
    const problem = (body: object) => new Response(JSON.stringify(body), { status: 403, headers: { 'content-type': 'application/problem+json' } });
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(problem({ detail: 'Account is SUSPENDED' }))
      .mockResolvedValueOnce(problem({ code: 'account_pending_verification' }))
      .mockResolvedValueOnce(problem({}))
      .mockResolvedValueOnce(new Response('Invalid CORS request', { status: 403, headers: { 'content-type': 'text/plain' } })));
    const api = new IamApi();
    await expect(api.signIn({ email: 'a@b.c', password: 'x' })).rejects.toThrow('suspendida');
    await expect(api.signIn({ email: 'a@b.c', password: 'x' })).rejects.toThrow('pendiente de validación');
    await expect(api.signIn({ email: 'a@b.c', password: 'x' })).rejects.toThrow('no está activa');
    await expect(api.signIn({ email: 'a@b.c', password: 'x' })).rejects.toThrow('CORS');
  });

  it('rejects family accounts and inactive users without keeping their session', async () => {
    const ok = (user: object) => new Response(JSON.stringify({ accessToken: 'abc', user }), { status: 200 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(ok({ role: 'CAREGIVER', status: 'ACTIVE' })).mockResolvedValueOnce(ok({ role: 'ADMINISTRATOR', status: 'SUSPENDED' })));
    const api = new IamApi();
    await expect(api.signIn({ email: 'a@b.c', password: 'x' })).rejects.toThrow('app móvil');
    await expect(api.signIn({ email: 'a@b.c', password: 'x' })).rejects.toThrow('suspendida');
    expect(api.accessToken()).toBeNull();
  });

  it('remembers the session in this browser, renews it and revokes it on sign out', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: 'abc', refreshToken: 'r1', user: { status: 'ACTIVE' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: 'def', refreshToken: 'r2' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const api = new IamApi();

    await api.signIn({ email: 'a@b.c', password: 'x' }, true);
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('abc');
    expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();

    expect(await api.refresh()).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ refreshToken: 'r1' });
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('r2');

    api.signOut();
    expect(JSON.parse(fetchMock.mock.calls[2]![1].body)).toEqual({ refreshToken: 'r2' });
    expect(api.accessToken()).toBeNull();
    expect(await api.refresh()).toBe(false);
  });

  it('drops the session when the refresh token is rejected', async () => {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, 'old'); sessionStorage.setItem(REFRESH_TOKEN_KEY, 'r1');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));
    const api = new IamApi();
    expect(await api.refresh()).toBe(false);
    expect(api.accessToken()).toBeNull();
  });

  it('requests a recovery link without revealing who owns an address', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 202 }))
      .mockResolvedValueOnce(new Response('', { status: 404 })).mockResolvedValueOnce(new Response('', { status: 429 }));
    vi.stubGlobal('fetch', fetchMock);
    const api = new IamApi();

    await api.requestPasswordRecovery('ana@alivia.pe');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ email: 'ana@alivia.pe' });
    await expect(api.requestPasswordRecovery('nadie@alivia.pe')).rejects.toThrow('No fue posible iniciar la recuperación');
    await expect(api.requestPasswordRecovery('ana@alivia.pe')).rejects.toThrow('Espera unos minutos');
  });

  it('validates a reset link, rejects expired ones and sets the new password', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ email: 'ana@alivia.pe', expiresAt: '' }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'reset_token_expired' }), { status: 400, headers: { 'content-type': 'application/problem+json' } }))
      .mockResolvedValueOnce(new Response('', { status: 410 }))
      .mockResolvedValueOnce(new Response('', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    const api = new IamApi();

    expect((await api.getPasswordReset('t 1')).email).toBe('ana@alivia.pe');
    expect(String(fetchMock.mock.calls[0]![0])).toBe('/api/v1/auth/password-reset?token=t+1');
    await api.resetPassword('t 1', 'Clave#2026x');
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ token: 't 1', password: 'Clave#2026x' });
    await expect(api.getPasswordReset('t')).rejects.toThrow('venció');
    await expect(api.resetPassword('t', 'Clave#2026x')).rejects.toThrow('venció');
    await expect(api.getPasswordReset('t')).rejects.toThrow('no es válido');
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

  it('registers an administrator as multipart and resends the verification link', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ accountId: 'a1', maskedEmail: 'c***@b.pe', status: 'PENDING_VERIFICATION' }), { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }))
      .mockResolvedValueOnce(new Response('', { status: 409 }));
    vi.stubGlobal('fetch', fetchMock);
    const api = new IamApi();

    const masked = await api.signUp({ firstName: 'Carlos', lastName: 'Mendoza', email: 'Carlos@B.pe', phoneNumber: '51987654321', password: 'Clave#2026x', acceptedTerms: true });
    expect(masked).toBe('c***@b.pe');
    const form = fetchMock.mock.calls[0]![1].body as FormData;
    expect(form.get('email')).toBe('carlos@b.pe');
    expect(form.get('role')).toBe('ADMINISTRATOR');
    expect(form.get('acceptedTerms')).toBe('true');

    await api.resendVerification('Carlos@B.pe');
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ email: 'carlos@b.pe' });
    await expect(api.resendVerification('carlos@b.pe')).rejects.toThrow('ya fue verificado');
  });

  it('tells a taken email apart from invalid data and an unavailable service', async () => {
    const command = { firstName: 'A', lastName: 'B', email: 'a@b.pe', phoneNumber: '51987654321', password: 'x', acceptedTerms: true };
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 409 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: 'La contraseña es débil' }), { status: 400, headers: { 'content-type': 'application/problem+json' } }))
      .mockResolvedValueOnce(new Response('', { status: 503 })));
    const api = new IamApi();
    await expect(api.signUp(command)).rejects.toBeInstanceOf(EmailAlreadyRegistered);
    await expect(api.signUp(command)).rejects.toThrow('La contraseña es débil');
    await expect(api.signUp(command)).rejects.toThrow('No pudimos enviar el correo de verificación');
  });
});
