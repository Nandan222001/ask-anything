// src/components/camera/CaptureButton.tsx
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withSequence,
} from 'react-native-reanimated';
import { theme } from '@/styles/theme';

export function CaptureButton({ onPress }: { onPress: () => void }) {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const handlePress = () => {
        // Capture animation
        scale.value = withSequence(
            withSpring(0.85, { damping: 10 }),
            withSpring(1, { damping: 10 })
        );

        opacity.value = withSequence(
            withSpring(0.6),
            withSpring(1)
        );

        onPress();
    };

    return (
        <Pressable onPress={handlePress}>
            <Animated.View style={[styles.button, animatedStyle]}>
                <View style={styles.inner} />
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.neutral[50],
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.lg,
    },
    inner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme.colors.primary[500],
    },
});