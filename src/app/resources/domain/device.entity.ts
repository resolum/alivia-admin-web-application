export type DeviceType = 'MICROPHONE' | 'LIGHT' | 'DOOR' | 'WINDOW' | 'CURTAIN';
export type ActuatorType = Exclude<DeviceType, 'MICROPHONE'>;
export type EdgeType = 'MICROPHONE_EDGE' | 'ACTUATOR_EDGE';
export type AssetStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'BROKEN' | 'RETIRED';
/**
 * What the administrator registers: an edge, a microphone, or an actuator module (one ESP32 that moves the door,
 * window, curtain and light servos; the backend keeps one device per servo).
 */
export type AssetKind = EdgeType | 'MICROPHONE' | 'ACTUATOR_MODULE';
/** A section of the inventory. */
export type Category = 'EDGES' | 'MICROPHONE' | 'ACTUATORS';

/** A device of the business inventory as `/api/v1/devices` returns it. */
export interface Device {
  id: number; businessId: number; macAddress: string; alias: string; deviceType: DeviceType; status: AssetStatus;
  installationId: number | null;
}

/** An edge of the business inventory as `/api/v1/edges` returns it. */
export interface Edge {
  id: number; businessId: number; macAddress: string; edgeType: EdgeType; status: AssetStatus; installationId: number | null;
}

/** One ESP32 of actuators: the servo devices that share its MAC base. */
export interface ActuatorModule {
  key: string; alias: string; status: AssetStatus; installationId: number | null; channels: Device[];
}

export interface InventoryPage<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number; }

export const EDGE_TYPES: EdgeType[] = ['MICROPHONE_EDGE', 'ACTUATOR_EDGE'];
/** Servo channels of the actuator ESP32, in the order of its firmware (`AliviaActuators.ino`). */
export const ACTUATOR_CHANNELS: ActuatorType[] = ['DOOR', 'WINDOW', 'CURTAIN', 'LIGHT'];
export const isEdgeKind = (kind: AssetKind): kind is EdgeType => (EDGE_TYPES as string[]).includes(kind);
export const isActuator = (device: Device) => device.deviceType !== 'MICROPHONE';

interface CategoryInfo { title: string; slug: string; description: string; unit: [string, string]; }
export const CATEGORIES: Record<Category, CategoryInfo> = {
  EDGES: { title: 'Nodos Edge', slug: 'edges', description: 'Procesamiento local de voz y control de actuadores', unit: ['nodo', 'nodos'] },
  MICROPHONE: { title: 'Micrófonos', slug: 'microphones', description: 'Captura de voz y botón de ayuda en cada ambiente', unit: ['micrófono', 'micrófonos'] },
  ACTUATORS: { title: 'Módulos de actuadores', slug: 'actuators', description: 'Un ESP32 que mueve puerta, ventana, cortina y luz', unit: ['módulo', 'módulos'] },
};
export const CATEGORY_ORDER: Category[] = ['EDGES', 'MICROPHONE', 'ACTUATORS'];
export const categoryBySlug = (slug: string | null): Category | null =>
  CATEGORY_ORDER.find(category => CATEGORIES[category].slug === slug) ?? null;

export const KIND_LABELS: Record<AssetKind, string> = {
  MICROPHONE_EDGE: 'Edge de control por voz', ACTUATOR_EDGE: 'Edge de actuadores',
  MICROPHONE: 'Micrófono', ACTUATOR_MODULE: 'Módulo de actuadores (puerta, ventana, cortina y luz)',
};
export const CHANNEL_LABELS: Record<ActuatorType, string> = { DOOR: 'Puerta', WINDOW: 'Ventana', CURTAIN: 'Cortina', LIGHT: 'Luz' };
export const EDGE_DESCRIPTIONS: Record<EdgeType, string> = {
  MICROPHONE_EDGE: 'Procesamiento local de comandos de voz',
  ACTUATOR_EDGE: 'Control local de luces, puertas y ventanas',
};

export const STATUS_LABELS: Record<AssetStatus, string> = {
  AVAILABLE: 'Disponible', IN_USE: 'Asignado', MAINTENANCE: 'En mantenimiento', BROKEN: 'Averiado', RETIRED: 'Retirado',
};
export const statusTone = (status: AssetStatus) => status.toLowerCase().replace('_', '-');

