// src/components/camera/CaptureButton.tsx
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withSequence,
    withTiming,
    interpolate,
    Extrapolate,
} from 'react-native-reanimated';
import { theme } from '@/styles/theme';

interface CaptureButtonProps {
    onPress: () => void;
    disabled?: boolean;
    isProcessing?: boolean;
}

export function CaptureButton({ onPress, disabled, isProcessing }: CaptureButtonProps) {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);
    const rotation = useSharedValue(0);

    useEffect(() => {
        if (isProcessing) {
            // Rotate continuously while processing
            rotation.value = withSequence(
                withTiming(360, { duration: 1000 }),
                withTiming(720, { duration: 1000 }),
                withTiming(1080, { duration: 1000 })
            );
        } else {
            rotation.value = withTiming(0);
        }
    }, [isProcessing]);

    const handlePressIn = () => {
        if (disabled) return;
        scale.value = withSpring(0.9, { damping: 10 });
        opacity.value = withTiming(0.7);
    };

    const handlePressOut = () => {
        if (disabled) return;
        scale.value = withSpring(1, { damping: 10 });
        opacity.value = withTiming(1);
    };

    const handlePress = () => {
        if (disabled) return;

        // Pulse animation
        scale.value = withSequence(
            withSpring(0.85, { damping: 10 }),
            withSpring(1, { damping: 10 })
        );

        onPress();
    };

    const buttonStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            {
                rotate: `${interpolate(
                    rotation.value,
                    [0, 360],
                    [0, 360],
                    Extrapolate.CLAMP
                )}deg`
            },
        ],
        opacity: opacity.value,
    }));

    const innerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: isProcessing ? 0.6 : 1 }],
    }));

    return (
        <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            disabled={disabled}
            style={styles.container}
        >
            <Animated.View style={[styles.button, buttonStyle]}>
                <Animated.View
                    style={[
                        styles.inner,
                        innerStyle,
                        isProcessing && styles.processingInner
                    ]}
                />
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    button: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.3)',
        ...theme.shadows.lg,
    },
    inner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme.colors.primary[500],
    },
    processingInner: {
        backgroundColor: theme.colors.warning,
    },
});