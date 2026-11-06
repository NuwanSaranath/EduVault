import { Pressable, Text, View } from 'react-native';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

// section title + optional link on the right
export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <Text className="text-lg font-bold text-gray-900 dark:text-white">{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction}>
          <Text className="text-sm font-semibold text-primary-600 dark:text-primary-300">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
