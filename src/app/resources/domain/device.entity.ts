export type DeviceType = 'MICROPHONE' | 'LIGHT' | 'DOOR' | 'WINDOW' | 'CURTAIN';
export type EdgeType = 'MICROPHONE_EDGE' | 'ACTUATOR_EDGE';
export type AssetStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'BROKEN' | 'RETIRED';
/** What the administrator picks when registering: a device type or an edge type. */
export type AssetKind = DeviceType | EdgeType;
/** A section of the inventory: the edges or one device type. */
export type Category = 'EDGES' | DeviceType;

/** A device of the business inventory as `/api/v1/devices` returns it. */
export interface Device {
  id: number; businessId: number; macAddress: string; alias: string; deviceType: DeviceType; status: AssetStatus;
  installationId: number | null;
}

/** An edge of the business inventory as `/api/v1/edges` returns it. */
export interface Edge {
  id: number; businessId: number; macAddress: string; edgeType: EdgeType; status: AssetStatus; installationId: number | null;
}

export interface InventoryPage<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number; }

export const DEVICE_TYPES: DeviceType[] = ['MICROPHONE', 'LIGHT', 'DOOR', 'WINDOW', 'CURTAIN'];
export const EDGE_TYPES: EdgeType[] = ['MICROPHONE_EDGE', 'ACTUATOR_EDGE'];
export const isEdgeKind = (kind: AssetKind): kind is EdgeType => (EDGE_TYPES as string[]).includes(kind);

interface CategoryInfo { title: string; singular: string; slug: string; description: string; }
export const CATEGORIES: Record<Category, CategoryInfo> = {
  EDGES: { title: 'Nodos Edge', singular: 'Nodo Edge', slug: 'edges', description: 'Procesamiento local de voz y control de actuadores' },
  MICROPHONE: { title: 'Micrófonos', singular: 'Micrófono', slug: 'microphones', description: 'Captura de voz y botón de ayuda en cada ambiente' },
  LIGHT: { title: 'Luces', singular: 'Luz', slug: 'lights', description: 'Encendido y apagado automático de la iluminación' },
  DOOR: { title: 'Puertas', singular: 'Puerta', slug: 'doors', description: 'Apertura y cierre de puertas' },
  WINDOW: { title: 'Ventanas', singular: 'Ventana', slug: 'windows', description: 'Apertura y cierre de ventanas' },
  CURTAIN: { title: 'Cortinas', singular: 'Cortina', slug: 'curtains', description: 'Apertura y cierre de cortinas' },
};
export const CATEGORY_ORDER: Category[] = ['EDGES', ...DEVICE_TYPES];
export const categoryBySlug = (slug: string | null): Category | null =>
  CATEGORY_ORDER.find(category => CATEGORIES[category].slug === slug) ?? null;

export const KIND_LABELS: Record<AssetKind, string> = {
  MICROPHONE_EDGE: 'Edge de control por voz', ACTUATOR_EDGE: 'Edge de actuadores',
  MICROPHONE: 'Micrófono', LIGHT: 'Luz', DOOR: 'Puerta', WINDOW: 'Ventana', CURTAIN: 'Cortina',
};
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
export const edgeAlias = (edge: Edge) => `${KIND_LABELS[edge.edgeType]} #${edge.id}`;
export const locationOf = (asset: { installationId: number | null }) =>
  asset.installationId === null ? 'Almacén central' : `Instalación #${asset.installationId}`;

/** Upper-case `AA:BB:CC:DD:EE:FF`, accepting dashes or no separators while typing. */
export function normalizeMac(value: string): string {
  const hex = value.replace(/[^0-9a-f]/gi, '').toUpperCase();
  return hex.length === 12 ? hex.match(/.{2}/g)!.join(':') : value.trim().toUpperCase();
}
export const isValidMac = (value: string) => /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(normalizeMac(value));

export function matchesAsset(asset: { macAddress: string }, code: string, alias: string, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return [asset.macAddress, code, alias].some(value => value.toLowerCase().includes(needle));
}
