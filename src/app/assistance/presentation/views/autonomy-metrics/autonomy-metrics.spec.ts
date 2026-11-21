import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AutonomyAction, AutonomyMetrics as Metrics } from '../../../domain/autonomy-metrics.entity';
import { AssistanceApi, AssistanceApiError } from '../../../infrastructure/assistance.api';
import { AutonomyMetrics } from './autonomy-metrics';

const action = (eventId: string, overrides: Partial<AutonomyAction> = {}): AutonomyAction => ({
  eventId, occurredAt: '2026-11-21T10:00:00', deviceId: 1, deviceName: 'Luz sala', deviceType: 'LIGHT', source: 'VOICE',
  intent: 'Encender luz', result: 'SUCCEEDED', executedLocally: false, ...overrides,
});
const metrics = (overrides: Partial<Metrics> = {}): Metrics => ({
  lastSyncedAt: '2026-11-21T10:05:00', edgeOnline: true,
  actions: [action('e1', { executedLocally: true }), action('e2', { deviceId: 2, deviceName: 'Puerta principal', deviceType: 'DOOR', source: 'APP', intent: 'Abrir', result: 'FAILED' })],
  ...overrides,
});

function setup(autonomyMetrics: ReturnType<typeof vi.fn>) {
  TestBed.configureTestingModule({ providers: [{ provide: AssistanceApi, useValue: { autonomyMetrics } }] });
  const fixture = TestBed.createComponent(AutonomyMetrics);
  return { fixture, element: fixture.nativeElement as HTMLElement };
}
async function settle(fixture: ComponentFixture<AutonomyMetrics>) { fixture.detectChanges(); await new Promise(resolve => setTimeout(resolve)); fixture.detectChanges(); }
const rows = (element: HTMLElement) => [...element.querySelectorAll('.block tbody tr')].map(row => row.textContent ?? '');

describe('AutonomyMetrics', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('summarizes requested and executed actions, results and local executions', async () => {
    const { fixture, element } = setup(vi.fn().mockResolvedValue(metrics()));
    await settle(fixture);
    const counts = [...element.querySelectorAll('.counts tbody tr')].map(row => [...row.querySelectorAll('td')].map(cell => cell.textContent).join(' '));
    expect(counts).toEqual(['Luces 1 1', 'Puertas 1 0', 'Ventanas 0 0']);
    expect(element.querySelector('.results .failed')!.textContent).toContain('1');
    expect(element.querySelector('.local')!.textContent).toContain('1 acción se ejecutó localmente');
    expect(element.querySelector('.sync')!.textContent).toContain('Última actualización');
    expect(element.querySelector('.sync.offline')).toBeNull();
    expect(rows(element)).toHaveLength(2);
    expect(element.querySelector('audio')).toBeNull();
  });

  it('filters by device type and by device', async () => {
    const { fixture, element } = setup(vi.fn().mockResolvedValue(metrics()));
    await settle(fixture);
    const component = fixture.componentInstance;
    component['setType']('DOOR'); fixture.detectChanges();
    expect(rows(element)).toHaveLength(1);
    expect(rows(element)[0]).toContain('Puerta principal');
    component['setType']('ALL'); component['deviceId'].set(1); fixture.detectChanges();
    expect(rows(element)).toHaveLength(1);
    expect(rows(element)[0]).toContain('Encender luz');
    component['setType']('WINDOW'); fixture.detectChanges();
    expect(element.querySelector('.empty')!.textContent).toContain('No hay acciones');
  });

  it('warns that events may be pending while the edge is offline', async () => {
    const { fixture, element } = setup(vi.fn().mockResolvedValue(metrics({ edgeOnline: false, lastSyncedAt: null, actions: [action('e1', { executedLocally: true }), action('e3', { executedLocally: true })] })));
    await settle(fixture);
    expect(element.querySelector('.sync.offline')!.textContent).toContain('pueden existir eventos pendientes');
    expect(element.querySelector('.sync')!.textContent).toContain('nunca');
    expect(element.querySelector('.local')!.textContent).toContain('2 acciones se ejecutaron');
  });

  it('explains a missing endpoint and other failures, and retries', async () => {
    const load = vi.fn().mockRejectedValueOnce(new AssistanceApiError('x', 404)).mockRejectedValueOnce(new Error('Sin conexión')).mockRejectedValueOnce('boom');
    const { fixture, element } = setup(load);
    await settle(fixture);
    expect(element.querySelector('.error-notice')!.textContent).toContain('aún no están disponibles');
    element.querySelector<HTMLButtonElement>('.error-notice button')!.click();
    await settle(fixture);
    expect(element.querySelector('.error-notice')!.textContent).toContain('Sin conexión');
    element.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await settle(fixture);
    expect(element.querySelector('.error-notice')!.textContent).toContain('No se pudo consultar las métricas');
    expect(load).toHaveBeenCalledTimes(3);
  });
});
