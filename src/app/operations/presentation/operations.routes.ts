import { Routes } from '@angular/router';
import { TechnicalOrdersList } from './views/technical-orders-list/technical-orders-list';
import { TechnicalOrderDetail } from './views/technical-order-detail/technical-order-detail';
import { MyOrders } from './views/my-orders/my-orders';
import { MyCalendar } from './views/my-calendar/my-calendar';

const SECTION = 'Operaciones técnicas';
const ORDERS = { label: 'Órdenes técnicas', link: '/operations' };
/** Trail shown in the admin top bar; the last item is the current page. */
const trail = (...items: (string | { label: string; link: string })[]) => ({ breadcrumb: items.map(item => typeof item === 'string' ? { label: item } : item) });

export const OPERATIONS_ROUTES: Routes = [
  { path: ':orderId', component: TechnicalOrderDetail, data: trail(SECTION, ORDERS, 'Detalle') },
  { path: '', component: TechnicalOrdersList, data: trail(SECTION, 'Órdenes técnicas') },
];

/** Mis órdenes of the technician portal: read only; the visit is attended from the mobile app. */
export const MY_ORDERS_ROUTES: Routes = [
  { path: ':orderId', component: TechnicalOrderDetail, data: { title: 'Detalle de orden', back: '/technician/orders', backLabel: 'mis órdenes' } },
  { path: '', component: MyOrders, data: { title: 'Mis órdenes técnicas' } },
];

/** Calendario of the technician portal: the same orders laid out by schedule. */
export const MY_CALENDAR_ROUTES: Routes = [{ path: '', component: MyCalendar, data: { title: 'Calendario' } }];
