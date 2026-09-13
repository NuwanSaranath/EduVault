import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/constants/theme';

interface BadgeProps {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
}

const toneStyles: Record<NonNullable<BadgeProps['tone']>, { bg: string; text: string; iconColor: string }> = {
  primary: { bg: 'bg-primary-50 dark:bg-primary-900/40', text: 'text-primary-700 dark:text-primary-200', iconColor: palette.primary[600] },
  success: { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', iconColor: palette.success },
  warning: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', iconColor: palette.warning },
  danger: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', iconColor: palette.danger },
  neutral: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', iconColor: palette.gray[600] },
};

export function Badge({ icon, label, tone = 'primary' }: BadgeProps) {
  const { bg, text, iconColor } = toneStyles[tone];

  return (
    <View className={`flex-row items-center rounded-full px-3 py-1 self-start ${bg}`}>
      {icon ? <Ionicons name={icon} size={13} color={iconColor} style={{ marginRight: 4 }} /> : null}
      <Text className={`text-xs font-semibold ${text}`}>{label}</Text>
    </View>
  );
}
