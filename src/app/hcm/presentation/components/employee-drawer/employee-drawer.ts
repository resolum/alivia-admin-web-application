import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { availabilityChecks, availabilityLabel, contractStateLabel, EmployeeRow, employeeStatusLabel } from '../../../domain/employee.entity';
import { employeeRoleLabel, formatDate, formatHours, initials } from '../../../domain/work-schedule.entity';

@Component({ selector: 'app-employee-drawer', imports: [RouterLink], templateUrl: './employee-drawer.html', styleUrl: './employee-drawer.css' })
export class EmployeeDrawer {
  readonly row = input.required<EmployeeRow>();
  readonly closed = output<void>();
  protected readonly roleLabel = employeeRoleLabel; protected readonly statusLabel = employeeStatusLabel;
  protected readonly contractLabel = contractStateLabel; protected readonly availabilityLabel = availabilityLabel;
  protected readonly formatDate = formatDate; protected readonly formatHours = formatHours; protected readonly initials = initials;
  protected readonly fullName = computed(() => `${this.row().employee.firstName} ${this.row().employee.lastName}`);
  protected readonly checks = computed(() => availabilityChecks(this.row()));
  /** A schedule can only be configured inside a pending or active contract. */
  protected readonly canConfigureSchedule = computed(() => this.row().contract !== null && ['ACTIVE', 'EXPIRING', 'PENDING'].includes(this.row().contractState));
  /** 51987654321 -> +51 987 654 321 */
  protected phone(value: string): string {
    const digits = value.replace(/\D/g, '');
    return digits.length === 11 ? `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}` : value;
  }
}
