
// src/utils/haptics.ts
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '@/store/settingsStore';

export const HapticFeedback = {
    /**
     * Light impact feedback
     */
    impact: (style: 'light' | 'medium' | 'heavy' = 'light') => {
        if (!useSettingsStore.getState().hapticsEnabled) return;

        const styles = {
            light: Haptics.ImpactFeedbackStyle.Light,
            medium: Haptics.ImpactFeedbackStyle.Medium,
            heavy: Haptics.ImpactFeedbackStyle.Heavy,
        };

        Haptics.impactAsync(styles[style]);
    },

    /**
     * Selection feedback
     */
    selection: () => {
        if (!useSettingsStore.getState().hapticsEnabled) return;
        Haptics.selectionAsync();
    },

    /**
     * Notification feedback
     */
    notification: (type: 'success' | 'warning' | 'error' = 'success') => {
        if (!useSettingsStore.getState().hapticsEnabled) return;

        const types = {
            success: Haptics.NotificationFeedbackType.Success,
            warning: Haptics.NotificationFeedbackType.Warning,
            error: Haptics.NotificationFeedbackType.Error,
        };

        Haptics.notificationAsync(types[type]);
    },
};