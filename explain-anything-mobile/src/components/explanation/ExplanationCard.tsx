// src/components/explanation/ExplanationCard.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    FadeInDown,
    FadeOutUp,
    Layout,
} from 'react-native-reanimated';
import { theme } from '@/styles/theme';
import { ExplanationResponse } from '@/services/explanation/ExplanationService';
import { formatDistanceToNow } from 'date-fns';
import { HapticFeedback } from '@/utils/haptics';

interface ExplanationCardProps {
    explanation: ExplanationResponse;
    onToggleFavorite?: (id: string) => void;
    index?: number;
}

export function ExplanationCard({
    explanation,
    onToggleFavorite,
    index = 0,
}: ExplanationCardProps) {
    const router = useRouter();
    const [imageLoaded, setImageLoaded] = useState(false);

    const handlePress = () => {
        HapticFeedback.selection();
        router.push(`/explain/${explanation.id}`);
    };

    const handleShare = async () => {
        HapticFeedback.impact('light');

        try {
            await Share.share({
                message: explanation.explanation,
                title: 'Check out this explanation!',
            });
        } catch (error) {
            console.error('Share failed:', error);
        }
    };

    const handleFavorite = () => {
        HapticFeedback.impact('medium');
        onToggleFavorite?.(explanation.id);
    };

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 100).springify()}
            exiting={FadeOutUp}
            layout={Layout.springify()}
        >
            <Pressable onPress={handlePress} style={styles.container}>
                <View style={styles.card}>
                    {/* Image */}
                    <View style={styles.imageContainer}>
                        {!imageLoaded && (
                            <View style={styles.imagePlaceholder}>
                                <Ionicons
                                    name="image-outline"
                                    size={40}
                                    color={theme.colors.neutral[400]}
                                />
                            </View>
                        )}
                        <Image
                            source={{ uri: explanation.thumbnailUrl }}
                            style={styles.image}
                            onLoad={() => setImageLoaded(true)}
                            resizeMode="cover"
                        />

                        {/* Category badge */}
                        <View style={styles.categoryBadge}>
                            <Text style={styles.categoryText}>
                                {explanation.category}
                            </Text>
                        </View>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        {/* Explanation text */}
                        <Text style={styles.explanation} numberOfLines={3}>
                            {explanation.explanation}
                        </Text>

                        {/* Tags */}
                        {explanation.tags.length > 0 && (
                            <View style={styles.tags}>
                                {explanation.tags.slice(0, 3).map((tag, idx) => (
                                    <View key={idx} style={styles.tag}>
                                        <Text style={styles.tagText}>#{tag}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Footer */}
                        <View style={styles.footer}>
                            <Text style={styles.timestamp}>
                                {formatDistanceToNow(new Date(explanation.createdAt), {
                                    addSuffix: true,
                                })}
                            </Text>

                            <View style={styles.actions}>
                                {/* Favorite button */}
                                <Pressable onPress={handleFavorite} style={styles.actionButton}>
                                    <Ionicons
                                        name={explanation.isFavorited ? 'heart' : 'heart-outline'}
                                        size={20}
                                        color={
                                            explanation.isFavorited
                                                ? theme.colors.error
                                                : theme.colors.neutral[600]
                                        }
                                    />
                                </Pressable>

                                {/* Share button */}
                                <Pressable onPress={handleShare} style={styles.actionButton}>
                                    <Ionicons
                                        name="share-outline"
                                        size={20}
                                        color={theme.colors.neutral[600]}
                                    />
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: theme.spacing.md,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
        ...theme.shadows.md,
    },
    imageContainer: {
        width: '100%',
        height: 200,
        backgroundColor: theme.colors.neutral[100],
        position: 'relative',
    },
    imagePlaceholder: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    categoryBadge: {
        position: 'absolute',
        top: theme.spacing.sm,
        right: theme.spacing.sm,
        backgroundColor: theme.colors.primary[500],
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.sm,
    },
    categoryText: {
        fontSize: theme.typography.fontSize.xs,
        fontWeight: theme.typography.fontWeight.semibold,
        color: '#fff',
        textTransform: 'capitalize',
    },
    content: {
        padding: theme.spacing.md,
    },
    explanation: {
        fontSize: theme.typography.fontSize.base,
        lineHeight: theme.typography.lineHeight.relaxed * theme.typography.fontSize.base,
        color: theme.colors.neutral[800],
        marginBottom: theme.spacing.sm,
    },
    tags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.sm,
    },
    tag: {
        backgroundColor: theme.colors.primary[50],
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.sm,
    },
    tagText: {
        fontSize: theme.typography.fontSize.xs,
        color: theme.colors.primary[700],
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timestamp: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.neutral[500],
    },
    actions: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    actionButton: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
});