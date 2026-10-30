import { Component, inject, OnInit } from '@angular/core';
import { PlansStore } from '../../../application/plans.store';
import { actuatorLabel, actuatorRange, ActuatorType, formatAmount, Plan, planPresentation, priceLabel } from '../../../domain/plan.entity';
import { PlanDetail } from '../../components/plan-detail/plan-detail';

/** Read-only catalog: shows the subscription managers which plans are offered today. */
@Component({ selector: 'app-plans-catalog', imports: [PlanDetail], templateUrl: './plans-catalog.html', styleUrl: './plans-catalog.css' })
export class PlansCatalog implements OnInit {
  protected readonly store = inject(PlansStore);
  protected readonly presentation = planPresentation; protected readonly priceLabel = priceLabel;
  protected readonly actuatorRange = actuatorRange; protected readonly formatAmount = formatAmount;
  ngOnInit(): void { void this.store.load(); }

  /** "Iluminación S/ 15 · Puerta S/ 25 ..." */
  protected devicePrices(plan: Plan): string {
    return Object.entries(plan.deviceMonthlyPrices)
      .map(([type, amount]) => `${actuatorLabel[type as ActuatorType]} ${formatAmount(amount, plan.currency)}`).join(' · ');
  }
}
