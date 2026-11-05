import {
  freeSlots, regularShift, withinShift,
  createdAt, deviceTypeOf, formatDay, formatShortMoment, mapEmbedUrl, mapSearchUrl, groupByDay, homeName, limaToday, matches, orderCode, processLabel, problemOf, stageOf, window,
} from './technical-order.entity';
import { order } from './technical-order.fixtures';

describe('technical order', () => {
  it('follows the stage of the order: pending, assigned, in process, completed or canceled', () => {
    expect(stageOf(order({ technicianId: null }))).toBe('PENDING');
    expect(stageOf(order())).toBe('ASSIGNED');
    expect(stageOf(order({ startedAt: '2026-11-05T13:10:00Z' }))).toBe('IN_PROGRESS');
    expect(stageOf(order({ status: 'COMPLETED', startedAt: '2026-11-05T13:10:00Z' }))).toBe('COMPLETED');
    expect(stageOf(order({ status: 'CANCELED' }))).toBe('CANCELED');
    expect(stageOf(order({ status: 'CANCELLED' }))).toBe('CANCELED');
  });

  it('names the process with the visit result or the incident step', () => {
    expect(processLabel(order())).toBe('Asignada');
    expect(processLabel(order({ status: 'COMPLETED', evaluationResult: 'VIABLE' }))).toBe('Hogar viable');
    expect(processLabel(order({ status: 'COMPLETED', installationResult: 'APPROVED' }))).toBe('Instalación aprobada');
    expect(processLabel(order({ evaluationResult: 'NEW_RESULT' }))).toBe('NEW_RESULT');
    const incident = { id: 4, code: 'INC-2026-0004', status: 'IN_EVALUATION', problemType: 'BATTERY', description: 'Batería baja', occurredAt: null, device: null };
    expect(processLabel(order({ serviceType: 'MAINTENANCE', incident }))).toBe('En evaluación');
    expect(processLabel(order({ serviceType: 'MAINTENANCE', incident: { ...incident, status: 'WEIRD' } }))).toBe('WEIRD');
    expect(problemOf(incident)).toBe('Batería baja o agotada');
    expect(problemOf({ ...incident, problemType: null })).toBe('Otro problema');
  });

  it('shows the code, home, window, device and creation time the way the admin reads them', () => {
    expect(orderCode(order({ code: null, id: 9 }))).toBe('ORD-9');
    expect(homeName(order())).toBe('Hogar de María');
    expect(homeName(order({ contactName: null }))).toBe('Hogar de la solicitud');
    expect(window(order())).toBe('08:00 – 10:00');
    expect(deviceTypeOf('SENSOR')).toBe('Sensor');
    expect(deviceTypeOf('ROBOT')).toBe('ROBOT');
    expect(createdAt(order())).toBe('2026-11-04T15:00:00Z');
    expect(createdAt(order({ assignments: null }))).toBeNull();
    expect(formatDay('2026-11-05')).toMatch(/^Jueves, 5 de noviembre/);
    expect(formatShortMoment('2026-11-04T15:00:00Z')).toMatch(/4 nov.*10:00/);
    expect(limaToday(new Date('2026-11-05T03:00:00Z'))).toBe('2026-11-04');
  });

  it('points Google Maps at the home in Lima without an API key', () => {
    expect(mapEmbedUrl('Calle Los Pinos 218, Miraflores, Lima'))
      .toBe('https://maps.google.com/maps?q=Calle%20Los%20Pinos%20218%2C%20Miraflores%2C%20Lima%2C%20Per%C3%BA&z=16&output=embed');
    expect(mapSearchUrl('Jr. Huiracocha 2050'))
      .toBe('https://www.google.com/maps/search/?api=1&query=Jr.%20Huiracocha%202050%2C%20Lima%2C%20Per%C3%BA');
  });

  it('reads the regular working hours, the visits outside them and the free slots', () => {
    const week = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'].map(date => ({ date, shifts: [{ start: '08:00', end: '16:00' }] }));
    expect(regularShift(week)).toBe('Lun a Vie 08:00 – 16:00');
    expect(regularShift([{ date: '2026-11-02', shifts: [{ start: '08:00', end: '12:00' }] }, { date: '2026-11-04', shifts: [{ start: '08:00', end: '12:00' }] }])).toBe('Lun, Mié 08:00 – 12:00');
    expect(regularShift([])).toBeNull();
    expect(withinShift({ startTime: '12:00:00', endTime: '14:00:00' }, week[0])).toBe(true);
    expect(withinShift({ startTime: '15:00:00', endTime: '17:00:00' }, week[0])).toBe(false);
    expect(withinShift({ startTime: '09:00', endTime: '10:00' }, undefined)).toBe(false);
    const visits = [{ date: '2026-11-05', startTime: '09:00:00', endTime: '11:00:00', status: 'SCHEDULED' }, { date: '2026-11-05', startTime: '12:00:00', endTime: '14:00:00', status: 'CANCELED' }];
    expect(freeSlots(week, visits, '2026-11-05')).toBe(6);
  });

  it('groups upcoming orders by day and leaves the past ones last', () => {
    const groups = groupByDay([
      order({ id: 1, date: '2026-11-06', startTime: '10:00:00' }),
      order({ id: 2, date: '2026-11-05', startTime: '14:00:00' }),
      order({ id: 3, date: '2026-11-05', startTime: '08:00:00' }),
      order({ id: 4, date: '2026-11-09' }),
      order({ id: 5, date: '2026-11-01' }),
      order({ id: 6, date: '2026-11-03' }),
    ], '2026-11-05');

    expect(groups.map(group => group.title.split(' ·')[0])).toEqual(['Hoy', 'Mañana', expect.stringMatching(/^Lunes, 9/), 'Anteriores']);
    expect(groups[0].orders.map(item => item.id)).toEqual([3, 2]);
    expect(groups[3].orders.map(item => item.id)).toEqual([6, 5]);
  });

  it('finds orders by code, home, technician, address or incident', () => {
    const incident = { id: 4, code: 'INC-2026-0004', status: 'OPEN', problemType: null, description: null, occurredAt: null, device: null };
    expect(matches(order(), '')).toBe(true);
    expect(matches(order(), 'ord-2026')).toBe(true);
    expect(matches(order(), 'carla')).toBe(true);
    expect(matches(order(), 'san borja')).toBe(true);
    expect(matches(order({ incident }), 'inc-2026-0004')).toBe(true);
    expect(matches(order({ technicianName: null, directions: null }), 'zzz')).toBe(false);
  });
});
