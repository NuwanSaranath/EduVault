import { Platform } from 'react-native';
import type { PlannerEvent } from '@/types';

// Study reminders using the phone's notifications.
// expo-notifications is loaded later, not imported at the top. since sdk 53 it
// throws on import in expo go on android and that crashed the whole app (it
// showed up as "Route ./_layout.tsx is missing the required default export",
// which was confusing). now only reminders stop working in expo go, in a dev
// build they work normally.

type NotificationsModule = typeof import('expo-notifications');

// undefined = not tried yet, null = not available
let cached: NotificationsModule | null | undefined;

// null in expo go
function loadNotifications(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-notifications') as NotificationsModule;
  } catch {
    // expo go on android, or no native module
    cached = null;
  }
  return cached;
}

export function remindersSupported(): boolean {
  return loadNotifications() !== null;
}

const DAY_TO_WEEKDAY: Record<PlannerEvent['day'], number> = {
  Sun: 1,
  Mon: 2,
  Tue: 3,
  Wed: 4,
  Thu: 5,
  Fri: 6,
  Sat: 7,
};

// true if allowed
export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = loadNotifications();
  if (!Notifications) return false;

  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const { status: requested } = await Notifications.requestPermissionsAsync();
  return requested === 'granted';
}

// returns the notification id, or null if not available
export async function scheduleReminder(event: PlannerEvent): Promise<string | null> {
  const Notifications = loadNotifications();
  if (!Notifications) return null;

  const granted = await requestNotificationPermission();
  if (!granted) return null;

  const [hour, minute] = event.time.split(':').map(Number);

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Study reminder',
      body: `${event.activity} starts now`,
    },
    trigger:
      Platform.OS === 'web'
        ? null
        : {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: DAY_TO_WEEKDAY[event.day],
            hour,
            minute,
          },
  });
}

export async function cancelReminder(notificationId: string): Promise<void> {
  const Notifications = loadNotifications();
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
