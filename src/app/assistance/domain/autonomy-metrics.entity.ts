export type DeviceType = 'LIGHT' | 'DOOR' | 'WINDOW';
export type ActionResult = 'SUCCEEDED' | 'FAILED' | 'LOW_CONFIDENCE' | 'UNCONFIRMED';

/**
 * One action the assisted person asked for. Voice actions carry only the recognized intent: the audio never leaves
 * the edge, and the client drops any other field the backend might send (see `toAction`).
 */
export interface AutonomyAction {
  eventId: string;
  occurredAt: string;
  deviceId: number;
  deviceName: string;
  deviceType: DeviceType;
  source: 'VOICE' | 'APP' | 'SWITCH';
  intent: string;
  result: ActionResult;
  executedLocally: boolean;
}

/**
 * Proposed contract for GET /autonomy-metrics?from&to (US-41); the backend does not expose it yet.
 * `lastSyncedAt` is the last time the home's edge delivered its events; with `edgeOnline` false some may be pending.
 */
export interface AutonomyMetrics { lastSyncedAt: string | null; edgeOnline: boolean; actions: AutonomyAction[]; }

export const deviceTypeLabel: Record<DeviceType, string> = { LIGHT: 'Luces', DOOR: 'Puertas', WINDOW: 'Ventanas' };
export const resultLabel: Record<ActionResult, string> = {
  SUCCEEDED: 'Exitosa', FAILED: 'Fallida', LOW_CONFIDENCE: 'Rechazada por baja confianza', UNCONFIRMED: 'Sin confirmación del actuador',
};
export const DEVICE_TYPES = Object.keys(deviceTypeLabel) as DeviceType[];
export const RESULTS = Object.keys(resultLabel) as ActionResult[];

/** Keeps only the fields the caregiver may see, so an audio reference sent by mistake is never shown or played. */
export function toAction(raw: AutonomyAction): AutonomyAction {
  const { eventId, occurredAt, deviceId, deviceName, deviceType, source, intent, result, executedLocally } = raw;
  return { eventId, occurredAt, deviceId, deviceName, deviceType, source, intent, result, executedLocally: !!executedLocally };
}

/** An event the edge re-sends after reconnecting counts once. */
export function uniqueActions(actions: readonly AutonomyAction[]): AutonomyAction[] {
  return [...new Map(actions.map(action => [action.eventId, action])).values()];
}

export interface DeviceSummary { type: DeviceType; requested: number; executed: number; }

/** Requested = every action asked for; executed = the ones the actuator confirmed. */
export function summarize(actions: readonly AutonomyAction[]): { byDevice: DeviceSummary[]; byResult: Record<ActionResult, number>; local: number } {
  const byResult = Object.fromEntries(RESULTS.map(result => [result, 0])) as Record<ActionResult, number>;
  actions.forEach(action => byResult[action.result]++);
  return {
    byDevice: DEVICE_TYPES.map(type => {
      const own = actions.filter(action => action.deviceType === type);
      return { type, requested: own.length, executed: own.filter(action => action.result === 'SUCCEEDED').length };
    }),
    byResult,
    local: actions.filter(action => action.executedLocally).length,
  };
}
