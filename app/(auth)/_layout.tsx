import { Stack } from 'expo-router';

/**
 * Without this file expo-router flattens the group, registering its screens as
 * "(auth)/login" etc. rather than as a route named "(auth)". The root layout
 * declares <Stack.Screen name="(auth)" />, so that mismatch produced the
 * "No route named (auth) exists in nested children" warning at startup.
 */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
