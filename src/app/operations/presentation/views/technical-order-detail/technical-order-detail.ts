import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TechnicalOrdersStore } from '../../../application/technical-orders.store';
import {
  createdAt, deviceTypeOf, formatDay, formatMoment, homeName, mapSearchUrl, orderCode, problemOf, processLabel, serviceTypeLabel, stageOf,
  TechnicalOrder, window,
} from '../../../domain/technical-order.entity';

interface Step { label: string; at: string | null; done: boolean; }

@Component({ selector: 'app-technical-order-detail', imports: [RouterLink], templateUrl: './technical-order-detail.html', styleUrl: './technical-order-detail.css' })
export class TechnicalOrderDetail implements OnInit {
  protected readonly store = inject(TechnicalOrdersStore);
  private readonly route = inject(ActivatedRoute);
  protected readonly backLink: string = this.route.snapshot.data['back'] ?? '/operations';
  protected readonly backLabel: string = this.route.snapshot.data['backLabel'] ?? 'órdenes técnicas';
  protected readonly typeLabel = serviceTypeLabel;
  protected readonly code = orderCode;
  protected readonly home = homeName;
  protected readonly window = window;
  protected readonly day = formatDay;
  protected readonly moment = formatMoment;
  protected readonly process = processLabel;
  protected readonly problem = problemOf;
  protected readonly deviceType = deviceTypeOf;

  protected readonly manage = this.route.snapshot.data['manage'] === true;
  protected readonly technicianId = signal('');
  protected readonly note = signal('');
  /** Reassignment form, open with the reason being typed. */
  protected readonly reason = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly message = signal('');

  ngOnInit(): void {
    void this.store.select(Number(this.route.snapshot.paramMap.get('orderId')));
    if (this.manage) this.store.loadTechnicians().catch(() => this.message.set('No se pudo consultar los técnicos del negocio.'));
  }

  /** The technician can change while the visit has not started. */
  protected assignable(order: TechnicalOrder): boolean {
    return this.manage && (stageOf(order) === 'PENDING' || stageOf(order) === 'ASSIGNED');
  }

  protected value(event: Event): string { return (event.target as HTMLInputElement).value; }

  protected async assign(order: TechnicalOrder, event: Event): Promise<void> {
    event.preventDefault();
    if (!this.technicianId()) { this.message.set('Elige el técnico que atenderá la visita.'); return; }
    await this.run(() => this.store.assignTechnician(order.id, Number(this.technicianId()), this.note().trim()));
    if (!this.message()) { this.technicianId.set(''); this.note.set(''); }
  }

  protected async reassign(order: TechnicalOrder, event: Event): Promise<void> {
    event.preventDefault();
    const reason = this.reason()?.trim();
    if (!reason) { this.message.set('Indica por qué el técnico actual ya no puede atender la visita.'); return; }
    await this.run(() => this.store.reassign(order.id, reason));
    if (!this.message()) this.reason.set(null);
  }

  private async run(change: () => Promise<void>): Promise<void> {
    this.saving.set(true); this.message.set('');
    try { await change(); }
    catch (error) { this.message.set(error instanceof Error ? error.message : 'No se pudo actualizar la orden técnica.'); }
    finally { this.saving.set(false); }
  }

  protected stage(order: TechnicalOrder): string { return stageOf(order).toLowerCase().replace('_', '-'); }

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
