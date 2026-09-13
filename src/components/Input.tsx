import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  secureToggle?: boolean;
}

export function Input({ label, error, icon, secureToggle, secureTextEntry, ...rest }: InputProps) {
  const [hidden, setHidden] = useState(!!secureTextEntry);

  return (
    <View className="mb-4">
      {label ? (
        <Text className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Text>
      ) : null}
      <View
        className={`flex-row items-center rounded-2xl border bg-card-light px-4 dark:bg-card-dark ${
          error ? 'border-danger' : 'border-gray-200 dark:border-gray-700'
        }`}
      >
        {icon ? <Ionicons name={icon} size={18} color={palette.gray[400]} style={{ marginRight: 8 }} /> : null}
        <TextInput
          className="flex-1 py-3.5 text-base text-gray-900 dark:text-white"
          placeholderTextColor={palette.gray[400]}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          {...rest}
        />
        {secureToggle ? (
          <Ionicons
            name={hidden ? 'eye-outline' : 'eye-off-outline'}
            size={18}
            color={palette.gray[400]}
            onPress={() => setHidden((h) => !h)}
            suppressHighlighting
          />
        ) : null}
      </View>
      {error ? <Text className="mt-1 text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
