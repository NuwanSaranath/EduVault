import { Pressable, Text } from 'react-native';

interface FilterChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export function FilterChip({ label, active, onPress }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`mr-2 rounded-full px-4 py-2 ${
        active ? 'bg-primary-600' : 'bg-gray-100 dark:bg-gray-800'
      }`}
    >
      <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
