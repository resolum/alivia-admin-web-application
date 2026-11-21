import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { limaToday } from '../../../domain/technical-order.entity';
import { order } from '../../../domain/technical-order.fixtures';
import { TechnicalOrdersApi } from '../../../infrastructure/technical-orders.api';
import { MyCalendar } from './my-calendar';

const addDays = (date: string, days: number) => { const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); };

describe('MyCalendar', () => {
  const today = limaToday();
  const orders = [
    order({ id: 1, date: today, startTime: '09:00:00', endTime: '11:00:00', serviceType: 'INSTALLATION' }),
    order({ id: 2, date: today, startTime: '07:00:00', endTime: '08:30:00', serviceType: 'MAINTENANCE' }),
    order({ id: 3, date: addDays(today, 40), startTime: '18:00:00', endTime: '19:30:00' }),
  ];

  let schedule: Promise<unknown> = Promise.resolve([]);
  async function render(result: Promise<unknown>) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: TechnicalOrdersApi, useValue: { listMine: vi.fn().mockReturnValue(result), listMySchedule: vi.fn().mockImplementation(() => schedule) } }] });
    const fixture = TestBed.createComponent(MyCalendar);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('shades the working hours and flags visits outside them', async () => {
    schedule = Promise.resolve([{ date: today, shifts: [{ start: '08:00', end: '16:00' }] }]);
    const fixture = await render(Promise.resolve(orders));
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const view = fixture.componentInstance as unknown as {
      hours(): number[]; summary(): { free: number | null; regular: string | null }; outside(item: unknown): boolean;
      placeShift(shift: unknown): { top: number; height: number }; shiftText(day: unknown): string | null;
    };
    expect(element.querySelectorAll('.shift')).toHaveLength(1);
    expect(view.hours()[0]).toBe(7);
    expect(view.hours().at(-1)).toBe(15);
    expect(view.outside(orders[1])).toBe(true);
    expect(view.outside(orders[0])).toBe(false);
    expect(element.textContent).toContain('Fuera de jornada');
    expect(view.summary().regular).toMatch(/08:00 – 16:00$/);
    expect(view.summary().free).toBe(2);
    expect(element.textContent).toContain('Sin jornada');
    expect(view.placeShift({ start: '08:00', end: '16:00' })).toEqual({ top: 64, height: 512 });
    expect(view.shiftText(undefined)).toBeNull();

    schedule = Promise.reject(new Error('offline'));
    const failing = await render(Promise.resolve(orders));
    expect((failing.nativeElement as HTMLElement).textContent).toContain('Sin horario laboral asignado');
    schedule = Promise.resolve([]);
  });

  it('lays the week out by schedule and opens a visit', async () => {
    const fixture = await render(Promise.resolve(orders));
    const element = fixture.nativeElement as HTMLElement;
    const view = fixture.componentInstance as unknown as {
      columns(): { date: string; orders: unknown[] }[]; hours(): number[]; summary(): { count: number; hours: string };
      place(item: unknown): { top: number; height: number }; mode: { set(value: string): void }; move(step: number): void;
      goToday(): void; anchor(): string; monthCells(): { orders: unknown[] }[]; range(): string; title(): string; setType(type: string): void;
      openDay(date: string): void; stage(item: unknown): string;
    };

    expect(view.columns().length).toBeGreaterThanOrEqual(6);
    expect(view.hours()[0]).toBe(7);
    expect(view.hours().at(-1)).toBe(16);
    expect(view.summary()).toMatchObject({ count: 2, hours: '3.5' });
    expect(view.place(orders[0])).toEqual({ top: 128, height: 124 });
    expect(element.querySelectorAll('button.event')).toHaveLength(2);
    expect(view.stage(orders[0])).toBe('assigned');

    element.querySelector<HTMLButtonElement>('button.event')!.click();
    fixture.detectChanges();
    expect(element.querySelector('aside.popover a')?.getAttribute('href')).toMatch(/\/technician\/orders\/\d$/);
    element.querySelector<HTMLButtonElement>('.popover .close')!.click();
    fixture.detectChanges();
    expect(element.querySelector('aside.popover')).toBeNull();

    view.setType('MAINTENANCE');
    expect(view.summary().count).toBe(1);
    view.setType('MAINTENANCE');
    expect(view.summary().count).toBe(2);

    view.openDay(today);
    expect(view.columns()).toHaveLength(1);
    expect(view.range()).not.toContain('–');
    view.move(1);
    expect(view.anchor()).toBe(addDays(today, 1));
    view.mode.set('week');
    view.move(-1);
    expect(view.anchor()).toBe(addDays(today, -6));
    view.goToday();
    view.mode.set('month');
    fixture.detectChanges();
    expect(view.monthCells()).toHaveLength(42);
    expect(view.range()).toBe(view.title());
    expect(view.monthCells().some(cell => cell.orders.length > 0)).toBe(true);
    const month = view.anchor().slice(0, 7);
    view.move(1);
    expect(view.anchor().slice(0, 7)).not.toBe(month);
  });

  it('reports why the orders could not be read', async () => {
    expect(((await render(Promise.reject(new Error('Tu sesión venció.')))).nativeElement as HTMLElement).textContent).toContain('Tu sesión venció.');
    expect(((await render(Promise.reject('boom'))).nativeElement as HTMLElement).textContent).toContain('No se pudo consultar tus órdenes.');
  });
});
