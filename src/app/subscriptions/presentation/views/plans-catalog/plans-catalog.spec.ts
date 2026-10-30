import { TestBed } from '@angular/core/testing';
import { PlansStore } from '../../../application/plans.store';
import { PlansApi } from '../../../infrastructure/plans.api';
import { basePlan, customPlan } from '../../../domain/plan.entity.spec';
import { PlansCatalog } from './plans-catalog';

describe('PlansCatalog', () => {
  it('shows the active plans and opens their detail', async () => {
    const api = { listPlans: vi.fn().mockResolvedValue([basePlan, customPlan, { ...basePlan, id: 3, status: 'INACTIVE' }]) };
    TestBed.configureTestingModule({ providers: [{ provide: PlansApi, useValue: api }] });
    const fixture = TestBed.createComponent(PlansCatalog);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.plan')).toHaveLength(2);
    expect(element.textContent).toContain('Desde');
    expect(element.textContent).toContain('Iluminación S/ 15 · Puerta S/ 25');
    expect(element.textContent).toContain('Evaluación técnica sin costo');

    element.querySelectorAll<HTMLButtonElement>('.plan .button')[1]!.click();
    fixture.detectChanges();
    expect(element.querySelector('app-plan-detail')!.textContent).toContain('Habitación adicional');
    element.querySelector<HTMLButtonElement>('app-plan-detail .close')!.click();
    fixture.detectChanges();
    expect(element.querySelector('app-plan-detail')).toBeNull();
  });

  it('reports a catalog that cannot be loaded', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PlansApi, useValue: { listPlans: vi.fn().mockRejectedValue(new Error('caído')) } }] });
    const store = TestBed.inject(PlansStore);
    await store.load();
    expect(store.error()).toBe('caído');
  });
});
