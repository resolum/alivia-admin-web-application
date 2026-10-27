import { Routes } from '@angular/router';
import { requireSession } from './iam/presentation/guards/require-session.guard';
import { AdminShell } from './shared/presentation/layout/admin-shell/admin-shell';

export const routes: Routes = [
  { path: 'sign-in', loadChildren: () => import('./iam/presentation/iam.routes').then(module => module.IAM_ROUTES) },
  { path: '', component: AdminShell, canActivate: [requireSession], children: [
    { path: '', pathMatch: 'full', redirectTo: 'hcm/contracts' },
    { path: 'hcm', loadChildren: () => import('./hcm/presentation/hcm.routes').then(module => module.HCM_ROUTES) },
    { path: '**', redirectTo: 'hcm/contracts' },
  ] },
];
