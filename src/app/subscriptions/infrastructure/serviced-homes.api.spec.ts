import { TestBed } from '@angular/core/testing';
import { ACCESS_TOKEN_KEY } from '../../shared/infrastructure/api.config';
import { servicedHome } from '../domain/serviced-home.fixtures';
import { ServicedHomesApi } from './serviced-homes.api';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('ServicedHomesApi', () => {
  let api: ServicedHomesApi;
  beforeEach(() => { api = TestBed.inject(ServicedHomesApi); sessionStorage.setItem(ACCESS_TOKEN_KEY, 'token-1'); });
  afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); });

  it('reads every home, the technician ones and one home with the session token', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(json([servicedHome()])).mockResolvedValueOnce(json([])).mockResolvedValueOnce(json(servicedHome()));
    vi.stubGlobal('fetch', fetchMock);
    expect(await api.listHomes('all')).toHaveLength(1);
    expect(await api.listHomes('mine')).toEqual([]);
    expect((await api.getHome('draft a')).code).toBe('HOG-FFC7E032');
    const urls = fetchMock.mock.calls.map(call => call[0] as string);
    expect(urls[0]).toMatch(/\/serviced-homes$/);
    expect(urls[1]).toMatch(/\/serviced-homes\/mine$/);
    expect(urls[2]).toMatch(/\/serviced-homes\/draft%20a$/);
    expect(new Headers((fetchMock.mock.calls[0] as [string, RequestInit])[1].headers).get('Authorization')).toBe('Bearer token-1');
  });

  it('explains why the homes could not be read', async () => {
    for (const [status, text] of [[401, 'sesión'], [403, 'permiso'], [404, 'No encontramos'], [500, '(500)']] as const) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, status)));
      await expect(api.getHome('x')).rejects.toThrow(text);
    }
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(api.listHomes('all')).rejects.toThrow('conectar');
  });
});
