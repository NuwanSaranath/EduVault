import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'English' | 'Sinhala';

interface SettingsState {
  notificationsEnabled: boolean;
  language: Language;
  /**
   * Constrained-design control surfaced to the user: when on, `syncPlan` holds
   * image-bearing mutations back for Wi-Fi and skips content refresh entirely.
   * Read live by the sync engine, so toggling takes effect on the next drain
   * without restarting the listener.
   */
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
