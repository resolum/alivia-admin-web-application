import { Routes } from '@angular/router';
import { requireAdministration, requireSession, requireSubscriptionManager, requireTechnician } from './iam/presentation/guards/require-session.guard';
import { CommercialShell } from './shared/presentation/layout/commercial-shell/commercial-shell';
import { AdminShell } from './shared/presentation/layout/admin-shell/admin-shell';
import { TechnicianShell } from './shared/presentation/layout/technician-shell/technician-shell';
import { ComingSoon } from './shared/presentation/views/coming-soon/coming-soon';

const comingSoon = (path: string, title: string) => ({ path, component: ComingSoon, data: { title } });

export const routes: Routes = [
  { path: 'sign-in', loadChildren: () => import('./iam/presentation/iam.routes').then(module => module.IAM_ROUTES) },
  { path: 'sign-up', loadChildren: () => import('./iam/presentation/iam.routes').then(module => module.SIGN_UP_ROUTES) },
  { path: 'access-denied', canActivate: [requireSession], loadChildren: () => import('./iam/presentation/iam.routes').then(module => module.ACCESS_DENIED_ROUTES) },
  { path: 'activate-account', loadChildren: () => import('./iam/presentation/iam.routes').then(module => module.ACTIVATION_ROUTES) },
  { path: 'forgot-password', loadChildren: () => import('./iam/presentation/iam.routes').then(module => module.FORGOT_PASSWORD_ROUTES) },
  { path: 'reset-password', loadChildren: () => import('./iam/presentation/iam.routes').then(module => module.RESET_PASSWORD_ROUTES) },
  { path: 'technician', component: TechnicianShell, canActivate: [requireSession, requireTechnician], children: [
    { path: '', pathMatch: 'full', redirectTo: 'home' },
    comingSoon('home', 'Inicio'),
    comingSoon('orders', 'Mis órdenes técnicas'),
    comingSoon('calendar', 'Calendario'),
    comingSoon('households', 'Hogares asignados'),
    comingSoon('equipment', 'Equipos y dispositivos'),
    comingSoon('metrics', 'Métricas'),
    { path: '**', redirectTo: 'home' },
  ] },
  { path: 'commercial', component: CommercialShell, canActivate: [requireSession, requireSubscriptionManager], children: [
    { path: '', pathMatch: 'full', redirectTo: 'home' },
    comingSoon('home', 'Inicio'),
    { path: 'plans', loadComponent: () => import('./subscriptions/presentation/views/plans-catalog/plans-catalog').then(module => module.PlansCatalog), data: { title: 'Planes' } },
    { path: 'hiring', loadComponent: () => import('./subscriptions/presentation/views/hiring-board/hiring-board').then(module => module.HiringBoard), data: { title: 'Contrataciones' } },
    comingSoon('subscriptions', 'Suscripciones'),
    comingSoon('metrics', 'Métricas'),
    { path: '**', redirectTo: 'home' },
  ] },
  { path: '', component: AdminShell, canActivate: [requireSession, requireAdministration], children: [
    { path: '', pathMatch: 'full', redirectTo: 'hcm/contracts' },
    { path: 'hcm', loadChildren: () => import('./hcm/presentation/hcm.routes').then(module => module.HCM_ROUTES) },
    { path: 'iam/users', loadChildren: () => import('./iam/presentation/iam.routes').then(module => module.USER_ROLES_ROUTES) },
    { path: '**', redirectTo: 'hcm/contracts' },
  ] },
];
