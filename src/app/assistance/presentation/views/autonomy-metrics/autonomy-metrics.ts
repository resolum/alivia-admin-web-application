import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { limaToday } from '../../../../operations/domain/technical-order.entity';
import {
  AutonomyMetrics as Metrics, DEVICE_TYPES, DeviceType, deviceTypeLabel, RESULTS, resultLabel, summarize,
} from '../../../domain/autonomy-metrics.entity';
import { limaInstant } from '../../../domain/care.entity';
import { AssistanceApi } from '../../../infrastructure/assistance.api';

const addDays = (date: string, days: number) => { const value = new Date(`${date}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); };
const timeFormat = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Lima' });
const sourceLabel = { VOICE: 'Voz', APP: 'App', SWITCH: 'Interruptor' } as const;

/** Actions the assisted person asked for and how they ended, to follow their autonomy (US-41). */
@Component({ selector: 'app-autonomy-metrics', imports: [FormsModule], templateUrl: './autonomy-metrics.html', styleUrl: './autonomy-metrics.css' })
export class AutonomyMetrics implements OnInit {
  private readonly api = inject(AssistanceApi);
  protected readonly from = signal(addDays(limaToday(), -6));
  protected readonly to = signal(limaToday());
  protected readonly deviceType = signal<'ALL' | DeviceType>('ALL');
  protected readonly deviceId = signal<'ALL' | number>('ALL');
  protected readonly metrics = signal<Metrics | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly deviceTypes = DEVICE_TYPES;
  protected readonly typeLabel = deviceTypeLabel;
  protected readonly results = RESULTS;
  protected readonly resultLabel = resultLabel;
  protected readonly sourceLabel = sourceLabel;

  /** Devices with events in the period, narrowed by the chosen type. */
  protected readonly devices = computed(() => {
    const actions = (this.metrics()?.actions ?? []).filter(action => this.deviceType() === 'ALL' || action.deviceType === this.deviceType());
    return [...new Map(actions.map(action => [action.deviceId, action.deviceName])).entries()].map(([id, name]) => ({ id, name }));
  });

  protected readonly actions = computed(() => (this.metrics()?.actions ?? [])
    .filter(action => this.deviceType() === 'ALL' || action.deviceType === this.deviceType())
    .filter(action => this.deviceId() === 'ALL' || action.deviceId === this.deviceId())
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)));

  protected readonly summary = computed(() => summarize(this.actions()));

  ngOnInit(): void { void this.load(); }

  protected async load(): Promise<void> {
    this.loading.set(true); this.error.set(null);
    try { this.metrics.set(await this.api.autonomyMetrics(this.from(), this.to())); }
    catch (error) {
      const status = (error as { status?: number }).status;
      this.error.set(status === 404 ? 'Las métricas de autonomía aún no están disponibles en el servicio de Alivia.' : error instanceof Error ? error.message : 'No se pudo consultar las métricas.');
    } finally { this.loading.set(false); }
  }

  protected setType(value: 'ALL' | DeviceType): void { this.deviceType.set(value); this.deviceId.set('ALL'); }
  protected when(value: string | null): string { return value ? timeFormat.format(limaInstant(value)) : 'nunca'; }
}
