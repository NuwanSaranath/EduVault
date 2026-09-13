import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/constants/theme';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
}

export function EmptyState({ icon = 'file-tray-outline', title, description }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <Ionicons name={icon} size={30} color={palette.gray[400]} />
      </View>
      <Text className="text-center text-base font-semibold text-gray-800 dark:text-gray-100">{title}</Text>
      {description ? (
        <Text className="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">{description}</Text>
      ) : null}
    </View>
  );
}
