import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { limaToday } from '../../../domain/technical-order.entity';
import { order } from '../../../domain/technical-order.fixtures';
import { TechnicalOrdersApi } from '../../../infrastructure/technical-orders.api';
import { MyOrders } from './my-orders';

describe('MyOrders', () => {
  const today = limaToday();
  const yesterday = new Date(Date.parse(`${today}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  const orders = [
    order({ id: 1, date: today, serviceType: 'INSTALLATION' }),
    order({ id: 2, date: today, startedAt: '2026-11-05T13:00:00Z', serviceType: 'MAINTENANCE', incident: { id: 4, code: 'INC-1', status: 'IN_PROGRESS', problemType: null, description: 'No responde', occurredAt: null, device: { alias: 'Micrófono', macAddress: 'x', type: 'MICROPHONE' } } }),
    order({ id: 3, date: yesterday }),
    order({ id: 4, date: yesterday, status: 'COMPLETED', evaluationResult: 'VIABLE' }),
  ];

  async function render(result: Promise<unknown>) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: TechnicalOrdersApi, useValue: { listMine: vi.fn().mockReturnValue(result), listMySchedule: vi.fn().mockResolvedValue([{ date: today, shifts: [{ start: '08:00', end: '16:00' }] }]) } }] });
    const fixture = TestBed.createComponent(MyOrders);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('counts the visits, filters them and opens one in the drawer', async () => {
    const fixture = await render(Promise.resolve(orders));
    const element = fixture.nativeElement as HTMLElement;
    const view = fixture.componentInstance as unknown as {
      counts(): Record<string, number>; visible(): { id: number }[]; onType(event: Event): void; onState(event: Event): void;
      onDate(event: Event): void; onSearch(event: Event): void; stage(item: unknown): string; description(item: unknown): string;
    };

    expect(view.counts()).toEqual({ pending: 3, today: 2, inProgress: 1, late: 1 });
    expect(element.textContent).toContain('Turno de hoy: 08:00 – 16:00');
    expect(view.visible().map(item => item.id)).toEqual([3, 1, 2, 4]);
    expect(view.stage(orders[2])).toBe('late');
    expect(element.querySelectorAll('article.order')).toHaveLength(4);

    view.onType({ target: { value: 'MAINTENANCE' } } as unknown as Event);
    expect(view.visible().map(item => item.id)).toEqual([2]);
    view.onType({ target: { value: 'ALL' } } as unknown as Event);
    view.onState({ target: { value: 'COMPLETED' } } as unknown as Event);
    expect(view.visible().map(item => item.id)).toEqual([4]);
    view.onState({ target: { value: 'OPEN' } } as unknown as Event);
    expect(view.visible().map(item => item.id)).toEqual([3, 1]);
    view.onState({ target: { value: 'ALL' } } as unknown as Event);
    view.onDate({ target: { value: today } } as unknown as Event);
    view.onSearch({ target: { value: 'ord-2026' } } as unknown as Event);
    expect(view.visible().map(item => item.id)).toEqual([1, 2]);

    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.see')!.click();
    fixture.detectChanges();
    expect(element.querySelector('aside.drawer')?.textContent).toContain('Hogar de María');
    expect(element.querySelector<HTMLAnchorElement>('aside.drawer a.map')?.href).toContain('google.com/maps/search/');
    expect(view.description(orders[1])).toBe('No responde');
    expect(view.description(order({ serviceType: 'EVALUATION' }))).toContain('Evaluación');
    expect(view.description(order({ serviceType: 'INSTALLATION' }))).toContain('Instalación');
    expect(view.description(order({ serviceType: 'MAINTENANCE' }))).toContain('incidencia');
    element.querySelector<HTMLButtonElement>('.close')!.click();
    fixture.detectChanges();
    expect(element.querySelector('aside.drawer')).toBeNull();

  });

  it('reports why the orders could not be read', async () => {
    const fixture = await render(Promise.reject(new Error('Tu sesión venció.')));
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Tu sesión venció.');
    const failing = await render(Promise.reject('boom'));
    expect((failing.nativeElement as HTMLElement).textContent).toContain('No se pudo consultar tus órdenes.');
  });
});
