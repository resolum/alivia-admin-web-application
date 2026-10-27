import { Routes } from '@angular/router';
import { ContractsList } from './views/contracts-list/contracts-list';
import { ContractForm } from './views/contract-form/contract-form';
import { ContractDetail } from './views/contract-detail/contract-detail';
import { WorkSchedulesList } from './views/work-schedules-list/work-schedules-list';

export const HCM_ROUTES: Routes = [
  { path: 'contracts/new', component: ContractForm },
  { path: 'contracts/:employeeId/:contractId/edit', component: ContractForm },
  { path: 'contracts/:employeeId/:contractId', component: ContractDetail },
  { path: 'contracts', component: ContractsList },
  { path: 'work-schedules', component: WorkSchedulesList },
  { path: '', pathMatch: 'full', redirectTo: 'contracts' },
];
