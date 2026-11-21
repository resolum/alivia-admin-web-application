import { TestBed } from '@angular/core/testing';
import { ACCESS_TOKEN_KEY } from '../../shared/infrastructure/api.config';
import { order } from '../domain/technical-order.fixtures';
import { OperationsApiError, TechnicalOrdersApi } from './technical-orders.api';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('TechnicalOrdersApi', () => {
  let api: TechnicalOrdersApi;

  beforeEach(() => {
    api = TestBed.inject(TechnicalOrdersApi);
    localStorage.clear();
    sessionStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lists and reads the orders with the session token', async () => {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, 'token-1');
    const fetchMock = vi.fn().mockResolvedValueOnce(json([order()])).mockResolvedValueOnce(json(order({ id: 5 })));
    vi.stubGlobal('fetch', fetchMock);

    expect((await api.listOrders()).map(item => item.id)).toEqual([1]);
    expect((await api.getOrder(5)).id).toBe(5);
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toMatch(/\/technical-orders\/5$/);
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token-1');
  });

  it('explains why the orders could not be read', async () => {
    for (const [status, text] of [[401, 'iniciar sesión'], [403, 'permiso'], [404, 'No encontramos'], [500, '(500)']] as const) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, status)));
      await expect(api.listOrders()).rejects.toThrow(text);
    }
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(api.getOrder(1)).rejects.toBeInstanceOf(OperationsApiError);
  });

  it('assigns and reassigns the technician, explaining each rejection', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json(order({ id: 5 }))));
    vi.stubGlobal('fetch', fetchMock);

    await api.assignTechnician(5, 9, '');
    await api.reassign(5, 'Descanso médico');
    const [[assignUrl, assign], [reassignUrl, reassign]] = fetchMock.mock.calls as unknown as [string, RequestInit][];
    expect(assignUrl).toMatch(/\/technical-orders\/5\/technician$/);
    expect(assign).toMatchObject({ method: 'PUT', body: JSON.stringify({ technicianId: 9, note: null }) });
    expect(new Headers(assign.headers).get('Content-Type')).toBe('application/json');
    expect(reassignUrl).toMatch(/\/technical-orders\/5\/reassignment$/);
    expect(reassign).toMatchObject({ method: 'POST', body: JSON.stringify({ reason: 'Descanso médico' }) });

    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(json({}, 409))));
    await expect(api.assignTechnician(5, 9, '')).rejects.toThrow('debe trabajar todo el bloque');
    await expect(api.reassign(5, 'x')).rejects.toThrow('Ningún técnico puede tomar la orden');
  });
});
