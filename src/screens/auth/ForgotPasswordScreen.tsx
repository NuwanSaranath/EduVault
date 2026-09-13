import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '@/components';
import { palette } from '@/constants/theme';
import { requestPasswordReset } from '@/services/auth';
import { isValidEmail } from '@/utils/validators';

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async () => {
    if (!isValidEmail(email)) {
      setError('Enter a valid email address');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-light px-8 dark:bg-surface-dark">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
          <Ionicons name="checkmark-circle" size={36} color={palette.success} />
        </View>
        <Text className="mb-2 text-center text-xl font-bold text-gray-900 dark:text-white">Check your email</Text>
        <Text className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400">
          We've sent password reset instructions to {email}
        </Text>
        <Button label="Back to Login" onPress={() => router.replace('/(auth)/login')} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-light px-6 pt-20 dark:bg-surface-dark">
      <Text className="mb-1 text-3xl font-extrabold text-gray-900 dark:text-white">Forgot password?</Text>
      <Text className="mb-8 text-base text-gray-500 dark:text-gray-400">
        Enter your email and we'll send you reset instructions
      </Text>

      <Input
        label="Email"
        icon="mail-outline"
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        error={error}
      />

      <Button label="Send Reset Link" onPress={onSubmit} loading={loading} />

      <Link href="/(auth)/login" asChild>
        <Text className="mt-6 self-center text-sm font-semibold text-primary-600 dark:text-primary-300">
          Back to Login
        </Text>
      </Link>
    </View>
  );
}
