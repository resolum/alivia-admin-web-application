import { TestBed } from '@angular/core/testing';
import { Device, Edge } from '../domain/device.entity';
import { ResourcesApi } from '../infrastructure/resources.api';
import { ResourcesStore } from './resources.store';

describe('ResourcesStore', () => {
  const api = { listDevices: vi.fn(), listEdges: vi.fn(), registerDevice: vi.fn(), registerEdge: vi.fn() };
  const microphone: Device = { id: 1, businessId: 1, macAddress: '00:70:07:82:D8:68', alias: 'Micrófono sala', deviceType: 'MICROPHONE', status: 'AVAILABLE', installationId: null };
  const door: Device = { id: 2, businessId: 1, macAddress: '02:70:07:82:D8:11', alias: 'Actuadores · Puerta', deviceType: 'DOOR', status: 'BROKEN', installationId: null };
  const light: Device = { id: 3, businessId: 1, macAddress: '02:70:07:82:D8:14', alias: 'Actuadores · Luz', deviceType: 'LIGHT', status: 'AVAILABLE', installationId: null };
  const edge: Edge = { id: 1, businessId: 1, macAddress: '5C:9B:A6:7A:56:BC', edgeType: 'MICROPHONE_EDGE', status: 'IN_USE', installationId: 4 };
  let store: ResourcesStore;
  beforeEach(() => {
    Object.values(api).forEach(fn => fn.mockReset());
    TestBed.configureTestingModule({ providers: [{ provide: ResourcesApi, useValue: api }] });
    store = TestBed.inject(ResourcesStore);
  });

  it('loads, counts and filters the inventory, with the servos of one ESP32 as one module', async () => {
    api.listDevices.mockResolvedValue([microphone, door, light]);
    api.listEdges.mockResolvedValue([edge]);
    await store.load();
    expect(store.counts()).toEqual({ total: 3, available: 1, inUse: 1, attention: 1, edges: 1, devices: 2 });
    expect(store.inCategory('EDGES')).toEqual([edge]);
    expect(store.inCategory('MICROPHONE')).toEqual([microphone]);
    expect(store.allInCategory('ACTUATORS')).toHaveLength(1);
    store.status.set('AVAILABLE');
    expect(store.inCategory('ACTUATORS')).toEqual([]);
    store.status.set('ALL'); store.search.set('d8:14');
    expect(store.inCategory('ACTUATORS')).toHaveLength(1);
    expect(store.inCategory('MICROPHONE')).toEqual([]);
    store.search.set('voz');
    expect(store.inCategory('EDGES')).toEqual([edge]);
  });

  it('registers edges, microphones and the four servos of an actuator module', async () => {
    api.registerDevice.mockImplementation((alias: string, macAddress: string, deviceType: string) =>
      Promise.resolve({ ...microphone, alias, macAddress, deviceType, installationId: undefined }));
    api.registerEdge.mockResolvedValue({ ...edge, installationId: undefined });
    await store.register('MICROPHONE', '  Micrófono sala ', '007007 82d868');
    await store.register('MICROPHONE_EDGE', '', '5c:9b:a6:7a:56:bc');
    await store.register('ACTUATOR_MODULE', 'Actuadores', '00:70:07:82:D8:10');
    expect(api.registerDevice).toHaveBeenNthCalledWith(1, 'Micrófono sala', '00:70:07:82:D8:68', 'MICROPHONE');
    expect(api.registerEdge).toHaveBeenCalledWith('5C:9B:A6:7A:56:BC', 'MICROPHONE_EDGE');
    expect(api.registerDevice).toHaveBeenNthCalledWith(2, 'Actuadores · Puerta', '02:70:07:82:D8:11', 'DOOR');
    expect(api.registerDevice).toHaveBeenNthCalledWith(5, 'Actuadores · Luz', '02:70:07:82:D8:14', 'LIGHT');
    expect(store.devices()[0].installationId).toBeNull();
    expect(store.modules()).toHaveLength(1);
    expect(store.edges()).toHaveLength(1);
  });

  it('says how many channels of a module were registered when one fails', async () => {
    api.registerDevice.mockResolvedValueOnce(door).mockRejectedValueOnce(new Error('Esa MAC address ya está registrada.'));
    await expect(store.register('ACTUATOR_MODULE', 'Actuadores', '00:70:07:82:D8:10')).rejects.toThrow('Se registraron 1 de 4 canales');
    api.registerDevice.mockRejectedValueOnce(new Error('Revisa los datos.'));
    await expect(store.register('ACTUATOR_MODULE', 'Actuadores', '00:70:07:82:D8:10')).rejects.toThrow('Revisa los datos.');
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
