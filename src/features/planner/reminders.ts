import { Platform } from 'react-native';
import type { PlannerEvent } from '@/types';

/**
 * Study reminders, scheduled through the OS notification scheduler.
 *
 * `expo-notifications` is loaded **lazily**, not with a top-level import. Since
 * SDK 53 the module throws on import inside Expo Go on Android, because remote
 * notifications were removed from Expo Go. A static import therefore took the
 * whole app down before React even rendered: the throw propagated up through
 * plannerStore → useAppBootstrap → app/_layout.tsx, leaving the root layout with
 * no exports at all, which surfaced as the misleading "Route ./_layout.tsx is
 * missing the required default export".
 *
 * Deferring the require contains the failure to this one feature. In a
 * development build reminders work normally; in Expo Go they are unavailable and
 * every function here degrades quietly, which matches how the rest of the app
 * treats a missing capability.
 */

type NotificationsModule = typeof import('expo-notifications');

/** `undefined` = not tried yet, `null` = unavailable in this runtime. */
let cached: NotificationsModule | null | undefined;

function loadNotifications(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-notifications') as NotificationsModule;
  } catch {
    // Expo Go on Android, or any runtime without the native module.
    cached = null;
  }
  return cached;
}

/** True when this runtime can actually schedule a notification. */
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

export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = loadNotifications();
  if (!Notifications) return false;

  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const { status: requested } = await Notifications.requestPermissionsAsync();
  return requested === 'granted';
}

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
