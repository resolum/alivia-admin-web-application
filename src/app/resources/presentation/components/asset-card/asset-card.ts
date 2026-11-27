import { Component, computed, input } from '@angular/core';
import {
  AssetKind, Device, deviceCode, Edge, EDGE_DESCRIPTIONS, edgeAlias, edgeCode, KIND_LABELS, locationOf, STATUS_LABELS, statusTone,
} from '../../../domain/device.entity';

/** Outline icon of each kind of asset, drawn on a 24×24 grid. */
export const KIND_ICONS: Record<AssetKind, string> = {
  MICROPHONE_EDGE: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3M5 11a7 7 0 0 0 14 0M12 18v3',
  ACTUATOR_EDGE: 'M7 7h10v10H7zM10 4v3M14 4v3M10 17v3M14 17v3M4 10h3M4 14h3M17 10h3M17 14h3',
  MICROPHONE: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3M5 11a7 7 0 0 0 14 0M12 18v3',
  LIGHT: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3',
  DOOR: 'M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M4 21h16M14 12h.01',
  WINDOW: 'M4 4h16v16H4zM12 4v16M4 12h16',
  CURTAIN: 'M3 3h18M5 3v18c3-4 4-9 4-18M19 3v18c-3-4-4-9-4-18',
};

/** One device or edge of the inventory; edges use the wide layout of the "Nodos Edge" section. */
@Component({ selector: 'app-asset-card', templateUrl: './asset-card.html', styleUrl: './asset-card.css' })
export class AssetCard {
  readonly asset = input.required<Device | Edge>();

  protected readonly view = computed(() => {
    const asset = this.asset();
    const isEdge = 'edgeType' in asset;
    const kind: AssetKind = isEdge ? asset.edgeType : asset.deviceType;
    return {
      isEdge, kind, icon: KIND_ICONS[kind],
      title: isEdge ? KIND_LABELS[kind] : asset.alias,
      subtitle: isEdge ? EDGE_DESCRIPTIONS[asset.edgeType] : `${deviceCode(asset)} · ${KIND_LABELS[kind]}`,
      alias: isEdge ? edgeAlias(asset) : asset.alias,
      code: isEdge ? edgeCode(asset) : deviceCode(asset),
      mac: asset.macAddress, status: STATUS_LABELS[asset.status], tone: statusTone(asset.status),
      location: locationOf(asset), stored: asset.installationId === null,
    };
  });
}
