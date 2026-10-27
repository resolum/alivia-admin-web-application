import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { WorkSchedulesStore } from '../../../application/work-schedules.store';
import {
  dayShortLabel, EmployeeRole, employeeRoleLabel, formatDate, formatHours, initials, WEEK_DAYS, WorkSchedule,
  WorkScheduleStatus, workScheduleStatusLabel,
} from '../../../domain/work-schedule.entity';
import { WorkScheduleDrawer } from '../../components/work-schedule-drawer/work-schedule-drawer';

@Component({ selector: 'app-work-schedules-list', imports: [RouterLink, WorkScheduleDrawer], templateUrl: './work-schedules-list.html', styleUrl: './work-schedules-list.css' })
export class WorkSchedulesList implements OnInit, OnDestroy {
  protected readonly store = inject(WorkSchedulesStore); private readonly router = inject(Router);
  protected readonly weekDays = WEEK_DAYS; protected readonly dayShortLabel = dayShortLabel;
  protected readonly roleLabel = employeeRoleLabel; protected readonly statusLabel = workScheduleStatusLabel;
  protected readonly formatDate = formatDate; protected readonly formatHours = formatHours; protected readonly initials = initials;
  protected readonly openMenu = signal<number | null>(null);
  protected readonly roleFilterLabel = computed(() => { const role = this.store.filters().role; return role === 'ALL' ? '' : employeeRoleLabel[role]; });
  protected readonly statusFilterLabel = computed(() => { const status = this.store.filters().status; return status === 'ALL' ? '' : workScheduleStatusLabel[status]; });
  ngOnInit(): void { void this.store.loadSchedules(); }
  ngOnDestroy(): void { this.store.closeDetail(); }
  protected search(event: Event): void { this.store.setFilters({ search: (event.target as HTMLInputElement).value }); }
  protected role(event: Event): void { this.store.setFilters({ role: (event.target as HTMLSelectElement).value as EmployeeRole | 'ALL' }); }
  protected status(event: Event): void { this.store.setFilters({ status: (event.target as HTMLSelectElement).value as WorkScheduleStatus | 'ALL' }); }
  protected toggleMenu(id: number): void { this.openMenu.update(current => current === id ? null : id); }
  protected showDetail(schedule: WorkSchedule): void { this.openMenu.set(null); this.store.showDetail(schedule); }
  protected edit(schedule: WorkSchedule): void {
    this.openMenu.set(null); this.store.closeDetail();
    void this.router.navigate(['/hcm/work-schedules', schedule.employeeId, schedule.id, 'edit']);
  }
  protected worksOn(schedule: WorkSchedule, day: string): boolean { return schedule.workingDays.includes(day as WorkSchedule['workingDays'][number]); }
  protected isOverloaded(schedule: WorkSchedule): boolean { return schedule.exceedsLegalLimit || schedule.compliance === 'OVER'; }
}
