import { AutonomyAction, summarize, toAction, uniqueActions } from './autonomy-metrics.entity';

const action = (eventId: string, overrides: Partial<AutonomyAction> = {}): AutonomyAction => ({
  eventId, occurredAt: '2026-11-21T10:00:00', deviceId: 1, deviceName: 'Luz sala', deviceType: 'LIGHT', source: 'VOICE',
  intent: 'Encender luz', result: 'SUCCEEDED', executedLocally: false, ...overrides,
});

describe('autonomy metrics', () => {
  it('never keeps an audio reference sent by the backend', () => {
    const raw = { ...action('e1'), audioUrl: 'https://x/a.wav', transcript: 'prende la luz' } as AutonomyAction;
    expect(Object.keys(toAction(raw))).not.toContain('audioUrl');
    expect(Object.keys(toAction(raw))).not.toContain('transcript');
  });

  it('counts an event synced twice once and tells local executions apart', () => {
    const actions = uniqueActions([action('e1', { executedLocally: true }), action('e1', { executedLocally: true }),
      action('e2', { deviceType: 'DOOR', result: 'LOW_CONFIDENCE' }), action('e3', { deviceType: 'DOOR', result: 'FAILED' })]);
    const summary = summarize(actions);
    expect(actions).toHaveLength(3);
    expect(summary.local).toBe(1);
    expect(summary.byDevice).toEqual([{ type: 'LIGHT', requested: 1, executed: 1 }, { type: 'DOOR', requested: 2, executed: 0 }, { type: 'WINDOW', requested: 0, executed: 0 }]);
    expect(summary.byResult).toEqual({ SUCCEEDED: 1, FAILED: 1, LOW_CONFIDENCE: 1, UNCONFIRMED: 0 });
  });
});
