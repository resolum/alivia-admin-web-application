import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { districtOf } from '../../../../shared/domain/map-links';
import {
  formatDay, homeName, limaToday, mapEmbedUrl, mapSearchUrl, matches, orderCode, processLabel, ServiceType, serviceTypeLabel,
  stageOf, TechnicalOrder, window,
} from '../../../domain/technical-order.entity';
import { TechnicalOrdersApi } from '../../../infrastructure/technical-orders.api';
import { MyCalendar } from '../my-calendar/my-calendar';

type StateFilter = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';

/**
 * The technician's orders in the web portal, read only: where and when each visit is. Starting, closing or
 * resolving a visit happens in the mobile app.
 */
@Component({ selector: 'app-my-orders', imports: [RouterLink, MyCalendar], templateUrl: './my-orders.html', styleUrl: './my-orders.css' })
export class MyOrders implements OnInit {
  private readonly api = inject(TechnicalOrdersApi);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly orders = signal<TechnicalOrder[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly view = signal<'cards' | 'calendar'>('cards');
  protected readonly search = signal('');
  protected readonly type = signal<'ALL' | ServiceType>('ALL');
  protected readonly state = signal<StateFilter>('ALL');
  protected readonly date = signal('');
  protected readonly opened = signal<TechnicalOrder | null>(null);
  /** Today's shift of the technician's work schedule, e.g. "08:00 – 16:00"; null on a day off. */
  protected readonly shiftToday = signal<string | null>(null);
  protected readonly today = limaToday();
  protected readonly typeLabel = serviceTypeLabel;
  protected readonly code = orderCode;
  protected readonly home = homeName;
  protected readonly window = window;
  protected readonly process = processLabel;
  protected readonly day = formatDay;
  protected readonly district = (order: TechnicalOrder) => districtOf(order.directions);

  /** Not closed: still to be attended. */
  private readonly isOpen = (order: TechnicalOrder) => stageOf(order) !== 'COMPLETED' && stageOf(order) !== 'CANCELED';

  protected readonly counts = computed(() => {
    const orders = this.orders();
    return {
      pending: orders.filter(this.isOpen).length,
      today: orders.filter(order => order.date === this.today && this.isOpen(order)).length,
      inProgress: orders.filter(order => stageOf(order) === 'IN_PROGRESS').length,
      late: orders.filter(order => order.date < this.today && stageOf(order) === 'ASSIGNED').length,
    };
  });

  /** Open visits first by date and time, then the closed ones, latest first. */
  protected readonly visible = computed(() => this.orders()
    .filter(order => matches(order, this.search())
      && (this.type() === 'ALL' || order.serviceType === this.type())
      && (this.state() === 'ALL' || (this.state() === 'OPEN' ? stageOf(order) === 'ASSIGNED' || stageOf(order) === 'PENDING' : stageOf(order) === this.state()))
      && (!this.date() || order.date === this.date()))
    .sort((a, b) => {
      const open = Number(this.isOpen(b)) - Number(this.isOpen(a));
      if (open !== 0) return open;
      const order = a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);
      return this.isOpen(a) ? order : -order;
    }));

  protected readonly mapEmbed = computed<SafeResourceUrl | null>(() => {
    const directions = this.opened()?.directions;
    // Only this URL, built from the order's address, is trusted as a frame source.
    return directions ? this.sanitizer.bypassSecurityTrustResourceUrl(mapEmbedUrl(directions)) : null;
  });

  ngOnInit(): void {
    void this.load();
    this.api.listMySchedule(this.today, this.today).then(
      days => this.shiftToday.set(days[0]?.shifts.map(shift => `${shift.start} – ${shift.end}`).join(' · ') ?? null),
      () => this.shiftToday.set(null),
    );
  }

  protected async load(): Promise<void> {
    this.loading.set(true); this.error.set(null);
    try { this.orders.set(await this.api.listMine()); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudo consultar tus órdenes.'); }
    finally { this.loading.set(false); }
  }

  protected stage(order: TechnicalOrder): string {
    if (order.date < this.today && stageOf(order) === 'ASSIGNED') return 'late';
    return stageOf(order).toLowerCase().replace('_', '-');
  }

  protected mapSearch(directions: string): string { return mapSearchUrl(directions); }

  protected description(order: TechnicalOrder): string {
    if (order.serviceType === 'EVALUATION') return 'Evaluación técnica de compatibilidad del hogar con la configuración contratada.';
    if (order.serviceType === 'INSTALLATION') return 'Instalación y configuración de los dispositivos contratados.';
    return order.incident?.description || 'Atención de la incidencia reportada por la familia.';
  }

  protected onSearch(event: Event): void { this.search.set((event.target as HTMLInputElement).value); }
  protected onType(event: Event): void { this.type.set((event.target as HTMLSelectElement).value as 'ALL' | ServiceType); }
  protected onState(event: Event): void { this.state.set((event.target as HTMLSelectElement).value as StateFilter); }
  protected onDate(event: Event): void { this.date.set((event.target as HTMLInputElement).value); }
}
