import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { TechnicalOrdersStore } from '../../../application/technical-orders.store';
import { order } from '../../../domain/technical-order.fixtures';
import { TechnicalOrderDetail } from './technical-order-detail';

describe('TechnicalOrderDetail', () => {
  const store = { select: vi.fn() };
  let component: TechnicalOrderDetail;

  beforeEach(() => {
    store.select.mockReset();
    TestBed.configureTestingModule({ providers: [
      { provide: TechnicalOrdersStore, useValue: store },
      { provide: ActivatedRoute, useValue: { snapshot: { data: {}, paramMap: convertToParamMap({ orderId: '5' }) } } },
    ] });
    component = TestBed.runInInjectionContext(() => new TechnicalOrderDetail());
  });

  it('reads the order and shows its home on Google Maps', () => {
    const view = component as unknown as {
      mapSearch(directions: string): string; description(item: unknown): string;
      steps(item: unknown): { label: string; done: boolean }[]; stage(item: unknown): string;
    };
    component.ngOnInit();
    expect(store.select).toHaveBeenCalledWith(5);

    expect(view.mapSearch('Av. Primavera 1450')).toContain('google.com/maps/search/?api=1&query=');
  });

  it('describes the service and the steps of the visit', () => {
    const view = component as unknown as { description(item: unknown): string; steps(item: unknown): { label: string; done: boolean }[]; stage(item: unknown): string };
    expect(view.description(order())).toContain('Evaluación técnica');
    expect(view.description(order({ serviceType: 'INSTALLATION' }))).toContain('Instalación');
    expect(view.description(order({ serviceType: 'MAINTENANCE' }))).toContain('incidencia');
    expect(view.description(order({ serviceType: 'MAINTENANCE', incident: { id: 1, code: 'INC-1', status: 'OPEN', problemType: null, description: 'No responde', occurredAt: null, device: null } }))).toBe('No responde');
    expect(view.steps(order()).map(step => step.done)).toEqual([true, false, false]);
    expect(view.steps(order({ status: 'COMPLETED', startedAt: '2026-11-05T13:00:00Z', completedAt: '2026-11-05T14:00:00Z' })).map(step => step.done)).toEqual([true, true, true]);
    expect(view.steps(order({ status: 'CANCELED' }))[2].label).toBe('Orden cancelada');
    expect(view.stage(order({ startedAt: '2026-11-05T13:00:00Z' }))).toBe('in-progress');
  });
});
