import { ComponentFixture, TestBed } from '@angular/core/testing';
import { limaToday } from '../../../../operations/domain/technical-order.entity';
import { AgendaItem, CareShift } from '../../../domain/care.entity';
import { AssistanceApi, AssistanceApiError } from '../../../infrastructure/assistance.api';
import { CareAgenda } from './care-agenda';

const today = limaToday();
const dose = { activity: { id: 3, title: 'Losartán 50 mg', type: 'MEDICATION' }, assignmentId: 12, assistedPerson: { id: 8, name: 'Rosa Pérez' },
  date: today, startTime: '23:00:00', endTime: '23:30:00', startsAt: `${today}T23:00:00`, endsAt: `${today}T23:30:00`,
  responsible: { type: 'CAREGIVER', id: 7, name: 'Ana Torres', email: null }, recurring: true, status: 'SCHEDULED', priority: 'HIGH' } as AgendaItem;
// 08:00 to 16:00 Lima today.
const shift = (caregiverId: string): CareShift => ({ id: '5', caregiverId, caregiverName: 'Ana Torres',
  startsAt: new Date(`${today}T08:00:00-05:00`).toISOString(), endsAt: new Date(`${today}T16:00:00-05:00`).toISOString(), notes: '' });

function setup(shifts: ReturnType<typeof vi.fn>) {
  const api = { agenda: vi.fn().mockResolvedValue([dose]), notifications: vi.fn().mockResolvedValue([]), shifts, myCaregiverIds: vi.fn().mockResolvedValue([7]) };
  TestBed.configureTestingModule({ providers: [{ provide: AssistanceApi, useValue: api }] });
  const fixture = TestBed.createComponent(CareAgenda);
  return { api, fixture, element: fixture.nativeElement as HTMLElement };
}

async function settle(fixture: ComponentFixture<CareAgenda>) { await new Promise(resolve => setTimeout(resolve)); fixture.detectChanges(); }
const reload = (fixture: ComponentFixture<CareAgenda>) => fixture.componentInstance['load'](true);

describe('CareAgenda', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('lists the caregiver shift next to the activities and drops it once reassigned', async () => {
    const shifts = vi.fn().mockResolvedValueOnce([shift('7')]).mockResolvedValueOnce([shift('9')]);
    const { api, fixture, element } = setup(shifts);
    fixture.detectChanges(); await settle(fixture);
    const rows = () => [...element.querySelectorAll('tbody tr')].map(row => row.textContent ?? '');
    expect(rows()).toHaveLength(2);
    expect(rows()[0]).toContain('Turno');
    expect(rows()[0]).toContain('Sin prioridad');
    expect(rows()[1]).toContain('Losartán 50 mg');

    await reload(fixture); fixture.detectChanges();
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toContain('Losartán 50 mg');
    expect(api.myCaregiverIds).toHaveBeenCalledTimes(1);
    fixture.destroy();
  });

  it('keeps the activities on screen when the shifts endpoint is not available', async () => {
    const { fixture, element } = setup(vi.fn().mockRejectedValue(new AssistanceApiError('No encontramos los turnos.', 404)));
    fixture.detectChanges(); await settle(fixture);
    expect(element.querySelector('.notice')!.textContent).toContain('No se pudieron cargar los turnos');
    expect(element.querySelector('tbody')!.textContent).toContain('Losartán 50 mg');
    fixture.destroy();
  });

  it('shows the calendar with the shift period', async () => {
    const { fixture, element } = setup(vi.fn().mockResolvedValue([shift('7')]));
    fixture.detectChanges(); await settle(fixture);
    element.querySelectorAll<HTMLButtonElement>('.segmented button')[1].click();
    fixture.detectChanges();
    expect(element.querySelector('.chip.shift')!.textContent).toContain('Turno 08:00 – 16:00');
    fixture.destroy();
  });

  it('separates reminders from alerts and holds reminders while offline', async () => {
    const notifications = [
      { id: 1, type: 'CARE_ACTIVITY_REMINDER', title: 'Medicamento en 15 minutos', body: 'Losartán para Rosa', status: 'UNREAD', createdAt: '' },
      { id: 2, type: 'ACTUATOR_FAILURE', title: 'Falla de la puerta', body: 'La cerradura no respondió', status: 'UNREAD', createdAt: '' },
      { id: 3, type: 'LOW_BATTERY', title: 'Leído', body: '', status: 'READ', createdAt: '' },
    ];
    const { api, fixture, element } = setup(vi.fn().mockResolvedValue([]));
    api.notifications.mockResolvedValue(notifications);
    fixture.detectChanges(); await settle(fixture);
    expect(element.querySelector('li.reminder')!.textContent).toContain('Medicamento en 15 minutos');
    expect(element.querySelector('li.alert')!.textContent).toContain('Falla de la puerta');
    expect(element.textContent).not.toContain('Leído');

    window.dispatchEvent(new Event('offline')); fixture.detectChanges();
    expect(element.querySelector('.offline')!.textContent).toContain('Sin conexión');
    await fixture.componentInstance['load']();
    expect(api.agenda).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event('online')); await settle(fixture);
    expect(element.querySelector('.offline')).toBeNull();
    expect(api.agenda).toHaveBeenCalledTimes(2);
    fixture.destroy();
  });

  it('moves between weeks, shows fallbacks and reports a failed agenda', async () => {
    const { api, fixture, element } = setup(vi.fn().mockResolvedValue([]));
    api.agenda.mockResolvedValueOnce([{ ...dose, assistedPerson: null, responsible: { type: 'RELATIVE', id: null, name: null, email: null } }, { ...dose, assignmentId: 13, responsible: null }])
      .mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('Sin conexión')).mockRejectedValueOnce('boom');
    api.notifications.mockRejectedValue(new Error('x'));
    fixture.detectChanges(); await settle(fixture);
    const text = element.querySelector('tbody')!.textContent ?? '';
    expect(text).toContain('Persona asistida');
    expect(text).toContain('Familiar');
    expect(text).toContain('Sin asignar');

    element.querySelector<HTMLButtonElement>('[aria-label="Semana siguiente"]')!.click(); await settle(fixture);
    expect(element.querySelector('.empty')!.textContent).toContain('No tienes turnos');
    element.querySelector<HTMLButtonElement>('[aria-label="Semana anterior"]')!.click(); await settle(fixture);
    expect(element.querySelector('.error-notice')!.textContent).toContain('Sin conexión');
    [...element.querySelectorAll<HTMLButtonElement>('.segmented button')].find(button => button.textContent === 'Hoy')!.click(); await settle(fixture);
    expect(element.querySelector('.error-notice')!.textContent).toContain('No se pudo consultar tu agenda');
    expect(api.agenda.mock.calls[3]).toEqual(api.agenda.mock.calls[0]);
    fixture.destroy();
  });
});
