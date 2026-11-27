import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ResourcesStore, StatusFilter } from '../../../application/resources.store';
import { AssetKind, AssetStatus, CATEGORIES, Category, categoryBySlug, STATUS_LABELS } from '../../../domain/device.entity';
import { AssetCard, KIND_ICONS } from '../../components/asset-card/asset-card';
import { RegisterDeviceDialog } from '../../components/register-device-dialog/register-device-dialog';

const PAGE_SIZES = [9, 18, 36];

/** Every device of one category (or every edge), with its counters, filters and pages. */
@Component({ selector: 'app-device-category', imports: [RouterLink, AssetCard, RegisterDeviceDialog], templateUrl: './device-category.html', styleUrl: './device-category.css' })
export class DeviceCategory implements OnInit {
  protected readonly store = inject(ResourcesStore);
  private readonly router = inject(Router);
  private readonly slug = toSignal(inject(ActivatedRoute).paramMap.pipe(map(params => params.get('category'))));
  protected readonly category = computed<Category>(() => categoryBySlug(this.slug() ?? null) ?? 'MICROPHONE');
  protected readonly info = computed(() => CATEGORIES[this.category()]);
  protected readonly icon = computed(() => KIND_ICONS[(this.category() === 'EDGES' ? 'ACTUATOR_EDGE' : this.category()) as AssetKind]);
  protected readonly initialKind = computed<AssetKind>(() => this.category() === 'EDGES' ? 'MICROPHONE_EDGE' : this.category() as AssetKind);
  protected readonly statusOptions = Object.entries(STATUS_LABELS) as [AssetStatus, string][];
  protected readonly pageSizes = PAGE_SIZES;
  protected readonly registering = signal(false);
  protected readonly page = signal(0);
  protected readonly pageSize = signal(PAGE_SIZES[0]);

  protected readonly counts = computed(() => {
    const all = this.store.allInCategory(this.category());
    const count = (...statuses: AssetStatus[]) => all.filter(asset => statuses.includes(asset.status)).length;
    return { total: all.length, available: count('AVAILABLE'), inUse: count('IN_USE'), attention: count('MAINTENANCE', 'BROKEN') };
  });
  protected readonly filtered = computed(() => this.store.inCategory(this.category()));
  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));
  protected readonly visible = computed(() => {
    const start = Math.min(this.page(), this.pages() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });
  protected readonly range = computed(() => {
    const total = this.filtered().length;
    const start = Math.min(this.page(), this.pages() - 1) * this.pageSize();
    return { from: total ? start + 1 : 0, to: Math.min(start + this.pageSize(), total), total };
  });

  ngOnInit(): void {
    if (categoryBySlug(this.slug() ?? null) === null) { void this.router.navigate(['/devices']); return; }
    this.store.search.set(''); this.store.status.set('ALL');
    if (this.store.counts().total === 0) void this.store.load();
  }

  protected onSearch(event: Event): void { this.store.search.set((event.target as HTMLInputElement).value); this.page.set(0); }
  protected onStatus(event: Event): void { this.store.status.set((event.target as HTMLSelectElement).value as StatusFilter); this.page.set(0); }
  protected onPageSize(event: Event): void { this.pageSize.set(Number((event.target as HTMLSelectElement).value)); this.page.set(0); }
  protected pageNumbers(): number[] { return Array.from({ length: this.pages() }, (_, index) => index); }
}
