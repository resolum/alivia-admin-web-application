import { Component, computed, input } from '@angular/core';
import { InventoryItem } from '../../../application/resources.store';
import {
  ActuatorType, AssetKind, Category, CHANNEL_LABELS, deviceCode, EDGE_DESCRIPTIONS, edgeAlias, edgeCode, KIND_LABELS, locationOf, moduleCode,
  STATUS_LABELS, statusTone,
} from '../../../domain/device.entity';

/** Outline icon of each kind of asset, drawn on a 24×24 grid. */
export const KIND_ICONS: Record<AssetKind, string> = {
  MICROPHONE_EDGE: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3M5 11a7 7 0 0 0 14 0M12 18v3',
  ACTUATOR_EDGE: 'M7 7h10v10H7zM10 4v3M14 4v3M10 17v3M14 17v3M4 10h3M4 14h3M17 10h3M17 14h3',
  MICROPHONE: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3M5 11a7 7 0 0 0 14 0M12 18v3',
  ACTUATOR_MODULE: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4',
};

/** Icon of each section of the inventory. */
export const CATEGORY_KINDS: Record<Category, AssetKind> = { EDGES: 'ACTUATOR_EDGE', MICROPHONE: 'MICROPHONE', ACTUATORS: 'ACTUATOR_MODULE' };

/** Stable key of an inventory item for `@for`. */
export const trackItem = (item: InventoryItem) => 'channels' in item ? `module-${item.key}` : 'edgeType' in item ? `edge-${item.id}` : `device-${item.id}`;

/** One edge, microphone or actuator module of the inventory; edges use the wide layout of their section. */
@Component({ selector: 'app-asset-card', templateUrl: './asset-card.html', styleUrl: './asset-card.css' })
export class AssetCard {
  readonly asset = input.required<InventoryItem>();

  protected readonly view = computed(() => {
    const asset = this.asset();
    const common = { status: STATUS_LABELS[asset.status], tone: statusTone(asset.status), location: locationOf(asset), stored: asset.installationId === null };
    if ('edgeType' in asset) {
      return { ...common, layout: 'edge' as const, icon: KIND_ICONS[asset.edgeType], title: KIND_LABELS[asset.edgeType],
        subtitle: EDGE_DESCRIPTIONS[asset.edgeType], alias: edgeAlias(asset), code: edgeCode(asset), mac: asset.macAddress, channels: [] };
    }
    if ('channels' in asset) {
      return { ...common, layout: 'module' as const, icon: KIND_ICONS.ACTUATOR_MODULE, title: asset.alias,
        subtitle: `${moduleCode(asset)} · ESP32 con ${asset.channels.length} servos`, alias: asset.alias, code: moduleCode(asset), mac: '',
        channels: asset.channels.map(channel => ({ id: channel.id, label: CHANNEL_LABELS[channel.deviceType as ActuatorType], mac: channel.macAddress,
          status: STATUS_LABELS[channel.status], tone: statusTone(channel.status) })) };
    }
    return { ...common, layout: 'device' as const, icon: KIND_ICONS.MICROPHONE, title: asset.alias,
      subtitle: `${deviceCode(asset)} · Micrófono`, alias: asset.alias, code: deviceCode(asset), mac: asset.macAddress, channels: [] };
  });
}
