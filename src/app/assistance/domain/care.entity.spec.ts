import {
  administrationIdOf, AgendaItem, awaitsOutcome, CareShift, isLate, isReminder, MedicationAdministration, mergeAgenda, reminderOf, shiftToItem, statusText, timeRange, upcoming,
} from './care.entity';

const dose = (overrides: Partial<MedicationAdministration> = {}): MedicationAdministration => ({
  administrationId: '12-20261121', medication: 'Losartán', assistedPerson: { id: 8, name: 'Rosa' }, date: '2026-11-21',
  startTime: '08:00:00', endTime: '09:00:00', responsible: null, status: 'SCHEDULED', outcome: null, ...overrides,
});

describe('care entity', () => {
  it('builds the administration id the backend parses', () => {
    expect(administrationIdOf({ assignmentId: 12, date: '2026-11-21' })).toBe('12-20261121');
  });

  it('keeps a dose open until it has an outcome, even after its window', () => {
    expect(awaitsOutcome(dose())).toBe(true);
    expect(awaitsOutcome(dose({ status: 'MISSED' }))).toBe(true);
    expect(awaitsOutcome(dose({ status: 'COMPLETED', outcome: { result: 'ADMINISTERED', occurredAt: '2026-11-21T08:10:00', reason: null } }))).toBe(false);
  });

  it('flags as late an outcome recorded after the window, including windows across midnight', () => {
    const at = (occurredAt: string, extra: Partial<MedicationAdministration> = {}) => dose({ ...extra, outcome: { result: 'ADMINISTERED', occurredAt, reason: null } });
    expect(isLate(at('2026-11-21T08:59:00'))).toBe(false);
    expect(isLate(at('2026-11-21T09:20:00'))).toBe(true);
    expect(isLate(at('2026-11-22T00:30:00', { startTime: '22:00:00', endTime: '01:00:00' }))).toBe(false);
    expect(isLate(dose())).toBe(false);
  });

  it('tells reminders from alerts and only reminds what is still ahead', () => {
    expect(isReminder({ id: 1, type: 'CARE_ACTIVITY_REMINDER', title: '', body: '', status: 'UNREAD', createdAt: '' })).toBe(true);
    expect(isReminder({ id: 2, type: 'ACTUATOR_FAILURE', title: '', body: '', status: 'UNREAD', createdAt: '' })).toBe(false);
    const item = (startsAt: string, status: AgendaItem['status'] = 'SCHEDULED') => ({ startsAt, status }) as AgendaItem;
    const now = new Date('2026-11-21T07:50:00-05:00');
    const due = upcoming([item('2026-11-21T08:00:00'), item('2026-11-21T07:40:00'), item('2026-11-21T09:00:00'), item('2026-11-21T08:00:00', 'COMPLETED')], now);
    expect(due).toHaveLength(1);
  });

  // 22:00 Lima on the 21st to 06:00 on the 22nd, sent as UTC instants.
  const shift = (overrides: Partial<CareShift> = {}): CareShift => ({
    id: '5', caregiverId: '7', caregiverName: 'Ana Torres', startsAt: '2026-11-22T03:00:00Z', endsAt: '2026-11-22T11:00:00Z', notes: '', ...overrides,
  });

  it('turns a shift into a Lima agenda entry whose state follows the clock', () => {
    const at = (iso: string) => shiftToItem(shift(), null, new Date(iso));
    const item = at('2026-11-21T20:00:00-05:00');
    expect([item.date, item.startTime, item.endTime, item.activity.type, item.priority]).toEqual(['2026-11-21', '22:00:00', '06:00:00', 'SHIFT', null]);
    expect(item.status).toBe('SCHEDULED');
    expect(at('2026-11-22T01:00:00-05:00').status).toBe('IN_PROGRESS');
    expect(statusText(at('2026-11-22T07:00:00-05:00'))).toBe('Terminado');
    expect(timeRange(item)).toBe('22:00 – 06:00 (+1 día)');
  });

  it('shows a caregiver only their own shifts and a relative all of them, by start time', () => {
    const activity = { activity: { id: 3, title: 'Losartán', type: 'MEDICATION' }, assignmentId: 12, assistedPerson: { id: 8, name: 'Rosa' },
      startsAt: '2026-11-21T23:00:00', endsAt: '2026-11-21T23:30:00', date: '2026-11-21', status: 'SCHEDULED' } as AgendaItem;
    const shifts = [shift(), shift({ id: '6', caregiverId: '9' })];
    const now = new Date('2026-11-21T12:00:00-05:00');
    const mine = mergeAgenda([activity], shifts, [7], now);
    expect(mine.map(item => item.activity.type)).toEqual(['SHIFT', 'MEDICATION']);
    expect(mine[0].assistedPerson?.name).toBe('Rosa');
    expect(mergeAgenda([activity], shifts, [], now).filter(item => item.activity.type === 'SHIFT')).toHaveLength(2);
  });

  it('reminds a shift by its period and assisted person, and a dose without advice', () => {
    const item = shiftToItem(shift(), { id: null, name: 'Rosa' }, new Date('2026-11-21T21:50:00-05:00'));
    expect(reminderOf(item)).toEqual({ title: 'Turno: 22:00 – 06:00 (+1 día)', detail: 'Rosa' });
    expect(upcoming([item], new Date('2026-11-21T21:50:00-05:00'))).toHaveLength(1);
    const dose = { ...item, activity: { id: 3, title: 'Losartán 50 mg', type: 'MEDICATION' }, endsAt: '2026-11-21T23:00:00', endTime: '23:00:00' } as AgendaItem;
    expect(reminderOf(dose)).toEqual({ title: 'Medicamento: Losartán 50 mg', detail: 'Rosa · 22:00 – 23:00' });
  });
});
