import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { districtOf, mapSearchUrl } from '../../../../shared/domain/map-links';
import { paymentState } from '../../../domain/hiring-request.entity';
import {
  deviceLabel, formatLongDate, formatOrderDay, homeName, homePrice, nextBilling, orderState, orderTypeLabel, ServicedHome,
  subscriptionLabel, subscriptionStatus,
} from '../../../domain/serviced-home.entity';

export type HomeTab = 'info' | 'subscription' | 'devices' | 'orders';

/**
 * A home in service, read only: general data, its subscription, the installed devices and its technical orders,
 * with its location on Google Maps. Shared by the administration and the technician portal.
 */
@Component({ selector: 'app-home-detail', imports: [RouterLink], templateUrl: './home-detail.html', styleUrl: './home-detail.css' })
export class HomeDetail {
  readonly home = input.required<ServicedHome>();
  /** Base route of the order detail ("/operations" or "/technician/orders"); null hides the order links. */
  readonly orderLink = input<string | null>(null);
  protected readonly tab = signal<HomeTab>('info');
  protected readonly name = homeName;
  protected readonly price = homePrice;
  protected readonly longDate = formatLongDate;
  protected readonly orderDay = formatOrderDay;
  protected readonly deviceLabel = deviceLabel;
  protected readonly orderType = orderTypeLabel;
  protected readonly orderState = orderState;
  protected readonly subscription = subscriptionLabel;
  protected readonly tabs: { id: HomeTab; label: string }[] = [
    { id: 'info', label: '1. Información' }, { id: 'subscription', label: '2. Suscripción' },
    { id: 'devices', label: '3. Dispositivos' }, { id: 'orders', label: '4. Órdenes técnicas' },
  ];
  protected readonly district = computed(() => districtOf(this.home().directions));
  protected readonly status = computed(() => subscriptionStatus(this.home()).toLowerCase());
  protected readonly payment = computed(() => paymentState(this.home()).label);
  protected readonly nextBilling = computed(() => nextBilling(this.home()));
  protected readonly attended = computed(() => this.home().orders.filter(order => order.status === 'COMPLETED').length);
  protected readonly active = computed(() => this.home().orders.filter(order => orderState(order).tone === 'active' || orderState(order).tone === 'scheduled').length);
  protected readonly mapSearch = computed(() => this.home().directions ? mapSearchUrl(this.home().directions!) : null);

  protected count(tab: HomeTab): number | null {
    if (tab === 'devices') return this.home().devices.length;
    if (tab === 'orders') return this.home().orders.length;
    return null;
  }
}
