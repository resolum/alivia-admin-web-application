import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SubscriptionsStore } from '../../../application/subscriptions.store';
import { formatDate, homeOf, nextAction, priceOf, Subscription, SubscriptionTab, subscriptionStatusLabel } from '../../../domain/subscription.entity';

@Component({ selector: 'app-subscriptions-list', imports: [RouterLink], templateUrl: './subscriptions-list.html', styleUrl: './subscriptions-list.css' })
export class SubscriptionsList implements OnInit {
  protected readonly store = inject(SubscriptionsStore);
  protected readonly statusLabel = subscriptionStatusLabel;
  protected readonly home = homeOf;
  protected readonly price = priceOf;
  protected readonly next = nextAction;
  protected readonly date = formatDate;
  protected readonly tabs: { id: SubscriptionTab; label: string }[] = [
    { id: 'ALL', label: 'Todas' }, { id: 'ACTIVE', label: 'Activas' }, { id: 'ATTENTION', label: 'Atención requerida' },
    { id: 'RENEWING', label: 'Próximas a renovar' }, { id: 'CANCELED', label: 'Canceladas' },
  ];

  ngOnInit(): void { void this.store.load(); }
  protected status(item: Subscription): string { return item.status.toLowerCase(); }
  protected onSearch(event: Event): void { this.store.setSearch((event.target as HTMLInputElement).value); }
  protected range(): string {
    const from = this.store.page() * this.store.pageSize;
    return `${from + 1}–${Math.min(from + this.store.pageSize, this.store.visible().length)}`;
  }
}
