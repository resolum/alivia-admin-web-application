import { Component, computed, effect, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { districtOf } from '../../../../shared/domain/map-links';
import {
  freeSlots, homeName, limaToday, orderCode, processLabel, regularShift, ServiceType, serviceTypeLabel, stageOf, TechnicalOrder,
  window, withinShift, WorkingDay,
} from '../../../domain/technical-order.entity';
import { TechnicalOrdersApi } from '../../../infrastructure/technical-orders.api';

export type CalendarMode = 'day' | 'week' | 'month';
interface Column { date: string; weekday: string; day: number; isToday: boolean; orders: TechnicalOrder[]; schedule: WorkingDay | undefined; }
interface MonthCell { date: string; day: number; inMonth: boolean; isToday: boolean; orders: TechnicalOrder[]; schedule: WorkingDay | undefined; }

const HOUR_HEIGHT = 64;
const minutes = (time: string) => { const [hours, mins] = time.split(':').map(Number); return hours * 60 + mins; };
const addDays = (date: string, days: number) => { const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); };
/** Monday of the week of {@code date}. */
const mondayOf = (date: string) => { const value = new Date(`${date}T00:00:00Z`); return addDays(date, -((value.getUTCDay() + 6) % 7)); };

/** The technician's orders laid out by schedule (day, week or month), read only. */
@Component({ selector: 'app-my-calendar', imports: [RouterLink], templateUrl: './my-calendar.html', styleUrl: './my-calendar.css' })
export class MyCalendar implements OnInit, OnDestroy {
  private readonly api = inject(TechnicalOrdersApi);
  /** Shown inside "Mis órdenes": without the page frame and its title. */
  readonly embedded = input(false);
  protected readonly orders = signal<TechnicalOrder[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly mode = signal<CalendarMode>('week');
  protected readonly anchor = signal(limaToday());
  protected readonly type = signal<'ALL' | ServiceType>('ALL');
  protected readonly selected = signal<TechnicalOrder | null>(null);
  protected readonly now = signal(new Date());
  protected readonly today = limaToday();
  protected readonly typeLabel = serviceTypeLabel;
  protected readonly code = orderCode;
  protected readonly home = homeName;
  protected readonly window = window;
  protected readonly process = processLabel;
  protected readonly district = (order: TechnicalOrder) => districtOf(order.directions);
  protected readonly hourHeight = HOUR_HEIGHT;
  private timer: ReturnType<typeof setInterval> | undefined;
  /** Shifts of the technician's work schedule by date, as far as they were read. */
  protected readonly schedule = signal<Map<string, WorkingDay>>(new Map());
  private readonly loadedSchedule = new Set<string>();

  constructor() {
    // Reads the work schedule of the dates on screen whenever the view or the period changes.
    effect(() => {
      const dates = this.mode() === 'month' ? this.monthCells().map(cell => cell.date) : this.visibleDates();
      void this.loadSchedule(dates[0], dates.at(-1)!);
    });
  }

  private readonly filtered = computed(() => this.orders().filter(order => this.type() === 'ALL' || order.serviceType === this.type()));

  private readonly visibleDates = computed(() => this.mode() === 'day' ? [this.anchor()]
    : Array.from({ length: 7 }, (_, index) => addDays(mondayOf(this.anchor()), index)));

  /** Days shown in the day or week view (Monday to Saturday, Sunday too when it is worked or has visits). */
  protected readonly columns = computed<Column[]>(() => {
    const dates = this.visibleDates();
    const weekday = new Intl.DateTimeFormat('es-PE', { weekday: 'short', timeZone: 'UTC' });
    return dates
      .map(date => ({
        date, weekday: weekday.format(new Date(`${date}T00:00:00Z`)).replace('.', '').toUpperCase(), day: Number(date.slice(8)),
        isToday: date === this.today,
        orders: this.filtered().filter(order => order.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime)),
        schedule: this.schedule().get(date),
      }))
      .filter((column, index) => this.mode() === 'day' || index < 6 || column.orders.length > 0 || column.schedule !== undefined);
  });

  /** From the earliest shift start to the latest shift end (08:00–17:00 without a schedule), stretched to fit every visit. */
  protected readonly hours = computed(() => {
    const visits = this.columns().flatMap(column => column.orders);
    const shifts = this.columns().flatMap(column => column.schedule?.shifts ?? []);
    const starts = [...visits.map(order => order.startTime), ...shifts.map(shift => shift.start)];
    const ends = [...visits.map(order => order.endTime), ...shifts.map(shift => shift.end)];
    const first = Math.min(shifts.length ? 24 : 8, ...starts.map(time => Math.floor(minutes(time) / 60)));
    const last = Math.max(shifts.length ? 0 : 17, ...ends.map(time => Math.ceil(minutes(time) / 60)));
    return Array.from({ length: Math.min(last, 24) - first }, (_, index) => first + index);
  });

