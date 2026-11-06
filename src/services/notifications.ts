export { requestNotificationPermission, remindersSupported } from '@/features/planner/reminders';

// sets the foreground notification handler.
// call it from a screen/effect, not at the top of a file. expo-notifications
// throws on import in expo go on android (since sdk 53) and that used to crash
// the whole app before it rendered. so the require is done later and guarded,
// same as features/planner/reminders.
// returns false if the native module isn't there
export function configureNotificationHandler(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    return true;
  } catch {
    return false;
  }
}
