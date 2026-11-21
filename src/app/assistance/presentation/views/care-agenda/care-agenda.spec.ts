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
});
