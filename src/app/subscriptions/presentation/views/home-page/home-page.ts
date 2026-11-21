import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ServicedHomesStore } from '../../../application/serviced-homes.store';
import { HomeDetail } from '../../components/home-detail/home-detail';

/** Page of one home in service; the route says where the homes list and the order details are. */
@Component({
  selector: 'app-home-page', imports: [RouterLink, HomeDetail],
  template: `
    <section class="page detail-page">
      <a class="back" [routerLink]="backLink">← Volver a {{ backLabel }}</a>
      @if (store.selected(); as home) { <app-home-detail [home]="home" [orderLink]="orderLink" /> }
      @else if (store.error()) { <div class="loading card">{{ store.error() }}</div> }
      @else { <div class="loading card">Cargando hogar…</div> }
    </section>`,
})
export class HomePage implements OnInit {
  protected readonly store = inject(ServicedHomesStore);
  private readonly route = inject(ActivatedRoute);
  protected readonly backLink: string = this.route.snapshot.data['back'] ?? '/households';
  protected readonly backLabel: string = this.route.snapshot.data['backLabel'] ?? 'hogares';
  protected readonly orderLink: string | null = this.route.snapshot.data['orderLink'] ?? null;

  ngOnInit(): void { void this.store.select(this.route.snapshot.paramMap.get('homeId') ?? ''); }
}
