import { PlansApi } from './plans.api';

describe('PlansApi', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads the catalog and reports failures', async () => {
    const api = new PlansApi();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('[{"id":1}]', { status: 200 })));
    expect(await api.listPlans()).toEqual([{ id: 1 }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })));
    await expect(api.listPlans()).rejects.toThrow('(500)');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(api.listPlans()).rejects.toThrow('No se pudo conectar');
  });
});
