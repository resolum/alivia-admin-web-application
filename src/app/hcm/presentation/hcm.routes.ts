import { Routes } from '@angular/router';
import { ContractsList } from './views/contracts-list/contracts-list';
import { ContractForm } from './views/contract-form/contract-form';
import { ContractDetail } from './views/contract-detail/contract-detail';
import { WorkSchedulesList } from './views/work-schedules-list/work-schedules-list';
import { WorkScheduleForm } from './views/work-schedule-form/work-schedule-form';

export const HCM_ROUTES: Routes = [
  { path: 'contracts/new', component: ContractForm },
  { path: 'contracts/:employeeId/:contractId/edit', component: ContractForm },
  { path: 'contracts/:employeeId/:contractId', component: ContractDetail },
  { path: 'contracts', component: ContractsList },
  { path: 'work-schedules/new', component: WorkScheduleForm },
  { path: 'work-schedules/:employeeId/:workScheduleId/edit', component: WorkScheduleForm },
  { path: 'work-schedules', component: WorkSchedulesList },
  { path: '', pathMatch: 'full', redirectTo: 'contracts' },
];
