import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '@/components';
import { login } from '@/services/auth';
import { useAuthStore } from '@/store/authStore';
import { isValidEmail, isValidPassword } from '@/utils/validators';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

  const onSubmit = async () => {
    const nextErrors: typeof errors = {};
    if (!isValidEmail(email)) nextErrors.email = 'Enter a valid email address';
    if (!isValidPassword(password)) nextErrors.password = 'Password must be at least 6 characters';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const user = await login({ email, password });
      setUser(user);
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface-light dark:bg-surface-dark"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 80 }}>
        <View className="mb-2 h-14 w-14 items-center justify-center rounded-2xl bg-primary-600">
          <Ionicons name="school" size={26} color="#fff" />
        </View>
        <Text className="mb-1 mt-4 text-3xl font-extrabold text-gray-900 dark:text-white">Welcome back</Text>
        <Text className="mb-8 text-base text-gray-500 dark:text-gray-400">
          Log in to continue your A/L preparation
        </Text>

        <Input
          label="Email"
          icon="mail-outline"
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
        />
        <Input
          label="Password"
          icon="lock-closed-outline"
          placeholder="••••••••"
          secureToggle
          value={password}
          onChangeText={setPassword}
          error={errors.password}
        />

        <Link href="/(auth)/forgot-password" asChild>
          <Text className="mb-6 self-end text-sm font-semibold text-primary-600 dark:text-primary-300">
            Forgot Password?
          </Text>
        </Link>

        <Button label="Log In" onPress={onSubmit} loading={loading} />

        <View className="mt-6 flex-row justify-center">
          <Text className="text-sm text-gray-500 dark:text-gray-400">Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <Text className="text-sm font-semibold text-primary-600 dark:text-primary-300">Sign Up</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
