import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/constants/theme';

interface SelectFieldProps {
  label?: string;
  placeholder?: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function SelectField({ label, placeholder = 'Select', value, options, onChange, error, icon }: SelectFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <View className="mb-4">
      {label ? (
        <Text className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Text>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        className={`flex-row items-center rounded-2xl border bg-card-light px-4 py-3.5 dark:bg-card-dark ${
          error ? 'border-danger' : 'border-gray-200 dark:border-gray-700'
        }`}
      >
        {icon ? <Ionicons name={icon} size={18} color={palette.gray[400]} style={{ marginRight: 8 }} /> : null}
        <Text className={`flex-1 text-base ${value ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={palette.gray[400]} />
      </Pressable>
      {error ? <Text className="mt-1 text-xs text-danger">{error}</Text> : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 bg-black/40" onPress={() => setOpen(false)} />
        <View className="max-h-[60%] rounded-t-3xl bg-card-light p-4 dark:bg-card-dark">
          <Text className="mb-3 text-center text-base font-bold text-gray-900 dark:text-white">
            {label ?? placeholder}
          </Text>
          <FlatList
            data={options}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onChange(item);
                  setOpen(false);
                }}
                className="flex-row items-center justify-between border-b border-gray-100 px-2 py-3.5 dark:border-gray-800"
              >
                <Text className="text-base text-gray-800 dark:text-gray-200">{item}</Text>
                {item === value ? <Ionicons name="checkmark" size={18} color={palette.primary[600]} /> : null}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}
