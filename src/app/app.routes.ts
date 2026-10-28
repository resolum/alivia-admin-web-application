import { Routes } from '@angular/router';
import { requireAdministration, requireSession, requireTechnician } from './iam/presentation/guards/require-session.guard';
import { AdminShell } from './shared/presentation/layout/admin-shell/admin-shell';
import { TechnicianShell } from './shared/presentation/layout/technician-shell/technician-shell';
import { ComingSoon } from './shared/presentation/views/coming-soon/coming-soon';

const comingSoon = (path: string, title: string) => ({ path, component: ComingSoon, data: { title } });

export const routes: Routes = [
  { path: 'sign-in', loadChildren: () => import('./iam/presentation/iam.routes').then(module => module.IAM_ROUTES) },
  { path: 'activate-account', loadChildren: () => import('./iam/presentation/iam.routes').then(module => module.ACTIVATION_ROUTES) },
  { path: 'technician', component: TechnicianShell, canActivate: [requireSession, requireTechnician], children: [
    { path: '', pathMatch: 'full', redirectTo: 'my-day' },
    comingSoon('my-day', 'Mi jornada'),
    comingSoon('orders', 'Mis órdenes de hoy'),
    comingSoon('calendar', 'Calendario'),
    comingSoon('equipment', 'Equipos y bodega móvil'),
    comingSoon('performance', 'Mi rendimiento'),
    comingSoon('profile', 'Mi perfil'),
    { path: '**', redirectTo: 'my-day' },
  ] },
  { path: '', component: AdminShell, canActivate: [requireSession, requireAdministration], children: [
    { path: '', pathMatch: 'full', redirectTo: 'hcm/contracts' },
    { path: 'hcm', loadChildren: () => import('./hcm/presentation/hcm.routes').then(module => module.HCM_ROUTES) },
    { path: '**', redirectTo: 'hcm/contracts' },
  ] },
];
