import { Component, computed, input } from '@angular/core';
import { DayOfWeek, dayShortLabel, formatDate, formatHours, LEGAL_WEEKLY_HOURS } from '../../../domain/work-schedule.entity';

/** Live comparison between the hours being configured and the hours agreed in the contract. */
@Component({ selector: 'app-work-schedule-summary', templateUrl: './work-schedule-summary.html', styleUrl: './work-schedule-summary.css' })
export class WorkScheduleSummary {
  readonly contract = input<{ code: string; weeklyHours: number | null } | null>(null);
  readonly configuredHours = input.required<number>();
  readonly workingDays = input.required<DayOfWeek[]>();
  readonly startDate = input('');
  readonly endDate = input<string | null>(null);
  readonly lastModified = input<string | null>(null);
  protected readonly dayShortLabel = dayShortLabel; protected readonly formatDate = formatDate; protected readonly formatHours = formatHours;
  protected readonly legalLimit = LEGAL_WEEKLY_HOURS;
  protected readonly contractedHours = computed(() => this.contract()?.weeklyHours ?? null);
  protected readonly balance = computed(() => {
    const contracted = this.contractedHours();
    return contracted === null ? null : Math.round((this.configuredHours() - contracted) * 10) / 10;
  });
}
