import { ContractFilters, CreateContract, UpdateContract } from '../domain/contract.entity';
import { BUSINESS_ID_KEY } from '../../shared/infrastructure/api.config';
import { HcmApi, HcmApiError } from './hcm.api';

const filters: ContractFilters = {
  search: 'field', status: 'ACTIVE', modality: 'HOURLY', page: 1, size: 10,
};

const contract = {
  id: 7, code: 'CTR-ALV-2026-000007', employeeId: 3, businessId: 1,
  position: 'Técnico de dispositivos', modality: 'HOURLY' as const, weeklyHours: 40,
  startDate: '2026-01-01', endDate: '2026-12-31', status: 'ACTIVE' as const,
  eligible: true, notes: '', createdAt: '2026-01-01', updatedAt: '2026-01-01',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('HcmApi', () => {
  let api: HcmApi;

  beforeEach(() => {
    api = new HcmApi();
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem(BUSINESS_ID_KEY, '1');
  });

  it('refuses to call the backend when the session has no business', async () => {
    sessionStorage.removeItem(BUSINESS_ID_KEY);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.listEmployees()).rejects.toMatchObject({ status: 403 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('lists contracts with filters and resolves employee names', async () => {
    const fetchMock = vi.fn((request: RequestInfo | URL) => {
      const url = String(request);
      if (url.includes('/employees?')) return Promise.resolve(json({ content: [{ id: 3, firstName: 'Ana', lastName: 'Pérez' }] }));
      return Promise.resolve(json({ content: [contract], page: 1, size: 10, totalElements: 1, totalPages: 2 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const page = await api.listContracts(filters);

    expect(page.content[0]?.employeeName).toBe('Ana Pérez');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('search=field');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('status=ACTIVE');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('modality=HOURLY');
  });

  it('supports employee lookup, detail, creation and update', async () => {
    vi.stubGlobal('fetch', vi.fn((request: RequestInfo | URL, init?: RequestInit) => {
      const url = String(request);
      if (url.includes('/employees?')) return Promise.resolve(json({ content: [{ id: 3, firstName: 'Ana', lastName: 'Pérez' }] }));
      expect(init?.headers).toBeInstanceOf(Headers);
      return Promise.resolve(json(contract));
    }));

    expect((await api.listEmployees())[0]?.id).toBe(3);
    expect((await api.getContract(3, 7)).employeeName).toBe('Ana Pérez');
    const createInput: CreateContract = { ...contract, initialStatus: 'ACTIVE' };
    expect((await api.createContract(createInput)).employeeName).toBe('Empleado #3');
    const updateInput: UpdateContract = { position: contract.position, modality: contract.modality, weeklyHours: 40, startDate: contract.startDate, endDate: contract.endDate, notes: '' };
    expect((await api.updateContract(3, 7, updateInput)).id).toBe(7);
  });

  it('uses the access token and reports HTTP and network errors', async () => {
    sessionStorage.setItem('alivia.iam.access-token', 'token');
    const responses = [
      new Response('', { status: 401 }),
      new Response('', { status: 403 }),
      new Response('', { status: 404 }),
      json({ detail: 'Contrato incompatible' }, 409),
      new Response('failure', { status: 500 }),
    ];
    const fetchMock = vi.fn((_request: RequestInfo | URL, init?: RequestInit) => {
      expect((init?.headers as Headers).get('Authorization')).toBe('Bearer token');
      return Promise.resolve(responses.shift()!);
    });
    vi.stubGlobal('fetch', fetchMock);
    const request = (api as unknown as { request<T>(url: string): Promise<T> }).request.bind(api);

    await expect(request('/one')).rejects.toMatchObject({ status: 401, message: 'Debes iniciar sesión para consultar capital humano.' });
    await expect(request('/two')).rejects.toMatchObject({ status: 403 });
    await expect(request('/three')).rejects.toMatchObject({ status: 404 });
    await expect(request('/four')).rejects.toThrow('Contrato incompatible');
    await expect(request('/five')).rejects.toThrow('(500)');

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(request('/offline')).rejects.toEqual(new HcmApiError('No se pudo conectar con el servicio de capital humano.', 0));
  });
});
