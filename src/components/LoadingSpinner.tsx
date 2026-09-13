import { ActivityIndicator, View } from 'react-native';
import { palette } from '@/constants/theme';

export function LoadingSpinner({ fullscreen = true }: { fullscreen?: boolean }) {
  if (!fullscreen) return <ActivityIndicator color={palette.primary[500]} />;

  return (
    <View className="flex-1 items-center justify-center bg-surface-light dark:bg-surface-dark">
      <ActivityIndicator size="large" color={palette.primary[500]} />
    </View>
  );
}
