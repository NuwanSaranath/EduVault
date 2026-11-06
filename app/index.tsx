import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { SplashScreen } from '@/screens/SplashScreen';

/** Entry route: shows the splash, then redirects to onboarding, login or the tabs. */
export default function BootScreen() {
  const isOnboarded = useAuthStore((s) => s.isOnboarded);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isOnboarded) {
        router.replace('/(onboarding)');
      } else if (!user) {
        router.replace('/(auth)/login');
      } else {
        router.replace('/(tabs)');
      }
    }, 1400);
    return () => clearTimeout(timeout);
  }, [isOnboarded, user]);

  return <SplashScreen />;
}
