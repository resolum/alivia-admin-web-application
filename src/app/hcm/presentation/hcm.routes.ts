import { Routes } from '@angular/router';
import { ContractsList } from './views/contracts-list/contracts-list';
import { ContractForm } from './views/contract-form/contract-form';
import { ContractDetail } from './views/contract-detail/contract-detail';
import { EmployeesList } from './views/employees-list/employees-list';
import { EmployeeForm } from './views/employee-form/employee-form';
import { WorkSchedulesList } from './views/work-schedules-list/work-schedules-list';
import { WorkScheduleForm } from './views/work-schedule-form/work-schedule-form';

const HCM = 'Capital humano';
const EMPLOYEES = { label: 'Empleados', link: '/hcm/employees' };
const CONTRACTS = { label: 'Contratos', link: '/hcm/contracts' };
const SCHEDULES = { label: 'Horarios laborales', link: '/hcm/work-schedules' };
/** Trail shown in the admin top bar; the last item is the current page. */
const trail = (...items: (string | { label: string; link: string })[]) => ({ breadcrumb: items.map(item => typeof item === 'string' ? { label: item } : item) });

export const HCM_ROUTES: Routes = [
  { path: 'employees/new', component: EmployeeForm, data: trail(HCM, EMPLOYEES, 'Registrar empleado') },
  { path: 'employees', component: EmployeesList, data: trail(HCM, 'Empleados') },
  { path: 'contracts/new', component: ContractForm, data: trail(HCM, CONTRACTS, 'Registrar contrato') },
  { path: 'contracts/:employeeId/:contractId/edit', component: ContractForm, data: trail(HCM, CONTRACTS, 'Editar contrato') },
  { path: 'contracts/:employeeId/:contractId', component: ContractDetail, data: trail(HCM, CONTRACTS, 'Detalle') },
  { path: 'contracts', component: ContractsList, data: trail(HCM, 'Contratos') },
  { path: 'work-schedules/new', component: WorkScheduleForm, data: trail(HCM, SCHEDULES, 'Registrar horario') },
  { path: 'work-schedules/:employeeId/:workScheduleId/edit', component: WorkScheduleForm, data: trail(HCM, SCHEDULES, 'Editar horario') },
  { path: 'work-schedules', component: WorkSchedulesList, data: trail(HCM, 'Horarios laborales') },
  { path: '', pathMatch: 'full', redirectTo: 'contracts' },
];
