import {
  categoryBySlug, channelMacs, Device, deviceCode, Edge, edgeAlias, edgeCode, groupModules, isEdgeKind, isValidMac, locationOf,
  matchesAsset, moduleAliasOf, moduleCode, normalizeMac, statusTone,
} from './device.entity';

const device = (overrides: Partial<Device>): Device => ({
  id: 1, businessId: 1, macAddress: '00:70:07:82:D8:68', alias: 'Micrófono sala', deviceType: 'MICROPHONE', status: 'AVAILABLE',
  installationId: null, ...overrides,
});

describe('device entity', () => {
  const edge: Edge = { id: 2, businessId: 1, macAddress: '5C:9B:A6:7A:56:BC', edgeType: 'ACTUATOR_EDGE', status: 'IN_USE', installationId: 3 };

  it('normalizes and validates MAC addresses', () => {
    expect(normalizeMac('5c9ba67a56bc')).toBe('5C:9B:A6:7A:56:BC');
    expect(normalizeMac('5c-9b-a6-7a-56-bc')).toBe('5C:9B:A6:7A:56:BC');
    expect(normalizeMac(' zz ')).toBe('ZZ');
    expect(isValidMac('aa:bb:cc:dd:ee:ff')).toBe(true);
    expect(isValidMac('aa:bb:cc')).toBe(false);
  });

  it('describes devices and edges', () => {
    expect(deviceCode(device({ id: 7 }))).toBe('DEV-0007');
    expect(edgeCode(edge)).toBe('EDGE-ACT-002');
    expect(edgeCode({ ...edge, edgeType: 'MICROPHONE_EDGE' })).toBe('EDGE-VOICE-002');
    expect(edgeAlias(edge)).toBe('Edge de actuadores #2');
    expect(locationOf(device({}))).toBe('Almacén central');
    expect(locationOf(edge)).toBe('Instalación #3');
    expect(statusTone('IN_USE')).toBe('in-use');
    expect(isEdgeKind('MICROPHONE_EDGE')).toBe(true);
    expect(isEdgeKind('ACTUATOR_MODULE')).toBe(false);
    expect(categoryBySlug('actuators')).toBe('ACTUATORS');
    expect(categoryBySlug('nope')).toBeNull();
  });

  it('derives the servo MACs like the actuator firmware and groups them back into one module', () => {
    const channels = channelMacs('00:70:07:82:D8:FE');
    expect(channels).toEqual([
      { type: 'DOOR', mac: '02:70:07:82:D8:FF' }, { type: 'WINDOW', mac: '02:70:07:82:D8:00' },
      { type: 'CURTAIN', mac: '02:70:07:82:D8:01' }, { type: 'LIGHT', mac: '02:70:07:82:D8:02' },
    ]);
    const servos = channels.map((channel, index) => device({
      id: 10 + index, macAddress: channel.mac, deviceType: channel.type, alias: `Actuadores · ${['Puerta', 'Ventana', 'Cortina', 'Luz'][index]}`,
      status: index === 2 ? 'MAINTENANCE' : 'IN_USE', installationId: index === 0 ? null : 4,
    }));
    const [module] = groupModules([device({}), ...servos.reverse()]);
    expect(module.alias).toBe('Actuadores');
    expect(module.channels.map(channel => channel.deviceType)).toEqual(['DOOR', 'WINDOW', 'CURTAIN', 'LIGHT']);
    expect(module.status).toBe('MAINTENANCE');
    expect(module.installationId).toBe(4);
    expect(moduleCode(module)).toBe('ACT-0010');
    expect(groupModules([device({})])).toEqual([]);
    expect(moduleAliasOf('Sin canal')).toBe('Sin canal');
  });

  it('searches the given values', () => {
    expect(matchesAsset(['C8:2B', 'DEV-0007'], '')).toBe(true);
    expect(matchesAsset(['C8:2B', 'DEV-0007'], 'dev-0007')).toBe(true);
    expect(matchesAsset(['C8:2B', 'DEV-0007'], 'puerta')).toBe(false);
  });
});
