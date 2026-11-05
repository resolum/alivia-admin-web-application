import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TechnicalOrdersStore } from '../../../application/technical-orders.store';
import {
  createdAt, formatShortMoment, homeName, orderCode, processLabel, serviceTypeLabel, stageLabel, stageOf, StageTab, TechnicalOrder, TypeFilter, window,
} from '../../../domain/technical-order.entity';

@Component({ selector: 'app-technical-orders-list', imports: [RouterLink], templateUrl: './technical-orders-list.html', styleUrl: './technical-orders-list.css' })
export class TechnicalOrdersList implements OnInit {
  protected readonly store = inject(TechnicalOrdersStore);
  protected readonly typeLabel = serviceTypeLabel;
  protected readonly stageLabel = stageLabel;
  protected readonly code = orderCode;
  protected readonly home = homeName;
  protected readonly window = window;
  protected readonly process = processLabel;
  protected readonly tabs: StageTab[] = ['ALL', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'];
  protected readonly types: Exclude<TypeFilter, 'ALL'>[] = ['MAINTENANCE', 'INSTALLATION', 'EVALUATION'];
  protected readonly typeChip: Record<Exclude<TypeFilter, 'ALL'>, string> = { MAINTENANCE: 'Incidencias', INSTALLATION: 'Instalaciones', EVALUATION: 'Revisiones técnicas' };

  ngOnInit(): void { void this.store.load(); }

  protected stage(order: TechnicalOrder): string { return stageOf(order).toLowerCase().replace('_', '-'); }
  protected created(order: TechnicalOrder): string | null { const value = createdAt(order); return value ? formatShortMoment(value) : null; }
  private readonly tabLabels: Record<StageTab, string> = {
    ALL: 'Todas', PENDING: 'Pendientes', ASSIGNED: 'Asignadas', IN_PROGRESS: 'En proceso', COMPLETED: 'Completadas', CANCELED: 'Canceladas',
  };
  protected tabLabel(tab: StageTab): string { return this.tabLabels[tab]; }
  /** "1–10": the orders of the current page. */
  protected range(): string {
    const from = this.store.page() * this.store.pageSize;
    return `${from + 1}–${Math.min(from + this.store.pageSize, this.store.visible().length)}`;
  }
  protected onSearch(event: Event): void { this.store.setSearch((event.target as HTMLInputElement).value); }
}
