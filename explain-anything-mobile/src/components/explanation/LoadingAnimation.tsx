// src/components/explanation/LoadingAnimation.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { theme } from '@/styles/theme';

interface LoadingAnimationProps {
    message?: string;
}

export function LoadingAnimation({ message = 'Analyzing...' }: LoadingAnimationProps) {
    const dot1Opacity = useSharedValue(0.3);
    const dot2Opacity = useSharedValue(0.3);
    const dot3Opacity = useSharedValue(0.3);
    const dot1Scale = useSharedValue(0.8);
    const dot2Scale = useSharedValue(0.8);
    const dot3Scale = useSharedValue(0.8);

    useEffect(() => {
        const config = {
            duration: 600,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
        };

        // Dot 1
        dot1Opacity.value = withRepeat(
            withSequence(
                withTiming(1, config),
                withTiming(0.3, config)
            ),
            -1
        );
        dot1Scale.value = withRepeat(
            withSequence(
                withTiming(1.2, config),
                withTiming(0.8, config)
            ),
            -1
        );

        // Dot 2 (delayed)
        dot2Opacity.value = withDelay(
            200,
            withRepeat(
                withSequence(
                    withTiming(1, config),
                    withTiming(0.3, config)
                ),
                -1
            )
        );
        dot2Scale.value = withDelay(
            200,
            withRepeat(
                withSequence(
                    withTiming(1.2, config),
                    withTiming(0.8, config)
                ),
                -1
            )
        );

        // Dot 3 (more delayed)
        dot3Opacity.value = withDelay(
            400,
            withRepeat(
                withSequence(
                    withTiming(1, config),
                    withTiming(0.3, config)
                ),
                -1
            )
        );
        dot3Scale.value = withDelay(
            400,
            withRepeat(
                withSequence(
                    withTiming(1.2, config),
                    withTiming(0.8, config)
                ),
                -1
            )
        );
    }, []);

    const dot1Style = useAnimatedStyle(() => ({
        opacity: dot1Opacity.value,
        transform: [{ scale: dot1Scale.value }],
    }));

    const dot2Style = useAnimatedStyle(() => ({
        opacity: dot2Opacity.value,
        transform: [{ scale: dot2Scale.value }],
    }));

    const dot3Style = useAnimatedStyle(() => ({
        opacity: dot3Opacity.value,
        transform: [{ scale: dot3Scale.value }],
    }));

    return (
        <View style={styles.container}>
            {/* Lottie animation */}
            <LottieView
                source={require('@/assets/animations/thinking.json')}
                autoPlay
                loop
                style={styles.lottie}
            />

            {/* Dots */}
            <View style={styles.dots}>
                <Animated.View style={[styles.dot, dot1Style]} />
                <Animated.View style={[styles.dot, dot2Style]} />
                <Animated.View style={[styles.dot, dot3Style]} />
            </View>

            {/* Message */}
            <Text style={styles.message}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.spacing['3xl'],
    },
    lottie: {
        width: 160,
        height: 160,
    },
    dots: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.lg,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.colors.primary[500],
    },
    message: {
        marginTop: theme.spacing.lg,
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.neutral[700],
    },
});