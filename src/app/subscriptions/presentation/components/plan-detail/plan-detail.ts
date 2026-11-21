import { Component, computed, input, output } from '@angular/core';
import { actuatorLabel, actuatorRange, ActuatorType, formatAmount, Plan, planPresentation, priceLabel } from '../../../domain/plan.entity';

/** Side panel with every commercial condition of a plan. */
@Component({ selector: 'app-plan-detail', templateUrl: './plan-detail.html', styleUrl: './plan-detail.css' })
export class PlanDetail {
  readonly plan = input.required<Plan>();
  readonly closed = output<void>();
  protected readonly presentation = planPresentation; protected readonly formatAmount = formatAmount;
  protected readonly price = computed(() => priceLabel(this.plan()));
  protected readonly actuators = computed(() => actuatorRange(this.plan()));
  protected readonly devicePrices = computed(() => Object.entries(this.plan().deviceMonthlyPrices)
    .map(([type, amount]) => ({ label: actuatorLabel[type as ActuatorType], amount: formatAmount(amount, this.plan().currency) })));
}
