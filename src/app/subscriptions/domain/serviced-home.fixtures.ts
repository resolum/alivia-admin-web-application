import { HomeOrder, ServicedHome } from './serviced-home.entity';

export const homeOrder = (changes: Partial<HomeOrder> = {}): HomeOrder => ({
  id: 1, code: 'ORD-2026-0001', serviceType: 'INSTALLATION', status: 'COMPLETED', date: '2026-11-03', startTime: '09:00',
  endTime: '13:00', technicianName: 'Carla Mendoza', startedAt: '2026-11-03T14:00:00Z', completedAt: '2026-11-03T17:00:00Z',
  incidentCode: null, incidentStatus: null, ...changes,
});

export const servicedHome = (changes: Partial<ServicedHome> = {}): ServicedHome => ({
  id: 'draft-a', code: 'HOG-FFC7E032', contactName: 'María', contactPhone: '984123456',
  directions: 'Av. Los Conquistadores 450, San Isidro, Lima', installedAt: '2026-11-03T17:00:00Z', installedBy: 'Carla Mendoza',
  planCode: 'MINIMUM', planName: 'Plan Base', billingCycle: 'MONTHLY', monthlyAmount: 99, currency: 'PEN', paymentStatus: 'SUCCEEDED',
  rooms: 1, devices: [{ alias: 'Sensor de ventana', macAddress: '00:1A:2B:3C:4D:5E', type: 'SENSOR' }],
  orders: [homeOrder(), homeOrder({ id: 5, code: 'ORD-2026-0005', serviceType: 'MAINTENANCE', status: 'SCHEDULED', startedAt: null, completedAt: null, incidentCode: 'INC-2026-0001', incidentStatus: 'SCHEDULED' })],
  ...changes,
});
