import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isOnboarded: boolean;
  hasHydrated: boolean;
  setUser: (user: User | null) => void;
  completeOnboarding: () => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isOnboarded: false,
      hasHydrated: false,
      setUser: (user) => set({ user }),
      completeOnboarding: () => set({ isOnboarded: true }),
      logout: () => set({ user: null }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'eduvault-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user, isOnboarded: state.isOnboarded }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
