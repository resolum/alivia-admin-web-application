import { HiringRequestsApi } from './hiring-requests.api';

describe('HiringRequestsApi', () => {
  afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); });

  it('sends the session token and explains failures', async () => {
    sessionStorage.setItem('alivia.iam.access-token', 'token');
    const fetchMock = vi.fn().mockResolvedValue(new Response('[]', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const api = new HiringRequestsApi();
    expect(await api.listHiringRequests()).toEqual([]);
    expect((fetchMock.mock.calls[0]![1] as RequestInit).headers).toBeInstanceOf(Headers);
    for (const [status, text] of [[401, 'venció'], [403, 'permiso'], [500, '(500)']] as const) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status })));
      await expect(api.listHiringRequests()).rejects.toThrow(text);
    }
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(api.listHiringRequests()).rejects.toThrow('No se pudo conectar');
  });
});
