import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmployeesStore } from '../../../application/employees.store';
import { EmployeeDrawer } from '../../components/employee-drawer/employee-drawer';
import { availabilityLabel, contractStateLabel, EmployeeRow } from '../../../domain/employee.entity';
import { EmployeeRole, employeeRoleLabel, initials } from '../../../domain/work-schedule.entity';

@Component({ selector: 'app-employees-list', imports: [RouterLink, EmployeeDrawer], templateUrl: './employees-list.html', styleUrl: './employees-list.css' })
export class EmployeesList implements OnInit {
  protected readonly store = inject(EmployeesStore);
  protected readonly roleLabel = employeeRoleLabel; protected readonly contractLabel = contractStateLabel;
  protected readonly availabilityLabel = availabilityLabel; protected readonly initials = initials;
  protected readonly openMenu = signal<number | null>(null);
  protected readonly selected = signal<EmployeeRow | null>(null);
  ngOnInit(): void { void this.store.load(); }
  protected search(event: Event): void { this.store.setFilters({ search: (event.target as HTMLInputElement).value }); }
  protected role(role: EmployeeRole | 'ALL'): void { this.store.setFilters({ role }); }
  protected toggleMenu(id: number): void { this.openMenu.update(current => current === id ? null : id); }
  /** A schedule can only be configured inside a pending or active contract. */
  protected canConfigureSchedule(row: EmployeeRow): boolean {
    return row.contract !== null && ['ACTIVE', 'EXPIRING', 'PENDING'].includes(row.contractState);
  }
}
