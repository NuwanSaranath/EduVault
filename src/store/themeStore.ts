import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';
import type { ThemeMode } from '@/constants/theme';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => {
        colorScheme.set(mode);
        set({ mode });
      },
    }),
    {
      name: 'eduvault-theme',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) colorScheme.set(state.mode);
      },
    },
  ),
);
