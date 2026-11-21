import { TestBed } from '@angular/core/testing';
import { ACCESS_TOKEN_KEY } from '../../shared/infrastructure/api.config';
import { hiringRequest } from '../domain/hiring-request.fixtures';
import { HiringRequestsApi } from './hiring-requests.api';
import { SubscriptionsApi } from './subscriptions.api';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const installation = (draftId: string, changes: object = {}) => ({
  draftId, status: 'COMPLETED', installationResult: 'APPROVED', contactName: 'María', contactPhone: null,
  directions: 'Av. Primavera 1450, Surco, Lima', technicianName: 'Ana Torres', completedAt: '2026-10-25T15:00:00Z',
  installedDevices: [{}, {}, {}], ...changes,
});

describe('SubscriptionsApi', () => {
  const hiring = { listHiringRequests: vi.fn() };
  let api: SubscriptionsApi;

  beforeEach(() => {
    hiring.listHiringRequests.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: HiringRequestsApi, useValue: hiring }] });
    api = TestBed.inject(SubscriptionsApi);
    sessionStorage.setItem(ACCESS_TOKEN_KEY, 'token-1');
  });
  afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); });

  it('lists the completed requests with the home of their approved installation', async () => {
    hiring.listHiringRequests.mockResolvedValue([
      hiringRequest({ id: 'd1', stage: 'COMPLETED', paymentStatus: 'SUCCEEDED', updatedAt: '2026-10-20T00:00:00Z' }),
      hiringRequest({ id: 'd2', stage: 'COMPLETED', paymentStatus: 'SUCCEEDED', updatedAt: '2026-10-28T00:00:00Z' }),
      hiringRequest({ id: 'd3', stage: 'INSTALLATION' }),
    ]);
    const fetchMock = vi.fn().mockResolvedValue(json([installation('d1'), installation('d2', { installationResult: 'REJECTED' })]));
    vi.stubGlobal('fetch', fetchMock);

    const subscriptions = await api.listSubscriptions(new Date('2026-11-05T00:00:00Z'));

    expect(subscriptions.map(item => item.id)).toEqual(['d2', 'd1']);
    expect(subscriptions[1]).toMatchObject({ directions: 'Av. Primavera 1450, Surco, Lima', devices: 3, technicianName: 'Ana Torres' });
    expect(subscriptions[0].directions).toBeNull();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/technical-orders\?serviceType=INSTALLATION$/);
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token-1');
  });

  it('still lists the subscriptions when the orders cannot be read', async () => {
    hiring.listHiringRequests.mockResolvedValue([hiringRequest({ stage: 'COMPLETED' })]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 403)));
    expect((await api.listSubscriptions())[0].directions).toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    expect(await api.listSubscriptions()).toHaveLength(1);
  });
});
