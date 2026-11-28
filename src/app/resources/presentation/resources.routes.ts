import { Routes } from '@angular/router';
import { DeviceCategory } from './views/device-category/device-category';
import { DevicesInventory } from './views/devices-inventory/devices-inventory';

const SECTION = 'Clientes y servicio';
const DEVICES = { label: 'Dispositivos', link: '/devices' };
const trail = (...items: (string | { label: string; link: string })[]) => ({ breadcrumb: items.map(item => typeof item === 'string' ? { label: item } : item) });

/** Clientes y servicio > Dispositivos of the administration: the device and edge inventory of the business. */
export const DEVICES_ROUTES: Routes = [
  { path: ':category', component: DeviceCategory, data: { ...trail(SECTION, DEVICES, 'Categoría'), back: '/devices' } },
  { path: '', component: DevicesInventory, data: trail(SECTION, 'Dispositivos') },
];
