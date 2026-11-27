import { TestBed } from '@angular/core/testing';
import { Device, Edge } from '../domain/device.entity';
import { ResourcesApi } from '../infrastructure/resources.api';
import { ResourcesStore } from './resources.store';

describe('ResourcesStore', () => {
  const api = { listDevices: vi.fn(), listEdges: vi.fn(), registerDevice: vi.fn(), registerEdge: vi.fn() };
  const light: Device = { id: 1, businessId: 1, macAddress: '14:91:82:E3:49:12', alias: 'Luz sala', deviceType: 'LIGHT', status: 'AVAILABLE', installationId: null };
  const door: Device = { id: 2, businessId: 1, macAddress: '5C:02:73:A6:11:80', alias: 'Puerta principal', deviceType: 'DOOR', status: 'BROKEN', installationId: null };
  const edge: Edge = { id: 1, businessId: 1, macAddress: '5C:9B:A6:7A:56:BC', edgeType: 'MICROPHONE_EDGE', status: 'IN_USE', installationId: 4 };
  let store: ResourcesStore;
  beforeEach(() => {
    Object.values(api).forEach(fn => fn.mockReset());
    TestBed.configureTestingModule({ providers: [{ provide: ResourcesApi, useValue: api }] });
    store = TestBed.inject(ResourcesStore);
  });

  it('loads, counts and filters the inventory', async () => {
    api.listDevices.mockResolvedValue([light, door]);
    api.listEdges.mockResolvedValue([edge]);
    await store.load();
    expect(store.counts()).toEqual({ total: 3, available: 1, inUse: 1, attention: 1, edges: 1, devices: 2 });
    expect(store.inCategory('EDGES')).toEqual([edge]);
    expect(store.inCategory('DOOR')).toEqual([door]);
    store.status.set('AVAILABLE');
    expect(store.visibleDevices()).toEqual([light]);
    expect(store.allInCategory('DOOR')).toEqual([door]);
    store.status.set('ALL'); store.search.set('dev-0002');
    expect(store.visibleDevices()).toEqual([door]);
  });

  it('registers devices and edges with a normalized MAC', async () => {
    api.registerDevice.mockResolvedValue({ ...light, installationId: undefined });
    api.registerEdge.mockResolvedValue({ ...edge, installationId: undefined });
    await store.register('LIGHT', '  Luz sala ', '149182e34912');
    await store.register('MICROPHONE_EDGE', '', '5c:9b:a6:7a:56:bc');
    expect(api.registerDevice).toHaveBeenCalledWith('Luz sala', '14:91:82:E3:49:12', 'LIGHT');
    expect(api.registerEdge).toHaveBeenCalledWith('5C:9B:A6:7A:56:BC', 'MICROPHONE_EDGE');
    expect(store.devices()[0].installationId).toBeNull();
    expect(store.edges()).toHaveLength(1);
  });

  it('reports load failures', async () => {
    api.listDevices.mockRejectedValue(new Error('Tu sesión venció. Vuelve a iniciar sesión.'));
    api.listEdges.mockResolvedValue([]);
    await store.load();
    expect(store.error()).toContain('sesión');
    api.listDevices.mockRejectedValue('boom');
    await store.load();
    expect(store.error()).toBe('No se pudo cargar el inventario.');
  });
});
