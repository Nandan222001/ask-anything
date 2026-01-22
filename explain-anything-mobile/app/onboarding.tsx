// app/onboarding.tsx
import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Pressable,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
    useAnimatedScrollHandler,
    useSharedValue,
    useAnimatedStyle,
    interpolate,
    Extrapolate,
} from 'react-native-reanimated';
import { theme } from '@/styles/theme';
import { HapticFeedback } from '@/utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'Point & Understand',
        description: 'Snap a photo of anything and get instant, clear explanations',
        image: require('@/assets/onboarding/slide1.png'),
    },
    {
        id: '2',
        title: 'Ask Questions',
        description: 'Dive deeper with follow-up questions to fully understand',
        image: require('@/assets/onboarding/slide2.png'),
    },
    {
        id: '3',
        title: 'Learn Anything',
        description: 'From homework help to translating menus, we\'ve got you covered',
        image: require('@/assets/onboarding/slide3.png'),
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const scrollViewRef = useRef<any>(null);
    const scrollX = useSharedValue(0);
    const [currentIndex, setCurrentIndex] = useState(0);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
        },
    });

    const handleNext = () => {
        HapticFeedback.selection();

        if (currentIndex < SLIDES.length - 1) {
            scrollViewRef.current?.scrollTo({
                x: SCREEN_WIDTH * (currentIndex + 1),
                animated: true,
            });
            setCurrentIndex(currentIndex + 1);
        } else {
            handleGetStarted();
        }
    };

    const handleSkip = () => {
        HapticFeedback.selection();
        handleGetStarted();
    };

    const handleGetStarted = async () => {
        await AsyncStorage.setItem('hasSeenOnboarding', 'true');
        router.replace('/sign-up');
    };

    return (
        <View style={styles.container}>
            {/* Slides */}
            <Animated.ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                onMomentumScrollEnd={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                    setCurrentIndex(index);
                }}
            >
                {SLIDES.map((slide, index) => (
                    <View key={slide.id} style={styles.slide}>
                        <SlideContent
                            slide={slide}
                            index={index}
                            scrollX={scrollX}
                        />
                    </View>
                ))}
            </Animated.ScrollView>

            {/* Pagination dots */}
            <View style={styles.pagination}>
                {SLIDES.map((_, index) => (
                    <PaginationDot
                        key={index}
                        index={index}
                        scrollX={scrollX}
                    />
                ))}
            </View>

            {/* Bottom actions */}
            <View style={styles.bottomActions}>
                {currentIndex < SLIDES.length - 1 ? (
                    <>
                        <Pressable onPress={handleSkip} style={styles.skipButton}>
                            <Text style={styles.skipText}>Skip</Text>
                        </Pressable>
                        <Pressable onPress={handleNext} style={styles.nextButton}>
                            <Text style={styles.nextText}>Next</Text>
                        </Pressable>
                    </>
                ) : (
                    <Pressable onPress={handleGetStarted} style={styles.getStartedButton}>
                        <Text style={styles.getStartedText}>Get Started</Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
}

function SlideContent({
    slide,
    index,
    scrollX,
}: {
    slide: typeof SLIDES[0];
    index: number;
    scrollX: Animated.SharedValue<number>;
}) {
    const imageAnimatedStyle = useAnimatedStyle(() => {
        const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
        ];

        const scale = interpolate(
            scrollX.value,
            inputRange,
            [0.8, 1, 0.8],
            Extrapolate.CLAMP
        );

        const opacity = interpolate(
            scrollX.value,
            inputRange,
            [0.5, 1, 0.5],
            Extrapolate.CLAMP
        );

        return {
            transform: [{ scale }],
            opacity,
        };
    });

    const textAnimatedStyle = useAnimatedStyle(() => {
        const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
        ];

        const translateY = interpolate(
            scrollX.value,
            inputRange,
            [50, 0, 50],
            Extrapolate.CLAMP
        );

        const opacity = interpolate(
            scrollX.value,
            inputRange,
            [0, 1, 0],
            Extrapolate.CLAMP
        );

        return {
            transform: [{ translateY }],
            opacity,
        };
    });

    return (
        <>
            <Animated.View style={[styles.imageContainer, imageAnimatedStyle]}>
                <Image source={slide.image} style={styles.image} resizeMode="contain" />
            </Animated.View>

            <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
                <Text style={styles.title}>{slide.title}</Text>
                <Text style={styles.description}>{slide.description}</Text>
            </Animated.View>
        </>
    );
}

function PaginationDot({
    index,
    scrollX,
}: {
    index: number;
    scrollX: Animated.SharedValue<number>;
}) {
    const animatedStyle = useAnimatedStyle(() => {
        const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
        ];

        const width = interpolate(
            scrollX.value,
            inputRange,
            [8, 24, 8],
            Extrapolate.CLAMP
        );

        const opacity = interpolate(
            scrollX.value,
            inputRange,
            [0.3, 1, 0.3],
            Extrapolate.CLAMP
        );

        return {
            width,
            opacity,
        };
    });

    return <Animated.View style={[styles.dot, animatedStyle]} />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    slide: {
        width: SCREEN_WIDTH,
        flex: 1,
        paddingHorizontal: theme.spacing.xl,
        paddingTop: 100,
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: SCREEN_WIDTH * 0.8,
        height: SCREEN_WIDTH * 0.8,
    },
    textContainer: {
        paddingBottom: 100,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.neutral[900],
        textAlign: 'center',
        marginBottom: theme.spacing.md,
    },
    description: {
        fontSize: theme.typography.fontSize.lg,
        color: theme.colors.neutral[600],
        textAlign: 'center',
        lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.lg,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.xl,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.primary[500],
    },
    bottomActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.xl,
        paddingBottom: 40,
    },
    skipButton: {
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
    },
    skipText: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.neutral[600],
    },
    nextButton: {
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xl,
        backgroundColor: theme.colors.primary[500],
        borderRadius: theme.borderRadius.lg,
    },
    nextText: {
        fontSize: theme.typography.fontSize.base,
        fontWeight: theme.typography.fontWeight.semibold,
        color: '#fff',
    },
    getStartedButton: {
        flex: 1,
        paddingVertical: theme.spacing.md,
        backgroundColor: theme.colors.primary[500],
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
    },
    getStartedText: {
        fontSize: theme.typography.fontSize.lg,
        fontWeight: theme.typography.fontWeight.semibold,
        color: '#fff',
    },
});