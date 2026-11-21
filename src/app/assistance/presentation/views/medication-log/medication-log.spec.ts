import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AgendaItem, MedicationAdministration } from '../../../domain/care.entity';
import { AssistanceApi, AssistanceApiError } from '../../../infrastructure/assistance.api';
import { MedicationLog } from './medication-log';

const item = { activity: { id: 3, title: 'Losartán 50 mg', type: 'MEDICATION' }, assignmentId: 12, assistedPerson: { id: 8, name: 'Rosa Pérez' },
  date: '2026-11-21', startTime: '08:00:00', endTime: '09:00:00', startsAt: '2026-11-21T08:00:00', endsAt: '2026-11-21T09:00:00',
  responsible: { type: 'CAREGIVER', id: 7, name: 'Ana Torres', email: null }, recurring: true, status: 'IN_PROGRESS', priority: 'HIGH' } as AgendaItem;
const recorded: MedicationAdministration = { administrationId: '12-20261121', medication: 'Losartán 50 mg', assistedPerson: { id: 8, name: 'Rosa Pérez' },
  date: '2026-11-21', startTime: '08:00:00', endTime: '09:00:00', responsible: { type: 'CAREGIVER', id: 7, name: 'Ana Torres' }, status: 'COMPLETED',
  outcome: { result: 'ADMINISTERED', occurredAt: '2026-11-21T09:30:00', reason: null } };

function setup(recordOutcome: ReturnType<typeof vi.fn>) {
  // jsdom has no modal dialog support.
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) { this.open = true; };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) { this.open = false; };
  const api = { agenda: vi.fn().mockResolvedValue([item]), administration: vi.fn().mockResolvedValue(recorded), recordOutcome };
  TestBed.configureTestingModule({ providers: [{ provide: AssistanceApi, useValue: api }] });
  const fixture = TestBed.createComponent(MedicationLog);
  return { api, fixture, element: fixture.nativeElement as HTMLElement };
}

/** Lets the chained requests of load() and save() resolve, then renders. */
async function settle(fixture: ComponentFixture<MedicationLog>) { await new Promise(resolve => setTimeout(resolve)); fixture.detectChanges(); }

async function submit(fixture: ComponentFixture<MedicationLog>, element: HTMLElement, button: string) {
  fixture.detectChanges(); await settle(fixture);
  element.querySelector<HTMLButtonElement>(`.dose ${button}`)!.click();
  fixture.detectChanges();
  element.querySelector<HTMLFormElement>('dialog form')!.dispatchEvent(new Event('submit'));
  await settle(fixture);
}

describe('MedicationLog', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('records the confirmation once and moves it to the history as late', async () => {
    const { api, fixture, element } = setup(vi.fn().mockResolvedValue(recorded));
    await submit(fixture, element, '.button.primary');
    expect(api.recordOutcome).toHaveBeenCalledTimes(1);
    expect(api.recordOutcome).toHaveBeenCalledWith('12-20261121', 'ADMINISTERED', null);
    expect(element.querySelector('table')!.textContent).toContain('Atención tardía');
    expect(element.querySelector('.dose')).toBeNull();
  });

  it('shows the existing outcome instead of recording a duplicate', async () => {
    const { api, fixture, element } = setup(vi.fn().mockRejectedValue(new AssistanceApiError('dup', 409)));
    await submit(fixture, element, '.button.primary');
    expect(api.administration).toHaveBeenCalledWith('12-20261121');
    expect(element.querySelector('.existing')!.textContent).toContain('Administrada');
    expect(element.querySelector('dialog button[type=submit]')).toBeNull();
  });

  it('leaves the history untouched when the user may not record', async () => {
    const { fixture, element } = setup(vi.fn().mockRejectedValue(new AssistanceApiError('No tienes permiso para registrar esta administración. El historial no cambió.', 403)));
    await submit(fixture, element, '.button.primary');
    expect(element.querySelector('dialog .form-error')!.textContent).toContain('No tienes permiso');
    expect(element.querySelector('.dose')).not.toBeNull();
  });

  it('asks for the reason before recording an omission', async () => {
    const { api, fixture, element } = setup(vi.fn());
    await submit(fixture, element, '.button.secondary');
    expect(api.recordOutcome).not.toHaveBeenCalled();
    expect(element.querySelector('dialog .form-error')!.textContent).toContain('motivo');
  });
});
