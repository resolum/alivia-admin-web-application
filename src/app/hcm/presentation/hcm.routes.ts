import { Routes } from '@angular/router';
import { ContractsList } from './views/contracts-list/contracts-list';
import { ContractDetail } from './views/contract-detail/contract-detail';

export const HCM_ROUTES: Routes = [
  { path: 'contracts/:employeeId/:contractId', component: ContractDetail },
  { path: 'contracts', component: ContractsList },
  { path: '', pathMatch: 'full', redirectTo: 'contracts' },
];
