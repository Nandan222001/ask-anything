// app/(tabs)/history.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    TextInput,
    RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { theme } from '@/styles/theme';
import { ExplanationCard } from '@/components/explanation/ExplanationCard';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSkeleton } from '@/components/ui/Skeleton';
import { useExplanationList } from '@/hooks/useExplanationList';
import { HapticFeedback } from '@/utils/haptics';

const CATEGORIES = [
    { id: 'all', label: 'All', icon: 'apps-outline' },
    { id: 'education', label: 'Education', icon: 'school-outline' },
    { id: 'code', label: 'Code', icon: 'code-slash-outline' },
    { id: 'translation', label: 'Translation', icon: 'language-outline' },
    { id: 'identification', label: 'ID', icon: 'eye-outline' },
];

export default function HistoryScreen() {
    const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
    const [searchQuery, setSearchQuery] = useState('');
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

    const {
        explanations,
        isLoading,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch,
        toggleFavorite,
    } = useExplanationList({
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        search: searchQuery || undefined,
        favoritesOnly: showFavoritesOnly,
    });

    const handleCategoryPress = (categoryId: string) => {
        HapticFeedback.selection();
        setSelectedCategory(categoryId === 'all' ? undefined : categoryId);
    };

    const handleToggleFavorites = () => {
        HapticFeedback.selection();
        setShowFavoritesOnly(!showFavoritesOnly);
    };

    const handleLoadMore = () => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    const renderHeader = () => (
        <View style={styles.header}>
            {/* Search bar */}
            <View style={styles.searchContainer}>
                <Ionicons
                    name="search-outline"
                    size={20}
                    color={theme.colors.neutral[400]}
                    style={styles.searchIcon}
                />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search explanations..."
                    placeholderTextColor={theme.colors.neutral[400]}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                    <Pressable
                        onPress={() => setSearchQuery('')}
                        style={styles.clearButton}
                    >
                        <Ionicons
                            name="close-circle"
                            size={20}
                            color={theme.colors.neutral[400]}
                        />
                    </Pressable>
                )}
            </View>

            {/* Favorites toggle */}
            <Pressable
                onPress={handleToggleFavorites}
                style={[
                    styles.favoritesButton,
                    showFavoritesOnly && styles.favoritesButtonActive,
                ]}
            >
                <Ionicons
                    name={showFavoritesOnly ? 'heart' : 'heart-outline'}
                    size={20}
                    color={showFavoritesOnly ? '#fff' : theme.colors.neutral[600]}
                />
            </Pressable>

            {/* Category filters */}
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={CATEGORIES}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.categories}
                renderItem={({ item }) => (
                    <Pressable
                        onPress={() => handleCategoryPress(item.id)}
                        style={[
                            styles.categoryChip,
                            (selectedCategory === item.id ||
                                (item.id === 'all' && !selectedCategory)) &&
                            styles.categoryChipActive,
                        ]}
                    >
                        <Ionicons
                            name={item.icon as any}
                            size={16}
                            color={
                                selectedCategory === item.id ||
                                    (item.id === 'all' && !selectedCategory)
                                    ? '#fff'
                                    : theme.colors.neutral[600]
                            }
                        />
                        <Text
                            style={[
                                styles.categoryLabel,
                                (selectedCategory === item.id ||
                                    (item.id === 'all' && !selectedCategory)) &&
                                styles.categoryLabelActive,
                            ]}
                        >
                            {item.label}
                        </Text>
                    </Pressable>
                )}
            />
        </View>
    );

    const renderFooter = () => {
        if (!isFetchingNextPage) return null;
        return (
            <View style={styles.loadingMore}>
                <LoadingSkeleton height={200} />
            </View>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: 'History' }} />
                <View style={styles.content}>
                    {renderHeader()}
                    <LoadingSkeleton height={200} style={styles.skeleton} />
                    <LoadingSkeleton height={200} style={styles.skeleton} />
                    <LoadingSkeleton height={200} style={styles.skeleton} />
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: 'History' }} />
                <EmptyState
                    icon="alert-circle-outline"
                    title="Something went wrong"
                    description="Failed to load your explanations"
                    actionLabel="Try Again"
                    onAction={() => refetch()}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'History',
                    headerShown: true,
                }}
            />

            <FlatList
                data={explanations}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                    <ExplanationCard
                        explanation={item}
                        onToggleFavorite={toggleFavorite}
                        index={index}
                    />
                )}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={
                    <EmptyState
                        icon={showFavoritesOnly ? 'heart-outline' : 'camera-outline'}
                        title={
                            showFavoritesOnly
                                ? 'No favorites yet'
                                : searchQuery
                                    ? 'No results found'
                                    : 'No explanations yet'
                        }
                        description={
                            showFavoritesOnly
                                ? 'Tap the heart icon on explanations to save them here'
                                : searchQuery
                                    ? 'Try a different search term'
                                    : 'Start by taking a photo of something'
                        }
                    />
                }
                contentContainerStyle={styles.listContent}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                refreshControl={
                    <RefreshControl
                        refreshing={false}
                        onRefresh={refetch}
                        tintColor={theme.colors.primary[500]}
                    />
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.neutral[50],
    },
    content: {
        flex: 1,
    },
    header: {
        padding: theme.spacing.md,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.neutral[200],
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.neutral[50],
        borderRadius: theme.borderRadius.lg,
        paddingHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    searchIcon: {
        marginRight: theme.spacing.sm,
    },
    searchInput: {
        flex: 1,
        height: 44,
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.neutral[900],
    },
    clearButton: {
        padding: theme.spacing.xs,
    },
    favoritesButton: {
        position: 'absolute',
        top: theme.spacing.md,
        right: theme.spacing.md,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.neutral[100],
        justifyContent: 'center',
        alignItems: 'center',
    },
    favoritesButtonActive: {
        backgroundColor: theme.colors.error,
    },
    categories: {
        gap: theme.spacing.sm,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.neutral[100],
    },
    categoryChipActive: {
        backgroundColor: theme.colors.primary[500],
    },
    categoryLabel: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.neutral[600],
    },
    categoryLabelActive: {
        color: '#fff',
    },
    listContent: {
        padding: theme.spacing.md,
        flexGrow: 1,
    },
    skeleton: {
        marginBottom: theme.spacing.md,
        marginHorizontal: theme.spacing.md,
    },
    loadingMore: {
        padding: theme.spacing.md,
    },
});