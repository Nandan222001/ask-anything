import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'Point & Understand',
        description: 'Snap a photo of anything and get instant, clear explanations',
        emoji: '📸',
    },
    {
        id: '2',
        title: 'Ask Questions',
        description: 'Dive deeper with follow-up questions to fully understand',
        emoji: '💬',
    },
    {
        id: '3',
        title: 'Learn Anything',
        description: "From homework help to translating menus, we've got you covered",
        emoji: '🎓',
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            handleGetStarted();
        }
    };

    const handleSkip = () => {
        handleGetStarted();
    };

    const handleGetStarted = () => {
        router.replace('/(tabs)');
    };

    const currentSlide = SLIDES[currentIndex];

    return (
        <View style={styles.container}>
            {/* Slide Content */}
            <View style={styles.slideContainer}>
                <Text style={styles.emoji}>{currentSlide.emoji}</Text>
                <Text style={styles.title}>{currentSlide.title}</Text>
                <Text style={styles.description}>{currentSlide.description}</Text>
            </View>

            {/* Pagination Dots */}
            <View style={styles.pagination}>
                {SLIDES.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.dot,
                            index === currentIndex && styles.dotActive,
                        ]}
                    />
                ))}
            </View>

            {/* Bottom Actions */}
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'space-between',
        paddingTop: 100,
        paddingBottom: 40,
    },
    slideContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    emoji: {
        fontSize: 120,
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
    },
    description: {
        fontSize: 18,
        color: '#666',
        textAlign: 'center',
        lineHeight: 26,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 32,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#D4D4D4',
    },
    dotActive: {
        width: 24,
        backgroundColor: '#6366F1',
    },
    bottomActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 32,
    },
    skipButton: {
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    skipText: {
        fontSize: 16,
        color: '#666',
    },
    nextButton: {
        paddingVertical: 16,
        paddingHorizontal: 32,
        backgroundColor: '#6366F1',
        borderRadius: 12,
    },
    nextText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    getStartedButton: {
        flex: 1,
        paddingVertical: 16,
        backgroundColor: '#6366F1',
        borderRadius: 12,
        alignItems: 'center',
    },
    getStartedText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
});