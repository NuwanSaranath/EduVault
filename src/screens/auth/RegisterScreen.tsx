import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Button, Input, SelectField } from '@/components';
import { districts, streams } from '@/constants/theme';
import { register } from '@/services/auth';
import { useAuthStore } from '@/store/authStore';
import { isNonEmpty, isValidEmail, isValidPassword } from '@/utils/validators';

const alYears = ['2026', '2027', '2028'];

export function RegisterScreen() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    school: '',
    district: '',
    alYear: '',
    stream: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

  const update = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async () => {
    const nextErrors: Record<string, string> = {};
    if (!isNonEmpty(form.name)) nextErrors.name = 'Enter your full name';
    if (!isValidEmail(form.email)) nextErrors.email = 'Enter a valid email address';
    if (!isValidPassword(form.password)) nextErrors.password = 'Password must be at least 6 characters';
    if (!isNonEmpty(form.school)) nextErrors.school = 'Enter your school';
    if (!isNonEmpty(form.district)) nextErrors.district = 'Select your district';
    if (!isNonEmpty(form.alYear)) nextErrors.alYear = 'Select your A/L year';
    if (!isNonEmpty(form.stream)) nextErrors.stream = 'Select your stream';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const user = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        school: form.school,
        district: form.district,
        alYear: form.alYear,
        stream: form.stream as (typeof streams)[number],
      });
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
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 64 }}>
        <Text className="mb-1 text-3xl font-extrabold text-gray-900 dark:text-white">Create account</Text>
        <Text className="mb-8 text-base text-gray-500 dark:text-gray-400">
          Set up your profile to personalise your study plan
        </Text>

        <Input label="Full Name" icon="person-outline" placeholder="Nuwan Perera" value={form.name} onChangeText={update('name')} error={errors.name} />
        <Input label="Email" icon="mail-outline" placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={update('email')} error={errors.email} />
        <Input label="Password" icon="lock-closed-outline" placeholder="••••••••" secureToggle value={form.password} onChangeText={update('password')} error={errors.password} />
        <Input label="School" icon="business-outline" placeholder="Royal College" value={form.school} onChangeText={update('school')} error={errors.school} />
        <SelectField label="District" placeholder="Select your district" icon="location-outline" value={form.district} options={districts} onChange={update('district')} error={errors.district} />
        <SelectField label="A/L Year" placeholder="Select your A/L year" icon="calendar-outline" value={form.alYear} options={alYears} onChange={update('alYear')} error={errors.alYear} />
        <SelectField label="Stream" placeholder="Select your stream" icon="git-branch-outline" value={form.stream} options={streams} onChange={update('stream')} error={errors.stream} />

        <Button label="Create Account" onPress={onSubmit} loading={loading} />

        <View className="mt-6 flex-row justify-center">
          <Text className="text-sm text-gray-500 dark:text-gray-400">Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <Text className="text-sm font-semibold text-primary-600 dark:text-primary-300">Log In</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
