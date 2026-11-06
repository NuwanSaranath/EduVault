import '../global.css';
import { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useAuthStore } from '@/store/authStore';
import { useAppBootstrap } from '@/hooks/useAppBootstrap';
import { palette } from '@/constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Shows the actual error instead of Expo Go's generic "Something went wrong".
 *
 * Expo Router looks for a named `ErrorBoundary` export on a route file and
 * wraps that segment's subtree in it. Exporting it from the root layout means
 * any render error anywhere in the app surfaces here with its message and
 * stack, on the device — which is the difference between a five-minute fix and
 * guessing from a screen that says nothing.
 *
 * It cannot catch everything: an error thrown while a module is still being
 * imported happens before React renders, so those still only appear in the
 * Metro terminal.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: '#1A1033', padding: 20 }}>
        <Text style={{ color: '#FCA5A5', fontSize: 13, fontWeight: '700', marginTop: 40 }}>
          EduVault crashed
        </Text>
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 8 }}>
          {error?.name ?? 'Error'}: {error?.message ?? 'Unknown error'}
        </Text>

        <ScrollView
          style={{
            flex: 1,
            marginTop: 16,
            backgroundColor: 'rgba(0,0,0,0.35)',
            borderRadius: 10,
            padding: 12,
          }}
        >
          <Text selectable style={{ color: '#D1D5DB', fontSize: 11, lineHeight: 16 }}>
            {error?.stack ?? 'No stack trace available.'}
          </Text>
        </ScrollView>

        <Pressable
          onPress={() => void retry()}
          style={{
            marginTop: 16,
            marginBottom: 20,
            backgroundColor: palette.primary[600],
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Try again</Text>
        </Pressable>
      </View>
    </SafeAreaProvider>
  );
}

/** Root layout: runs app bootstrap, then renders the app-wide providers and the root Stack navigator. */
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

  // The app shell. Every screen renders inside these providers:
  //   GestureHandlerRootView — enables swipes/drags app-wide (flashcards, back-swipe).
  //   SafeAreaProvider       — reports notch/status-bar insets so screens can avoid them.
  //   StatusBar              — light icons in dark mode, dark icons in light mode.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        {/* Root stack navigator. Screens push on top and pop on Back. The default
            header is hidden because every screen draws its own. */}
        <Stack screenOptions={{ headerShown: false }}>
          {/* Top-level areas: boot redirect, first-run intro, sign-in, and the
              five-tab app. The tabs are a single entry in this stack, so task
              screens below are pushed over them. */}
          <Stack.Screen name="index" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />

          {/* Browsing screens slide in from the right, the normal "go deeper" motion. */}
          <Stack.Screen name="subject/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="theory/[chapterId]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="past-papers/index" options={{ animation: 'slide_from_right' }} />

          {/* Exam and quiz sessions fade in to mark entering "test mode", and the
              back-swipe is disabled so an accidental swipe cannot abandon an
              attempt halfway through. Results fade too, as the exit from that mode. */}
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

          {/* Tools. The AI Tutor slides up from the bottom like a chat panel. */}
          <Stack.Screen name="planner/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ai-tutor/index" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="profile/settings" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="flashcards/index" options={{ animation: 'slide_from_right' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
