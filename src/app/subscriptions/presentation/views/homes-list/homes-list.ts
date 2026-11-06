import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ServicedHomesStore } from '../../../application/serviced-homes.store';
import { homeDistrict, homeName, ServicedHome, subscriptionLabel, subscriptionStatus } from '../../../domain/serviced-home.entity';

/** Homes in service: all of them for the administration, the ones they served for a technician. */
@Component({ selector: 'app-homes-list', imports: [RouterLink], templateUrl: './homes-list.html', styleUrl: './homes-list.css' })
export class HomesList implements OnInit {
  protected readonly store = inject(ServicedHomesStore);
  protected readonly scope: 'all' | 'mine' = inject(ActivatedRoute).snapshot.data['scope'] ?? 'all';
  protected readonly name = homeName;
  protected readonly district = homeDistrict;
  protected readonly subscription = subscriptionLabel;

  ngOnInit(): void { void this.store.load(this.scope); }
  protected tone(home: ServicedHome): string { return subscriptionStatus(home).toLowerCase(); }
  protected onSearch(event: Event): void { this.store.search.set((event.target as HTMLInputElement).value); }
}
