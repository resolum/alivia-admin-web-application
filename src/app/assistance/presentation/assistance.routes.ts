import { Routes } from '@angular/router';

/** Care portal of caregivers and relatives: agenda (US-36), medication (US-37) and autonomy (US-41). */
export const CARE_ROUTES: Routes = [
  { path: 'agenda', loadComponent: () => import('./views/care-agenda/care-agenda').then(module => module.CareAgenda), data: { title: 'Mi agenda' } },
  { path: 'medication', loadComponent: () => import('./views/medication-log/medication-log').then(module => module.MedicationLog), data: { title: 'Medicación' } },
  { path: 'autonomy', loadComponent: () => import('./views/autonomy-metrics/autonomy-metrics').then(module => module.AutonomyMetrics), data: { title: 'Autonomía' } },
  { path: '**', redirectTo: 'agenda' },
];
