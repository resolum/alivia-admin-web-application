import { computed, inject, Injectable, signal } from '@angular/core';
import {
  AssetKind, AssetStatus, Category, Device, deviceCode, Edge, edgeAlias, edgeCode, isEdgeKind, matchesAsset, normalizeMac,
} from '../domain/device.entity';
import { ResourcesApi } from '../infrastructure/resources.api';

export type StatusFilter = AssetStatus | 'ALL';

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

  readonly counts = computed(() => {
    const statuses = [...this.devicesState(), ...this.edgesState()].map(asset => asset.status);
    const count = (status: AssetStatus) => statuses.filter(value => value === status).length;
    return {
      total: statuses.length, available: count('AVAILABLE'), inUse: count('IN_USE'),
      attention: count('MAINTENANCE') + count('BROKEN'), edges: this.edgesState().length, devices: this.devicesState().length,
    };
  });

  readonly visibleEdges = computed(() => this.edgesState().filter(edge =>
    this.passesStatus(edge.status) && matchesAsset(edge, edgeCode(edge), edgeAlias(edge), this.search())));
  readonly visibleDevices = computed(() => this.devicesState().filter(device =>
    this.passesStatus(device.status) && matchesAsset(device, deviceCode(device), device.alias, this.search())));

  /** Visible devices of one type, or every visible edge. */
  inCategory(category: Category): (Device | Edge)[] {
    return category === 'EDGES' ? this.visibleEdges() : this.visibleDevices().filter(device => device.deviceType === category);
  }

  /** Every device of one type, or every edge, without filters: for the counters of a category. */
  allInCategory(category: Category): (Device | Edge)[] {
    return category === 'EDGES' ? this.edgesState() : this.devicesState().filter(device => device.deviceType === category);
  }

  async load(): Promise<void> {
    this.loading.set(true); this.error.set(null);
    try {
      const [devices, edges] = await Promise.all([this.api.listDevices(), this.api.listEdges()]);
      this.devicesState.set(devices); this.edgesState.set(edges);
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudo cargar el inventario.'); }
    finally { this.loading.set(false); }
  }

  /** Registers a device (with its alias) or an edge; it throws the backend's reason so the dialog can show it. */
  async register(kind: AssetKind, alias: string, macAddress: string): Promise<void> {
    const mac = normalizeMac(macAddress);
    if (isEdgeKind(kind)) {
      const edge = await this.api.registerEdge(mac, kind);
      this.edgesState.update(edges => [...edges, { ...edge, installationId: null }]);
    } else {
      const device = await this.api.registerDevice(alias.trim(), mac, kind);
      this.devicesState.update(devices => [...devices, { ...device, installationId: null }]);
    }
  }

  private passesStatus(status: AssetStatus): boolean { return this.status() === 'ALL' || this.status() === status; }
}
