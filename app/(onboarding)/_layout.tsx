import { Stack } from 'expo-router';

/** Groups the onboarding flow into a single "(onboarding)" route. See (auth)/_layout. */
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
