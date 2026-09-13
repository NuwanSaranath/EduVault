import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { PlannerEvent } from '@/types';

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
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const { status: requested } = await Notifications.requestPermissionsAsync();
  return requested === 'granted';
}

export async function scheduleReminder(event: PlannerEvent): Promise<string | null> {
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
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
