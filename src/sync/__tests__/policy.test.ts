import { backoffMs, syncPlan, type NetworkSnapshot } from '../policy';

function net(overrides: Partial<NetworkSnapshot> = {}): NetworkSnapshot {
  return {
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    ...overrides,
  };
}

describe('syncPlan', () => {
  it('blocks everything when disconnected', () => {
    const plan = syncPlan(net({ isConnected: false, type: 'none' }), false);
    expect(plan).toMatchObject({ pushText: false, pushMedia: false, pullContent: false });
  });

  it('blocks everything when connected but with no route out', () => {
    // Captive portals and dead hotspots report isConnected: true.
    const plan = syncPlan(net({ isInternetReachable: false }), false);
    expect(plan.pushText).toBe(false);
  });

  it('treats an unprobed reachability as usable', () => {
    // NetInfo reports null before its first probe. Assuming offline would delay
    // every cold-start sync; assuming online costs at most one retried attempt.
    const plan = syncPlan(net({ isInternetReachable: null }), false);
    expect(plan.pushText).toBe(true);
  });

  it('allows a full sync on wifi', () => {
    const plan = syncPlan(net(), false);
    expect(plan).toMatchObject({ pushText: true, pushMedia: true, pullContent: true });
  });

  it('holds media back on cellular when data saver is on', () => {
    const plan = syncPlan(net({ type: 'cellular' }), true);
    expect(plan.pushText).toBe(true);
    expect(plan.pushMedia).toBe(false);
  });

  it('respects the OS metered flag even with data saver off', () => {
    const plan = syncPlan(net({ type: 'cellular', isMetered: true }), false);
    expect(plan.pushMedia).toBe(false);
  });

  it('ignores data saver on wifi', () => {
    // Data Saver is about billed bytes, not about syncing less in general.
    const plan = syncPlan(net({ type: 'wifi' }), true);
    expect(plan.pushMedia).toBe(true);
    expect(plan.pullContent).toBe(true);
  });

  it('defers content refresh on cellular', () => {
    const plan = syncPlan(net({ type: 'cellular' }), false);
    expect(plan.pushText).toBe(true);
    expect(plan.pullContent).toBe(false);
  });

  it('uses smaller batches on a metered link than on wifi', () => {
    const metered = syncPlan(net({ type: 'cellular' }), true);
    const wifi = syncPlan(net({ type: 'wifi' }), false);
    expect(metered.batchSize).toBeLessThan(wifi.batchSize);
  });

  it('always explains itself', () => {
    expect(syncPlan(net({ isConnected: false }), false).reason).toBeTruthy();
    expect(syncPlan(net({ type: 'cellular' }), true).reason).toBeTruthy();
  });
});

describe('backoffMs', () => {
  it('grows exponentially', () => {
    expect(backoffMs(1)).toBe(4_000);
    expect(backoffMs(2)).toBe(8_000);
    expect(backoffMs(3)).toBe(16_000);
  });

  it('caps so a poison row cannot back off forever', () => {
    expect(backoffMs(50)).toBe(backoffMs(5));
  });
});
