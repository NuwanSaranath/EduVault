import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Button, Input } from '@/components';
import { gradients, palette } from '@/constants/theme';
import { login } from '@/services/auth';
import { useAuthStore } from '@/store/authStore';
import { isValidEmail, isValidPassword } from '@/utils/validators';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const setUser = useAuthStore((s) => s.setUser);

  const onSubmit = async () => {
    const nextErrors: typeof errors = {};
    if (!isValidEmail(email)) nextErrors.email = 'Enter a valid email address';
    if (!isValidPassword(password)) nextErrors.password = 'Password must be at least 6 characters';
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const user = await login({ email, password });
      setUser(user);
      router.replace('/(tabs)');
    } catch (error) {
      // `login` throws an ApiError for bad credentials, no network, and for a
      // missing backend configuration. Without this catch the rejection was
      // unhandled and the student saw a spinner stop with no explanation.
      setFormError(
        error instanceof Error ? error.message : 'Could not sign in. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-surface-light dark:bg-surface-dark">
      {/* ── Branded header ───────────────────────────────────────────────
          The form sheet below overlaps this by 24px, which is what gives the
          screen depth instead of reading as text on a flat background. */}
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ paddingTop: insets.top + 28, paddingBottom: 56 }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -70,
            right: -50,
            width: 190,
            height: 190,
            borderRadius: 200,
            backgroundColor: 'rgba(255,255,255,0.10)',
          }}
        />

        <Animated.View entering={FadeIn.duration(400)} className="px-7">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
            <Ionicons name="school" size={28} color="#fff" />
          </View>
          <Text className="mt-4 text-[28px] font-extrabold text-white">Welcome back</Text>
          <Text className="mt-1.5 text-[15px] leading-5 text-white/80">
            Sign in to pick up your A/L preparation where you left off.
          </Text>
        </Animated.View>
      </LinearGradient>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ marginTop: -24 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: insets.bottom + 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeInDown.duration(420)}
            className="flex-1 rounded-t-[28px] bg-surface-light px-7 pt-7 dark:bg-surface-dark"
          >
            {/* Sign-in failures surface here rather than vanishing. */}
            {formError ? (
              <Animated.View
                entering={FadeIn.duration(220)}
                className="mb-4 flex-row items-start rounded-2xl bg-red-50 p-3.5 dark:bg-red-950/40"
              >
                <Ionicons
                  name="alert-circle"
                  size={18}
                  color={palette.danger}
                  style={{ marginTop: 1 }}
                />
                <Text className="ml-2.5 flex-1 text-[13px] leading-5 text-red-700 dark:text-red-300">
                  {formError}
                </Text>
              </Animated.View>
            ) : null}

            <Input
              label="Email"
              icon="mail-outline"
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="next"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
            />
            <Input
              label="Password"
              icon="lock-closed-outline"
              placeholder="Your password"
              secureToggle
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={() => void onSubmit()}
              value={password}
              onChangeText={setPassword}
              error={errors.password}
            />

            {/* A padded Pressable, not a bare Text — the old link was a
                one-line tap target well under the 44px minimum. */}
            <Link href="/(auth)/forgot-password" asChild>
              <Pressable className="mb-5 self-end px-1 py-2" hitSlop={8}>
                <Text className="text-sm font-semibold text-primary-600 dark:text-primary-300">
                  Forgot password?
                </Text>
              </Pressable>
            </Link>

            <Button
              label="Sign In"
              onPress={() => void onSubmit()}
              loading={loading}
              iconPosition="right"
              icon={<Ionicons name="arrow-forward" size={17} color="#fff" />}
            />

            <View className="my-6 flex-row items-center">
              <View className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              <Text className="mx-3 text-xs font-medium text-gray-400">NEW TO EDUVAULT?</Text>
              <View className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            </View>

            <Link href="/(auth)/register" asChild>
              <Pressable className="w-full flex-row items-center justify-center rounded-2xl border-2 border-primary-200 py-3.5 active:opacity-70 dark:border-primary-800">
                <Text className="text-base font-semibold text-primary-600 dark:text-primary-300">
                  Create an account
                </Text>
              </Pressable>
            </Link>

            <View className="flex-1" />

            <Text className="mt-8 text-center text-[11px] leading-4 text-gray-400">
              Your lessons, quizzes and results stay on this device and sync when you are online.
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