  protected readonly summary = computed(() => {
    const visits = this.columns().flatMap(column => column.orders);
    const reserved = visits.reduce((total, order) => total + Math.max(0, minutes(order.endTime) - minutes(order.startTime)), 0) / 60;
    const days = this.columns().map(column => column.schedule).filter((day): day is WorkingDay => day !== undefined);
    return {
      count: visits.length,
      hours: Number.isInteger(reserved) ? String(reserved) : reserved.toFixed(1),
      free: days.length ? freeSlots(days, this.orders(), this.today) : null,
      regular: regularShift([...this.schedule().values()]),
    };
  });

  protected readonly monthCells = computed<MonthCell[]>(() => {
    const first = `${this.anchor().slice(0, 7)}-01`;
    const start = mondayOf(first);
    return Array.from({ length: 42 }, (_, index) => {
      const date = addDays(start, index);
      return {
        date, day: Number(date.slice(8)), inMonth: date.slice(0, 7) === first.slice(0, 7), isToday: date === this.today,
        orders: this.filtered().filter(order => order.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime)),
        schedule: this.schedule().get(date),
      };
    });
  });

  protected readonly title = computed(() => {
    const month = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${this.anchor()}T00:00:00Z`));
    return month.charAt(0).toUpperCase() + month.slice(1);
  });

  protected readonly range = computed(() => {
    const format = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    if (this.mode() === 'month') return this.title();
    const columns = this.columns();
    const from = new Date(`${columns[0].date}T00:00:00Z`);
    const to = new Date(`${columns.at(-1)!.date}T00:00:00Z`);
    return columns.length === 1 ? format.format(from) : `${format.format(from)} – ${format.format(to)}`;
  });

  /** Where the red "now" line goes, when today is on screen. */
  protected readonly nowLine = computed(() => {
    const index = this.columns().findIndex(column => column.isToday);
    if (index < 0) return null;
    const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Lima' }).format(this.now());
    const top = (minutes(time) - this.hours()[0] * 60) * HOUR_HEIGHT / 60;
    if (top < 0 || top > this.hours().length * HOUR_HEIGHT) return null;
    return { top, label: time };
  });

  ngOnInit(): void {
    void this.load();
    this.timer = setInterval(() => this.now.set(new Date()), 60_000);
  }

  ngOnDestroy(): void { clearInterval(this.timer); }

  protected async load(): Promise<void> {
    this.loading.set(true); this.error.set(null);
    try { this.orders.set(await this.api.listMine()); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudo consultar tus órdenes.'); }
    finally { this.loading.set(false); }
  }

  /** Reads the shifts of the dates not read yet; without a schedule the calendar still shows the visits. */
  private async loadSchedule(from: string, to: string): Promise<void> {
    if (this.loadedSchedule.has(`${from}/${to}`)) return;
    this.loadedSchedule.add(`${from}/${to}`);
    try {
      const days = await this.api.listMySchedule(from, to);
      this.schedule.update(current => {
        const next = new Map(current);
        days.forEach(day => next.set(day.date, day));
        return next;
      });
    } catch {
      this.loadedSchedule.delete(`${from}/${to}`);
    }
  }

  /** Position of a shift block in its day column. */
  protected placeShift(shift: { start: string; end: string }): { top: number; height: number } {
    const start = minutes(shift.start) - this.hours()[0] * 60;
    return { top: start * HOUR_HEIGHT / 60, height: (minutes(shift.end) - minutes(shift.start)) * HOUR_HEIGHT / 60 };
  }

  /** A visit outside the technician's working hours is flagged. */
  protected outside(order: TechnicalOrder): boolean { return !withinShift(order, this.schedule().get(order.date)); }

  protected shiftText(day: WorkingDay | undefined): string | null {
    return day ? day.shifts.map(shift => `${shift.start} – ${shift.end}`).join(' · ') : null;
  }

  /** Position of a visit in its day column. */
  protected place(order: TechnicalOrder): { top: number; height: number } {
    const start = minutes(order.startTime) - this.hours()[0] * 60;
    const length = Math.max(minutes(order.endTime) - minutes(order.startTime), 30);
    return { top: start * HOUR_HEIGHT / 60, height: length * HOUR_HEIGHT / 60 - 4 };
  }

  protected stage(order: TechnicalOrder): string { return stageOf(order).toLowerCase().replace('_', '-'); }

  protected move(step: number): void {
    const date = this.anchor();
    if (this.mode() === 'month') {
      const value = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
      value.setUTCMonth(value.getUTCMonth() + step);
      this.anchor.set(value.toISOString().slice(0, 10));
    } else {
      this.anchor.set(addDays(date, step * (this.mode() === 'day' ? 1 : 7)));
    }
    this.selected.set(null);
  }

  protected goToday(): void { this.anchor.set(this.today); this.selected.set(null); }
  protected openDay(date: string): void { this.anchor.set(date); this.mode.set('day'); }
  protected setType(type: 'ALL' | ServiceType): void { this.type.set(this.type() === type ? 'ALL' : type); }
}
