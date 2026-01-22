// src/components/camera/FlashToggle.tsx
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { FlashMode } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { theme } from '@/styles/theme';

interface FlashToggleProps {
    mode: FlashMode;
    onToggle: (mode: FlashMode) => void;
}

export function FlashToggle({ mode, onToggle }: FlashToggleProps) {
    const scale = useSharedValue(1);

    const getNextMode = (): FlashMode => {
        switch (mode) {
            case 'off':
                return 'on';
            case 'on':
                return 'auto';
            case 'auto':
                return 'off';
            default:
                return 'off';
        }
    };

    const getIconName = () => {
        switch (mode) {
            case 'on':
                return 'flash';
            case 'auto':
                return 'flash-outline';
            default:
                return 'flash-off';
        }
    };

    const handlePress = () => {
        scale.value = withSpring(0.9, { damping: 10 }, () => {
            scale.value = withSpring(1);
        });
        onToggle(getNextMode());
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Pressable onPress={handlePress}>
            <Animated.View style={[styles.button, animatedStyle]}>
                <Ionicons name={getIconName()} size={24} color="#fff" />
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});