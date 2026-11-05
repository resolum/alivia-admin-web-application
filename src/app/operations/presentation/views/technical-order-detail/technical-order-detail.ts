import { Component, inject, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TechnicalOrdersStore } from '../../../application/technical-orders.store';
import {
  createdAt, deviceTypeOf, formatDay, formatMoment, homeName, mapEmbedUrl, mapSearchUrl, orderCode, problemOf, processLabel, serviceTypeLabel, stageOf,
  TechnicalOrder, window,
} from '../../../domain/technical-order.entity';

interface Step { label: string; at: string | null; done: boolean; }

@Component({ selector: 'app-technical-order-detail', imports: [RouterLink], templateUrl: './technical-order-detail.html', styleUrl: './technical-order-detail.css' })
export class TechnicalOrderDetail implements OnInit {
  protected readonly store = inject(TechnicalOrdersStore);
  private readonly route = inject(ActivatedRoute);
  protected readonly backLink: string = this.route.snapshot.data['back'] ?? '/operations';
  protected readonly backLabel: string = this.route.snapshot.data['backLabel'] ?? 'órdenes técnicas';
  private readonly sanitizer = inject(DomSanitizer);
  private readonly embeds = new Map<string, SafeResourceUrl>();
  protected readonly typeLabel = serviceTypeLabel;
  protected readonly code = orderCode;
  protected readonly home = homeName;
  protected readonly window = window;
  protected readonly day = formatDay;
  protected readonly moment = formatMoment;
  protected readonly process = processLabel;
  protected readonly problem = problemOf;
  protected readonly deviceType = deviceTypeOf;

  ngOnInit(): void { void this.store.select(Number(this.route.snapshot.paramMap.get('orderId'))); }

  protected stage(order: TechnicalOrder): string { return stageOf(order).toLowerCase().replace('_', '-'); }

  /**
   * Embedded Google Maps of the home. Only this URL, built from the order's address, is trusted as a frame source;
   * it is cached so the frame does not reload on every change detection.
   */
  protected mapEmbed(directions: string): SafeResourceUrl {
    let url = this.embeds.get(directions);
    if (!url) {
      url = this.sanitizer.bypassSecurityTrustResourceUrl(mapEmbedUrl(directions));
      this.embeds.set(directions, url);
    }
    return url;
  }

  protected mapSearch(directions: string): string { return mapSearchUrl(directions); }

  /** What the visit is about, in the words of the request. */
  protected description(order: TechnicalOrder): string {
    switch (order.serviceType) {
      case 'EVALUATION':
        return 'Evaluación técnica de compatibilidad: el técnico revisa en el hogar que la configuración contratada pueda instalarse.';
      case 'INSTALLATION':
        return 'Instalación y configuración de los dispositivos contratados en el hogar.';
      default:
        return order.incident?.description || 'Atención de la incidencia reportada por la familia.';
    }
  }

  /** Opened, started at the home and closed, with the time of each step. */
  protected steps(order: TechnicalOrder): Step[] {
    return [
      { label: 'Orden creada', at: createdAt(order), done: true },
      { label: 'Atención iniciada en el hogar', at: order.startedAt, done: order.startedAt !== null },
      { label: stageOf(order) === 'CANCELED' ? 'Orden cancelada' : 'Orden completada', at: order.completedAt, done: order.completedAt !== null || stageOf(order) === 'COMPLETED' },
    ];
  }
}
