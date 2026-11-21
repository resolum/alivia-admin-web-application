import { ACCESS_TOKEN_KEY } from '../../shared/infrastructure/api.config';
import { AssistanceApi, AssistanceApiError } from './assistance.api';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const token = (claims: object) => `h.${btoa(JSON.stringify(claims))}.s`;

describe('AssistanceApi', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); localStorage.clear(); });
  const call = (index = 0) => ({ url: fetchMock.mock.calls[index]![0] as string, init: fetchMock.mock.calls[index]![1] as RequestInit });

  it('reads the agenda, a dose and the notifications with the session token', async () => {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, 'abc');
    fetchMock.mockResolvedValueOnce(json([])).mockResolvedValueOnce(json({ administrationId: '12-20261121' })).mockResolvedValueOnce(json([]));
    const api = new AssistanceApi();
    await api.agenda('2026-11-16', '2026-11-22');
    await api.administration('12-20261121');
    await api.notifications();
    expect(call(0).url).toBe('/api/v1/care-agenda?from=2026-11-16&to=2026-11-22');
    expect(call(1).url).toBe('/api/v1/medication-administrations/12-20261121');
    expect(call(2).url).toBe('/api/v1/notifications');
    expect(new Headers(call(0).init.headers).get('Authorization')).toBe('Bearer abc');
  });

  it('posts an outcome as JSON', async () => {
    fetchMock.mockResolvedValueOnce(json({}));
    await new AssistanceApi().recordOutcome('12-20261121', 'OMITTED', 'Rechazó la dosis');
    expect(call().url).toBe('/api/v1/medication-administrations/12-20261121/outcomes');
    expect(call().init.method).toBe('POST');
    expect(JSON.parse(call().init.body as string)).toEqual({ result: 'OMITTED', reason: 'Rechazó la dosis' });
    expect(new Headers(call().init.headers).get('Content-Type')).toBe('application/json');
  });

  it('asks for shifts between Lima midnights as UTC instants', async () => {
    fetchMock.mockResolvedValueOnce(json([]));
    await new AssistanceApi().shifts('2026-11-16', '2026-11-22');
    expect(decodeURIComponent(call().url)).toBe('/api/v1/shifts?from=2026-11-16T05:00:00.000Z&to=2026-11-23T04:59:59.000Z');
  });

  it('finds the caregiver records of the signed-in user, and none without a session', async () => {
    const api = new AssistanceApi();
    expect(await api.myCaregiverIds()).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    localStorage.setItem(ACCESS_TOKEN_KEY, token({ sub: '42' }));
    fetchMock.mockResolvedValueOnce(json([{ id: 7 }, { id: 9 }]));
    expect(await api.myCaregiverIds()).toEqual([7, 9]);
    expect(call().url).toBe('/api/v1/caregivers/user/42');
  });

  it('dedupes autonomy actions and keeps only the allowed fields', async () => {
    const action = { eventId: 'e1', occurredAt: '2026-11-21T10:00:00', deviceId: 1, deviceName: 'Luz', deviceType: 'LIGHT', source: 'VOICE', intent: 'Encender', result: 'SUCCEEDED', executedLocally: true, audioUrl: 'x.wav' };
    fetchMock.mockResolvedValueOnce(json({ lastSyncedAt: null, edgeOnline: true, actions: [action, action] })).mockResolvedValueOnce(json({ lastSyncedAt: null, edgeOnline: false }));
    const api = new AssistanceApi();
    const metrics = await api.autonomyMetrics('2026-11-15', '2026-11-21');
    expect(call().url).toBe('/api/v1/autonomy-metrics?from=2026-11-15&to=2026-11-21');
    expect(metrics.actions).toHaveLength(1);
    expect(metrics.actions[0]).not.toHaveProperty('audioUrl');
    expect((await api.autonomyMetrics('2026-11-15', '2026-11-21')).actions).toEqual([]);
  });

  it('turns each failure into a Spanish message with its status', async () => {
    const api = new AssistanceApi();
    const fails = async (status: number, change = false) => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status }));
      const request = change ? api.recordOutcome('1-20261121', 'ADMINISTERED', null) : api.agenda('2026-11-16', '2026-11-22');
      return request.catch((error: AssistanceApiError) => [error.status, error.message]);
    };
    expect(await fails(401)).toEqual([401, 'Tu sesión terminó. Vuelve a iniciar sesión.']);
    expect(await fails(403)).toEqual([403, 'No tienes permiso para consultar la agenda.']);
    expect(await fails(403, true)).toEqual([403, 'No tienes permiso para registrar esta administración. El historial no cambió.']);
    expect(await fails(404)).toEqual([404, 'No encontramos la agenda.']);
    expect(await fails(409, true)).toEqual([409, 'Esta administración ya tiene un resultado registrado.']);
    expect(await fails(500)).toEqual([500, 'No se pudo consultar la agenda (500).']);
    expect(await fails(500, true)).toEqual([500, 'No se pudo guardar el resultado (500).']);
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    await expect(api.notifications()).rejects.toMatchObject({ status: 0 });
  });
});