const pad = (value: number, size: number) => String(value).padStart(size, '0');
export const deviceCode = (device: Device) => `DEV-${pad(device.id, 4)}`;
export const edgeCode = (edge: Edge) => `EDGE-${edge.edgeType === 'MICROPHONE_EDGE' ? 'VOICE' : 'ACT'}-${pad(edge.id, 3)}`;
export const moduleCode = (module: ActuatorModule) => `ACT-${pad(Math.min(...module.channels.map(channel => channel.id)), 4)}`;
export const edgeAlias = (edge: Edge) => `${KIND_LABELS[edge.edgeType]} #${edge.id}`;
export const locationOf = (asset: { installationId: number | null }) =>
  asset.installationId === null ? 'Almacén central' : `Instalación #${asset.installationId}`;

/** Upper-case `AA:BB:CC:DD:EE:FF`, accepting dashes or no separators while typing. */
export function normalizeMac(value: string): string {
  const hex = value.replace(/[^0-9a-f]/gi, '').toUpperCase();
  return hex.length === 12 ? hex.match(/.{2}/g)!.join(':') : value.trim().toUpperCase();
}
export const isValidMac = (value: string) => /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(normalizeMac(value));

const bytesOf = (mac: string) => normalizeMac(mac).split(':').map(part => parseInt(part, 16));
const macOf = (bytes: number[]) => bytes.map(byte => byte.toString(16).toUpperCase().padStart(2, '0')).join(':');

/**
 * MAC of each servo channel of an actuator ESP32, derived from its MAC base exactly like the firmware's `logicalMac`:
 * the locally administered bit set in the first byte and the channel number plus one added to the last byte.
 */
export function channelMacs(baseMac: string): { type: ActuatorType; mac: string }[] {
  const base = bytesOf(baseMac);
  return ACTUATOR_CHANNELS.map((type, channel) => {
    const bytes = [...base];
    bytes[0] |= 0x02;
    bytes[5] = (bytes[5] + channel + 1) & 0xff;
    return { type, mac: macOf(bytes) };
  });
}

/** Key shared by the channels of one ESP32: their MAC with the channel offset taken back out of the last byte. */
export function moduleKeyOf(device: Device): string {
  const channel = ACTUATOR_CHANNELS.indexOf(device.deviceType as ActuatorType);
  const bytes = bytesOf(device.macAddress);
  bytes[5] = (bytes[5] - channel - 1 + 256) & 0xff;
  return macOf(bytes);
}

/** Alias of the module: the alias of its channels without the " · Puerta" part the registration adds. */
export const moduleAliasOf = (alias: string) => alias.replace(/\s·\s(Puerta|Ventana|Cortina|Luz)$/, '');

const STATUS_PRIORITY: AssetStatus[] = ['BROKEN', 'MAINTENANCE', 'IN_USE', 'AVAILABLE', 'RETIRED'];

/** Groups the actuator devices by the ESP32 that drives them. */
export function groupModules(devices: Device[]): ActuatorModule[] {
  const groups = new Map<string, Device[]>();
  for (const device of devices.filter(isActuator)) {
    const key = moduleKeyOf(device);
    groups.set(key, [...(groups.get(key) ?? []), device]);
  }
  return [...groups.entries()].map(([key, channels]) => {
    const sorted = [...channels].sort((a, b) =>
      ACTUATOR_CHANNELS.indexOf(a.deviceType as ActuatorType) - ACTUATOR_CHANNELS.indexOf(b.deviceType as ActuatorType));
    return {
      key, channels: sorted, alias: moduleAliasOf(sorted[0].alias),
      status: STATUS_PRIORITY.find(status => sorted.some(channel => channel.status === status)) ?? 'AVAILABLE',
      installationId: sorted.find(channel => channel.installationId !== null)?.installationId ?? null,
    };
  });
}

export function matchesAsset(values: string[], search: string): boolean {
  const needle = search.trim().toLowerCase();
  return !needle || values.some(value => value.toLowerCase().includes(needle));
}
