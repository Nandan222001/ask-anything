// src/components/camera/FocusRing.tsx
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { theme } from '@/styles/theme';

interface FocusRingProps {
    x: number;
    y: number;
}

export function FocusRing({ x, y }: FocusRingProps) {
    const scale = useSharedValue(1.5);
    const opacity = useSharedValue(0);

    useEffect(() => {
        // Animate in
        scale.value = withSequence(
            withSpring(1, { damping: 8 }),
            withSpring(1.1, { damping: 10 }),
            withSpring(1, { damping: 12 })
        );

        opacity.value = withSequence(
            withTiming(1, { duration: 100 }),
            withTiming(1, { duration: 800 }),
            withTiming(0, { duration: 200 })
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: x - 40 },
            { translateY: y - 40 },
            { scale: scale.value },
        ],
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[styles.ring, animatedStyle]}>
            <Animated.View style={styles.innerRing} />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    ring: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: theme.colors.primary[400],
    },
    innerRing: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 4,
        height: 4,
        marginLeft: -2,
        marginTop: -2,
        borderRadius: 2,
        backgroundColor: theme.colors.primary[400],
    },
});