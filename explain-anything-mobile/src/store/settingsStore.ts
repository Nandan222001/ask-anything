// src/store/settingsStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
    isDeveloperMode: boolean;
    notificationsEnabled: boolean;
    hapticsEnabled: boolean;
    language: string;

    // Actions
    toggleDeveloperMode: () => void;
    toggleNotifications: () => void;
    toggleHaptics: () => void;
    setLanguage: (language: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            isDeveloperMode: false,
            notificationsEnabled: true,
            hapticsEnabled: true,
            language: 'en',

            toggleDeveloperMode: () =>
                set((state) => ({ isDeveloperMode: !state.isDeveloperMode })),

            toggleNotifications: () =>
                set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),

            toggleHaptics: () =>
                set((state) => ({ hapticsEnabled: !state.hapticsEnabled })),

            setLanguage: (language) => set({ language }),
        }),
        {
            name: 'settings-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);