import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'English' | 'Sinhala';

interface SettingsState {
  notificationsEnabled: boolean;
  language: Language;
  // when on, photos wait for wifi and content isn't downloaded. the sync
  // engine reads it each time so it works straight away
  dataSaverEnabled: boolean;
  setNotificationsEnabled: (value: boolean) => void;
  setLanguage: (language: Language) => void;
  setDataSaverEnabled: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      notificationsEnabled: true,
      language: 'English',
      dataSaverEnabled: false,
      setNotificationsEnabled: (value) => set({ notificationsEnabled: value }),
      setLanguage: (language) => set({ language }),
      setDataSaverEnabled: (value) => set({ dataSaverEnabled: value }),
    }),
    {
      name: 'eduvault-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
