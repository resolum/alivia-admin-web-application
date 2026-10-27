import { BUSINESS_ID_KEY } from '../../shared/infrastructure/api.config';
import { SaveWorkSchedule } from '../domain/work-schedule.entity';
import { HcmApi } from './hcm.api';

const schedule = {
  id: 12, code: 'HOR-2026-0012', employeeId: 3, businessId: 1, name: 'Turno A', startDate: '2026-01-01', endDate: null,
  status: 'ACTIVE', shifts: [], workingDays: [], weeklyHours: 40, contract: null, compliance: 'NO_REFERENCE',
  exceedsLegalLimit: false, lastModifiedBy: 1, createdAt: '', updatedAt: '',
};
const input: SaveWorkSchedule = { name: 'Turno A', startDate: '2026-01-01', endDate: null, shifts: [], draft: false };

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

describe('HcmApi work schedules', () => {
  let api: HcmApi;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(BUSINESS_ID_KEY, '1');
    api = new HcmApi();
    fetchMock = vi.fn((request: RequestInfo | URL) => {
      const url = String(request);
      if (url.includes('/employees?')) return Promise.resolve(json({ content: [{ id: 3, firstName: 'Ana', lastName: 'Pérez', role: 'TECH' }] }));
      if (url.includes('/summary')) return Promise.resolve(json({ totalSchedules: 1, employeesWithSchedule: 1, averageWeeklyHours: 40 }));
      if (url.includes('/work-schedules?')) return Promise.resolve(json({ content: [schedule], page: 0, size: 8, totalElements: 1, totalPages: 1 }));
      return Promise.resolve(json(schedule));
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  const urls = () => fetchMock.mock.calls.map(call => String(call[0]));

  it('lists schedules with filters and the employee name and role', async () => {
    const page = await api.listWorkSchedules({ search: ' turno ', role: 'TECH', status: 'ACTIVE', page: 0, size: 8 });

    expect(page.content[0]).toMatchObject({ employeeName: 'Ana Pérez', employeeRole: 'TECH' });
    expect(urls().find(url => url.includes('/work-schedules?'))).toContain('search=turno');
    expect(urls().find(url => url.includes('/work-schedules?'))).toContain('role=TECH');
    expect(urls().find(url => url.includes('/work-schedules?'))).toContain('status=ACTIVE');
  });

  it('reads the summary, one schedule and the schedules of a contract', async () => {
    expect((await api.getWorkScheduleSummary()).averageWeeklyHours).toBe(40);
    expect((await api.getWorkSchedule(3, 12)).employeeName).toBe('Ana Pérez');
    expect((await api.listContractWorkSchedules(5))[0]?.employeeName).toBe('Empleado #3');
    expect(urls()).toContain('/api/v1/employees/3/work-schedules/12?businessId=1');
    expect(urls().some(url => url.includes('contractId=5'))).toBe(true);
  });

  it('creates inside the contract, updates and deactivates', async () => {
    await api.createWorkSchedule(3, 5, input);
    await api.updateWorkSchedule(3, 12, input);
    await api.deactivateWorkSchedule(3, 12);

    expect(urls()).toEqual([
      '/api/v1/employees/3/contracts/5/work-schedules',
      '/api/v1/employees/3/work-schedules/12?businessId=1',
      '/api/v1/employees/3/work-schedules/12/deactivation?businessId=1',
    ]);
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toMatchObject({ name: 'Turno A', businessId: 1 });
    expect(fetchMock.mock.calls.map(call => call[1].method)).toEqual(['POST', 'PATCH', 'POST']);
  });

  it('lists every employee and registers a new one in the business', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json({ content: [{ id: 3 }], id: 52 })));
    expect(await api.listAllEmployees()).toEqual([{ id: 3 }]);
    await api.createEmployee({ corporateEmail: 'a@alivia.pe', phoneNumber: '51987654321', firstName: 'Ana', lastName: 'Pérez Ruiz', dni: '12345678', birthDate: '1990-01-01', role: 'TECH' });

    expect(urls()[0]).toContain('businessId=1');
    expect(urls()[1]).toBe('/api/v1/employees');
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toMatchObject({ dni: '12345678', businessId: 1 });
  });
});
