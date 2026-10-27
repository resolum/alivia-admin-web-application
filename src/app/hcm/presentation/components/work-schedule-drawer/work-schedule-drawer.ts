import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  complianceLabel, complianceText, dayLabel, dayShortLabel, employeeRoleLabel, formatDate, formatHours, initials, toInputTime,
  totalHours, WEEK_DAYS, WorkSchedule, workScheduleStatusLabel,
} from '../../../domain/work-schedule.entity';

@Component({ selector: 'app-work-schedule-drawer', imports: [RouterLink], templateUrl: './work-schedule-drawer.html', styleUrl: './work-schedule-drawer.css' })
export class WorkScheduleDrawer {
  readonly schedule = input.required<WorkSchedule>();
  readonly closed = output<void>();
  readonly edit = output<WorkSchedule>();
  protected readonly dayLabel = dayLabel; protected readonly dayShortLabel = dayShortLabel;
  protected readonly roleLabel = employeeRoleLabel; protected readonly statusLabel = workScheduleStatusLabel;
  protected readonly complianceLabel = complianceLabel;
  protected readonly formatDate = formatDate; protected readonly formatHours = formatHours; protected readonly initials = initials;
  protected readonly complianceText = computed(() => complianceText(this.schedule()));
  protected readonly days = computed(() => WEEK_DAYS.map(day => {
    const blocks = this.schedule().shifts.filter(shift => shift.day === day)
      .map(shift => ({ startTime: toInputTime(shift.startTime), endTime: toInputTime(shift.endTime) }));
    return { day, blocks, hours: totalHours(blocks) };
  }));
}
