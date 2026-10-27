import { Routes } from '@angular/router';
import { AdminShell } from './shared/presentation/layout/admin-shell/admin-shell';

export const routes: Routes = [{ path: '', component: AdminShell, children: [
  { path: '', pathMatch: 'full', redirectTo: 'hcm/contracts' },
  { path: 'hcm', loadChildren: () => import('./hcm/presentation/hcm.routes').then(module => module.HCM_ROUTES) },
  { path: '**', redirectTo: 'hcm/contracts' },
] }];
