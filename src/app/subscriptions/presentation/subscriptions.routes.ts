import { Routes } from '@angular/router';
import { PlansCatalog } from './views/plans-catalog/plans-catalog';
import { HiringBoard } from './views/hiring-board/hiring-board';
import { SubscriptionsList } from './views/subscriptions-list/subscriptions-list';
import { SubscriptionDetail } from './views/subscription-detail/subscription-detail';
import { HomesList } from './views/homes-list/homes-list';
import { HomePage } from './views/home-page/home-page';

const SECTION = 'Gestión comercial';
const SUBSCRIPTIONS = { label: 'Suscripciones', link: '/subscriptions' };
/** Trail shown in the admin top bar; the last item is the current page. */
const trail = (...items: (string | { label: string; link: string })[]) => ({ breadcrumb: items.map(item => typeof item === 'string' ? { label: item } : item) });

/** Gestión comercial of the general administration: the plan catalog, the hiring board and the subscriptions. */
export const PLANS_ROUTES: Routes = [{ path: '', component: PlansCatalog, data: trail(SECTION, 'Planes') }];
export const HIRING_ROUTES: Routes = [{ path: '', component: HiringBoard, data: trail(SECTION, 'Contrataciones') }];
export const SUBSCRIPTIONS_ROUTES: Routes = [
  { path: ':subscriptionId', component: SubscriptionDetail, data: { ...trail(SECTION, SUBSCRIPTIONS, 'Detalle'), back: '/subscriptions' } },
  { path: '', component: SubscriptionsList, data: trail(SECTION, 'Suscripciones') },
];

/** Subscription management exposed in the subscription manager's commercial portal. */
export const COMMERCIAL_SUBSCRIPTIONS_ROUTES: Routes = [
  { path: ':subscriptionId', component: SubscriptionDetail, data: { title: 'Detalle de suscripción', back: '/commercial/subscriptions' } },
  { path: '', component: SubscriptionsList, data: { title: 'Suscripciones' } },
];

const HOMES = { label: 'Hogares', link: '/households' };
/** Clientes y servicio > Hogares of the administration: every home in service. */
export const HOMES_ROUTES: Routes = [
  { path: ':homeId', component: HomePage, data: { ...trail('Clientes y servicio', HOMES, 'Detalle'), back: '/households', backLabel: 'hogares', orderLink: '/operations' } },
  { path: '', component: HomesList, data: { ...trail('Clientes y servicio', 'Hogares'), scope: 'all' } },
];

/** Mis hogares of the technician portal: the homes in service the technician served. */
export const MY_HOMES_ROUTES: Routes = [
  { path: ':homeId', component: HomePage, data: { back: '/technician/households', backLabel: 'mis hogares', orderLink: '/technician/orders', title: 'Hogar' } },
  { path: '', component: HomesList, data: { scope: 'mine', title: 'Mis hogares' } },
];
