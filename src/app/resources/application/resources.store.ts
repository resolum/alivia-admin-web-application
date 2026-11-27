import { computed, inject, Injectable, signal } from '@angular/core';
import {
  ActuatorModule, AssetKind, AssetStatus, Category, CHANNEL_LABELS, channelMacs, Device, deviceCode, Edge, edgeAlias, edgeCode,
  groupModules, isEdgeKind, matchesAsset, moduleCode, normalizeMac,
} from '../domain/device.entity';
import { ResourcesApi } from '../infrastructure/resources.api';

export type StatusFilter = AssetStatus | 'ALL';
export type InventoryItem = Device | Edge | ActuatorModule;

/** Device and edge inventory of the business, with its counters, filters and registration. */
@Injectable({ providedIn: 'root' })
export class ResourcesStore {
  private readonly api = inject(ResourcesApi);
  private readonly devicesState = signal<Device[]>([]);
  private readonly edgesState = signal<Edge[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly status = signal<StatusFilter>('ALL');
  readonly devices = this.devicesState.asReadonly();
  readonly edges = this.edgesState.asReadonly();
  readonly microphones = computed(() => this.devicesState().filter(device => device.deviceType === 'MICROPHONE'));
  readonly modules = computed(() => groupModules(this.devicesState()));

  /** Counts physical units: each edge, each microphone and each actuator ESP32 once. */
  readonly counts = computed(() => {
    const statuses = [...this.edgesState(), ...this.microphones(), ...this.modules()].map(item => item.status);
    const count = (...wanted: AssetStatus[]) => statuses.filter(value => wanted.includes(value)).length;
    return {
      total: statuses.length, available: count('AVAILABLE'), inUse: count('IN_USE'), attention: count('MAINTENANCE', 'BROKEN'),
      edges: this.edgesState().length, devices: this.microphones().length + this.modules().length,
    };
  });

  /** Every item of a category, without filters: for its counters. */
  allInCategory(category: Category): InventoryItem[] {
    if (category === 'EDGES') return this.edgesState();
    return category === 'MICROPHONE' ? this.microphones() : this.modules();
  }

  /** Items of a category that pass the status filter and the search. */
  inCategory(category: Category): InventoryItem[] {
    return this.allInCategory(category).filter(item =>
      (this.status() === 'ALL' || this.status() === item.status) && matchesAsset(searchableValues(item), this.search()));
  }

  async load(): Promise<void> {
    this.loading.set(true); this.error.set(null);
    try {
      const [devices, edges] = await Promise.all([this.api.listDevices(), this.api.listEdges()]);
      this.devicesState.set(devices); this.edgesState.set(edges);
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudo cargar el inventario.'); }
    finally { this.loading.set(false); }
  }

  /**
   * Registers an edge, a microphone, or an actuator module (its four servo devices, with the MACs the firmware derives
   * from the ESP32's MAC base). It throws the backend's reason so the dialog can show it.
   */
  async register(kind: AssetKind, alias: string, macAddress: string): Promise<void> {
    const mac = normalizeMac(macAddress);
    if (isEdgeKind(kind)) {
      const edge = await this.api.registerEdge(mac, kind);
      this.edgesState.update(edges => [...edges, { ...edge, installationId: null }]);
    } else if (kind === 'MICROPHONE') {
      await this.addDevice(alias.trim(), mac, 'MICROPHONE');
    } else {
      let done = 0;
      try {
        for (const channel of channelMacs(mac)) {
          await this.addDevice(`${alias.trim()} · ${CHANNEL_LABELS[channel.type]}`, channel.mac, channel.type);
          done++;
        }
      } catch (error) {
        if (done === 0) throw error;
        const reason = error instanceof Error ? error.message : '';
        throw new Error(`Se registraron ${done} de 4 canales del módulo. ${reason}`.trim());
      }
    }
  }

  private async addDevice(alias: string, mac: string, type: Device['deviceType']): Promise<void> {
    const device = await this.api.registerDevice(alias, mac, type);
    this.devicesState.update(devices => [...devices, { ...device, installationId: null }]);
  }
}

function searchableValues(item: InventoryItem): string[] {
  if ('edgeType' in item) return [item.macAddress, edgeCode(item), edgeAlias(item)];
  if ('channels' in item) return [item.alias, moduleCode(item), ...item.channels.flatMap(channel => [channel.macAddress, deviceCode(channel)])];
  return [item.macAddress, deviceCode(item), item.alias];
}
