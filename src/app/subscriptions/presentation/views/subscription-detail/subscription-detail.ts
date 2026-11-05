import { Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SubscriptionsStore } from '../../../application/subscriptions.store';
import { formatDate, homeOf, nextAction, priceOf, subscriptionStatusLabel } from '../../../domain/subscription.entity';
import { paymentState } from '../../../domain/hiring-request.entity';

@Component({ selector: 'app-subscription-detail', imports: [RouterLink], templateUrl: './subscription-detail.html', styleUrl: '../subscriptions-list/subscriptions-list.css' })
export class SubscriptionDetail implements OnInit {
  protected readonly store = inject(SubscriptionsStore);
  private readonly route = inject(ActivatedRoute);
  private readonly id = this.route.snapshot.paramMap.get('subscriptionId') ?? '';
  protected readonly back = this.route.snapshot.data['back'] as string ?? '/subscriptions';
  protected readonly subscription = computed(() => this.store.find(this.id));
  protected readonly statusLabel = subscriptionStatusLabel;
  protected readonly home = homeOf;
  protected readonly price = priceOf;
  protected readonly next = nextAction;
  protected readonly date = formatDate;
  protected readonly payment = paymentState;

  ngOnInit(): void { if (this.store.subscriptions().length === 0) void this.store.load(); }
}
