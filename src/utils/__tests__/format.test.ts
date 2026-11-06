import { formatTimeAgo } from '../format';

describe('formatTimeAgo', () => {
  const now = Date.parse('2026-11-06T12:00:00.000Z');
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it('says never when there has been no sync', () => {
    expect(formatTimeAgo(null, now)).toBe('never');
    expect(formatTimeAgo('not a date', now)).toBe('never');
  });

  it('formats minutes, hours and days', () => {
    expect(formatTimeAgo(ago(20_000), now)).toBe('just now');
    expect(formatTimeAgo(ago(5 * 60_000), now)).toBe('5 min ago');
    expect(formatTimeAgo(ago(3 * 3_600_000), now)).toBe('3 h ago');
    expect(formatTimeAgo(ago(26 * 3_600_000), now)).toBe('1 day ago');
    expect(formatTimeAgo(ago(3 * 86_400_000), now)).toBe('3 days ago');
  });

  it('treats a future time (clock skew) as just now', () => {
    expect(formatTimeAgo(ago(-60_000), now)).toBe('just now');
  });
});
