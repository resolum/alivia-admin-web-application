import { TechnicalOrder } from './technical-order.entity';

/** A technical order as the backend returns it, with overrides per test. */
export function order(overrides: Partial<TechnicalOrder> = {}): TechnicalOrder {
  return {
    id: 1, code: 'ORD-2026-0001', draftId: 'draft-1', serviceType: 'EVALUATION', incidentId: null, status: 'SCHEDULED',
    date: '2026-11-05', startTime: '08:00:00', endTime: '10:00:00', technicianId: 7, technicianName: 'Carla Mendoza',
    contactName: 'María', contactPhone: '984123456', directions: 'Av. Del Parque Norte 742, San Borja',
    evaluationResult: null, installationResult: null, completionNotes: null, maintenanceReport: null,
    assignments: [{ technicianId: 7, technicianName: 'Carla Mendoza', assignedAt: '2026-11-04T15:00:00Z' }],
    startedAt: null, completedAt: null, installedDevices: [], incident: null,
    ...overrides,
  };
}
