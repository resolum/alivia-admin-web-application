import { inject, Injectable, signal } from '@angular/core';
import { Plan } from '../domain/plan.entity';
import { PlansApi } from '../infrastructure/plans.api';

@Injectable({ providedIn: 'root' })
export class PlansStore {
  private readonly api = inject(PlansApi);
  private readonly plansState = signal<Plan[]>([]);
  readonly plans = this.plansState.asReadonly();
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly selected = signal<Plan | null>(null);

  async load(): Promise<void> {
    this.loading.set(true); this.error.set(null);
    try { this.plansState.set((await this.api.listPlans()).filter(plan => plan.status === 'ACTIVE')); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'No se pudo cargar el catálogo de planes.'); }
    finally { this.loading.set(false); }
  }

  open(plan: Plan): void { this.selected.set(plan); }
  close(): void { this.selected.set(null); }
}
