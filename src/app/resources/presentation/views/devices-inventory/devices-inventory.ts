import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ResourcesStore, StatusFilter } from '../../../application/resources.store';
import { AssetStatus, CATEGORIES, Category, CATEGORY_ORDER, STATUS_LABELS } from '../../../domain/device.entity';
import { AssetCard, CATEGORY_KINDS, KIND_ICONS, trackItem } from '../../components/asset-card/asset-card';
import { RegisterDeviceDialog } from '../../components/register-device-dialog/register-device-dialog';

type Scope = 'ALL' | 'EDGES' | 'DEVICES';
/** Cards a device category shows before "Ver todos". */
const PREVIEW = 3;

/** Dispositivos: the inventory of the business by category, with its counters and the registration dialog. */
@Component({ selector: 'app-devices-inventory', imports: [RouterLink, AssetCard, RegisterDeviceDialog], templateUrl: './devices-inventory.html', styleUrl: './devices-inventory.css' })
export class DevicesInventory implements OnInit {
  protected readonly store = inject(ResourcesStore);
  protected readonly scope = signal<Scope>('ALL');
  protected readonly registering = signal(false);
  protected readonly track = trackItem;
  protected readonly statusOptions = Object.entries(STATUS_LABELS) as [AssetStatus, string][];
  protected readonly categories = CATEGORIES;

  protected readonly sections = computed(() => CATEGORY_ORDER
    .filter(category => this.scope() === 'ALL' || (this.scope() === 'EDGES') === (category === 'EDGES'))
    .map(category => {
      const items = this.store.inCategory(category);
      return {
        category, info: CATEGORIES[category], icon: this.iconOf(category), total: items.length,
        items: category === 'EDGES' ? items : items.slice(0, PREVIEW),
      };
    })
    .filter(section => section.total > 0));

  ngOnInit(): void {
    this.store.search.set(''); this.store.status.set('ALL');
    void this.store.load();
  }

  protected onSearch(event: Event): void { this.store.search.set((event.target as HTMLInputElement).value); }
  protected onStatus(event: Event): void { this.store.status.set((event.target as HTMLSelectElement).value as StatusFilter); }
  protected onRegistered(): void { this.registering.set(false); }
  protected iconOf(category: Category): string { return KIND_ICONS[CATEGORY_KINDS[category]]; }
}
