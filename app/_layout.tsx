import '../global.css';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useAuthStore } from '@/store/authStore';
import { useAppBootstrap } from '@/hooks/useAppBootstrap';
import { palette } from '@/constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const { colorScheme } = useColorScheme();

  // Opens SQLite, seeds bundled content, hydrates the stores from the database,
  // then starts the sync engine. Nothing renders until this settles, because a
  // screen that queried an unmigrated database would just see empty tables.
  const { phase, error } = useAppBootstrap();

  const ready = hasHydrated && phase !== 'starting';

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) return null;

  // A failed bootstrap means there is no local database, so there is no offline
  // mode to degrade into. Say so plainly rather than showing an empty app.
  if (phase === 'failed') {
    return (
      <SafeAreaProvider>
        <View className="flex-1 items-center justify-center gap-3 bg-white px-8 dark:bg-gray-900">
          <Text className="text-center text-base font-semibold text-gray-900 dark:text-white">
            EduVault could not start
          </Text>
          <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
            The local database failed to open, so your offline content is unavailable. Restarting
            the app usually clears this.
          </Text>
          {error ? (
            <Text
              className="mt-2 text-center text-xs"
              style={{ color: palette.danger }}
              numberOfLines={3}
            >
              {error}
            </Text>
          ) : null}
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="subject/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="theory/[chapterId]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="past-papers/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen
            name="past-papers/[id]/exam"
            options={{ animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen name="past-papers/[id]/result" options={{ animation: 'fade' }} />
          <Stack.Screen name="quiz/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen
            name="quiz/session"
            options={{ animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen name="quiz/result" options={{ animation: 'fade' }} />
          <Stack.Screen name="planner/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ai-tutor/index" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="profile/settings" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="flashcards/index" options={{ animation: 'slide_from_right' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
