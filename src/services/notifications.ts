export { requestNotificationPermission, remindersSupported } from '@/features/planner/reminders';

/**
 * Installs the foreground notification handler.
 *
 * Call this from a screen or effect — never at module scope. `expo-notifications`
 * throws on import inside Expo Go on Android (remote notifications were removed
 * there in SDK 53), so a top-level import plus a top-level
 * `setNotificationHandler` call, which is what this file used to contain, takes
 * the whole app down before React renders. The require is deferred and guarded
 * for the same reason as in features/planner/reminders.
 *
 * @returns true when the handler was installed, false in runtimes without the
 *          native module.
 */
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
