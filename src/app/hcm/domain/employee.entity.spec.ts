import { Contract } from './contract.entity';
import { availability, contractState, currentContract, daysLabel, Employee, employeeCode, toEmployeeRow, toPhoneNumber } from './employee.entity';
import { WorkSchedule } from './work-schedule.entity';

const contract = (id: number, status: Contract['status'], startDate: string, endDate: string) =>
  ({ id, employeeId: 7, status, startDate, endDate }) as Contract;
const schedule = { employeeId: 7, status: 'ACTIVE', workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY'],
  shifts: [{ day: 'MONDAY', startTime: '08:00:00', endTime: '17:00:00' }] } as unknown as WorkSchedule;
const employee = { id: 7, role: 'TECH', firstName: 'Ana', lastName: 'Pérez' } as Employee;
// Monday 26 Oct 2026, 10:00 local time
const monday = new Date(2026, 9, 26, 10, 0);

describe('employee domain', () => {
  it('builds readable codes and phone numbers', () => {
    expect(employeeCode({ id: 7, role: 'TECH' })).toBe('ALV-TEC-0007');
    expect(employeeCode({ id: 482, role: 'SUBSCRIPTION_MANAGER' })).toBe('ALV-GES-0482');
    expect(toPhoneNumber('984 321 890')).toBe('51984321890');
  });

  it('picks the contract that matters and its state', () => {
    const active = contract(1, 'ACTIVE', '2026-01-01', '2027-01-01');
    const pending = contract(2, 'PENDING', '2027-02-01', '2027-12-31');
    expect(currentContract([pending, active])).toBe(active);
    expect(currentContract([pending])).toBe(pending);
    expect(currentContract([])).toBeNull();
    expect(contractState(null, '2026-10-26')).toBe('NONE');
    expect(contractState(active, '2026-10-26')).toBe('ACTIVE');
    expect(contractState(contract(3, 'ACTIVE', '2026-01-01', '2026-11-10'), '2026-10-26')).toBe('EXPIRING');
    expect(contractState(pending, '2026-10-26')).toBe('PENDING');
  });

  it('labels working days', () => {
    expect(daysLabel(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'])).toBe('Lu. – Vi.');
    expect(daysLabel(['MONDAY', 'WEDNESDAY'])).toBe('Lu, Mi');
    expect(daysLabel([])).toBe('');
  });

  it('computes availability from the contract and the shifts', () => {
    expect(availability('ACTIVE', schedule, monday)).toBe('AVAILABLE');
    expect(availability('ACTIVE', schedule, new Date(2026, 9, 26, 18, 0))).toBe('OFF_SHIFT');
    expect(availability('NONE', schedule, monday)).toBe('UNAVAILABLE');
    expect(availability('ACTIVE', null, monday)).toBe('UNAVAILABLE');
  });

  it('joins an employee with its contract and schedule', () => {
    const row = toEmployeeRow(employee, [contract(1, 'ACTIVE', '2026-01-01', '2027-06-30')], [schedule], monday);
    expect(row).toMatchObject({ code: 'ALV-TEC-0007', contractState: 'ACTIVE', scheduleDays: 'Lu. – Mi.', scheduleHours: '08:00 – 17:00', availability: 'AVAILABLE' });
    expect(toEmployeeRow(employee, [], [], monday)).toMatchObject({ contractState: 'NONE', scheduleDays: null, availability: 'UNAVAILABLE' });
  });
});
