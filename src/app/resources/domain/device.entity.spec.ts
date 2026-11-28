import { categoryBySlug, Device, deviceCode, Edge, edgeAlias, edgeCode, isEdgeKind, isValidMac, locationOf, matchesAsset, normalizeMac, statusTone } from './device.entity';

describe('device entity', () => {
  const device: Device = { id: 7, businessId: 1, macAddress: 'C8:2B:96:10:4E:55', alias: 'Micrófono sala', deviceType: 'MICROPHONE', status: 'AVAILABLE', installationId: null };
  const edge: Edge = { id: 2, businessId: 1, macAddress: '5C:9B:A6:7A:56:BC', edgeType: 'ACTUATOR_EDGE', status: 'IN_USE', installationId: 3 };

  it('normalizes and validates MAC addresses', () => {
    expect(normalizeMac('5c9ba67a56bc')).toBe('5C:9B:A6:7A:56:BC');
    expect(normalizeMac('5c-9b-a6-7a-56-bc')).toBe('5C:9B:A6:7A:56:BC');
    expect(normalizeMac(' zz ')).toBe('ZZ');
    expect(isValidMac('aa:bb:cc:dd:ee:ff')).toBe(true);
    expect(isValidMac('aa:bb:cc')).toBe(false);
  });

  it('describes devices and edges', () => {
    expect(deviceCode(device)).toBe('DEV-0007');
    expect(edgeCode(edge)).toBe('EDGE-ACT-002');
    expect(edgeCode({ ...edge, edgeType: 'MICROPHONE_EDGE' })).toBe('EDGE-VOICE-002');
    expect(edgeAlias(edge)).toBe('Edge de actuadores #2');
    expect(locationOf(device)).toBe('Almacén central');
    expect(locationOf(edge)).toBe('Instalación #3');
    expect(statusTone('IN_USE')).toBe('in-use');
    expect(isEdgeKind('MICROPHONE_EDGE')).toBe(true);
    expect(isEdgeKind('LIGHT')).toBe(false);
    expect(categoryBySlug('doors')).toBe('DOOR');
    expect(categoryBySlug('nope')).toBeNull();
  });

  it('searches by MAC, code or alias', () => {
    expect(matchesAsset(device, deviceCode(device), device.alias, '')).toBe(true);
    expect(matchesAsset(device, deviceCode(device), device.alias, '4e:55')).toBe(true);
    expect(matchesAsset(device, deviceCode(device), device.alias, 'dev-0007')).toBe(true);
    expect(matchesAsset(device, deviceCode(device), device.alias, 'puerta')).toBe(false);
  });
});
