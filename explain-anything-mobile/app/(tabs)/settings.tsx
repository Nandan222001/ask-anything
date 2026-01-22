// app/(tabs)/settings.tsx
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Switch,
    Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '@/styles/theme';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { HapticFeedback } from '@/utils/haptics';
import { version } from '../../../package.json';

export default function SettingsScreen() {
    const router = useRouter();
    const { user, signOut } = useAuthStore();
    const {
        isDeveloperMode,
        notificationsEnabled,
        hapticsEnabled,
        toggleDeveloperMode,
        toggleNotifications,
        toggleHaptics,
    } = useSettingsStore();

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        await signOut();
                        router.replace('/sign-in');
                    },
                },
            ]
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'This will permanently delete your account and all your data. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        // Implement account deletion
                        console.log('Delete account');
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'Settings',
                    headerShown: true,
                }}
            />

            <ScrollView style={styles.content}>
                {/* Profile Section */}
                <Animated.View
                    entering={FadeInDown.delay(100)}
                    style={styles.section}
                >
                    <View style={styles.profileHeader}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {user?.fullName?.[0]?.toUpperCase() || 'U'}
                            </Text>
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>{user?.fullName || 'User'}</Text>
                            <Text style={styles.profileEmail}>{user?.email}</Text>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>
                                    {user?.subscriptionTier?.toUpperCase() || 'FREE'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </Animated.View>

                {/* Subscription Section */}
                {user?.subscriptionTier === 'free' && (
                    <Animated.View
                        entering={FadeInDown.delay(200)}
                        style={styles.section}
                    >
                        <Pressable
                            style={styles.upgradeCard}
                            onPress={() => {
                                HapticFeedback.selection();
                                router.push('/paywall');
                            }}
                        >
                            <View style={styles.upgradeContent}>
                                <Ionicons
                                    name="rocket-outline"
                                    size={32}
                                    color={theme.colors.primary[500]}
                                />
                                <View style={styles.upgradeText}>
                                    <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
                                    <Text style={styles.upgradeDescription}>
                                        Unlimited explanations, priority support, and more
                                    </Text>
                                </View>
                            </View>
                            <Ionicons
                                name="chevron-forward"
                                size={20}
                                color={theme.colors.neutral[400]}
                            />
                        </Pressable>
                    </Animated.View>
                )}

                {/* Usage Stats */}
                <Animated.View
                    entering={FadeInDown.delay(300)}
                    style={styles.section}
                >
                    <Text style={styles.sectionTitle}>Usage</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{user?.totalExplanations || 0}</Text>
                            <Text style={styles.statLabel}>Total</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{user?.dailyUsageCount || 0}</Text>
                            <Text style={styles.statLabel}>Today</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>
                                {user?.subscriptionTier === 'free' ? '10' : '∞'}
                            </Text>
                            <Text style={styles.statLabel}>Daily Limit</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Preferences */}
                <Animated.View
                    entering={FadeInDown.delay(400)}
                    style={styles.section}
                >
                    <Text style={styles.sectionTitle}>Preferences</Text>

                    <View style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Ionicons
                                name="code-slash-outline"
                                size={20}
                                color={theme.colors.neutral[600]}
                            />
                            <View style={styles.settingText}>
                                <Text style={styles.settingLabel}>Developer Mode</Text>
                                <Text style={styles.settingDescription}>
                                    Get technical explanations for code and errors
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={isDeveloperMode}
                            onValueChange={(value) => {
                                HapticFeedback.selection();
                                toggleDeveloperMode();
                            }}
                            trackColor={{
                                false: theme.colors.neutral[300],
                                true: theme.colors.primary[500],
                            }}
                        />
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Ionicons
                                name="notifications-outline"
                                size={20}
                                color={theme.colors.neutral[600]}
                            />
                            <View style={styles.settingText}>
                                <Text style={styles.settingLabel}>Notifications</Text>
                                <Text style={styles.settingDescription}>
                                    Get notified when explanations are ready
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={(value) => {
                                HapticFeedback.selection();
                                toggleNotifications();
                            }}
                            trackColor={{
                                false: theme.colors.neutral[300],
                                true: theme.colors.primary[500],
                            }}
                        />
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingLeft}>
                            <Ionicons
                                name="phone-portrait-outline"
                                size={20}
                                color={theme.colors.neutral[600]}
                            />
                            <View style={styles.settingText}>
                                <Text style={styles.settingLabel}>Haptic Feedback</Text>
                                <Text style={styles.settingDescription}>
                                    Vibrate on button presses
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={hapticsEnabled}
                            onValueChange={(value) => {
                                HapticFeedback.selection();
                                toggleHaptics();
                            }}
                            trackColor={{
                                false: theme.colors.neutral[300],
                                true: theme.colors.primary[500],
                            }}
                        />
                    </View>
                </Animated.View>

                {/* Account Actions */}
                <Animated.View
                    entering={FadeInDown.delay(500)}
                    style={styles.section}
                >
                    <Text style={styles.sectionTitle}>Account</Text>

                    {user?.subscriptionTier !== 'free' && (
                        <Pressable
                            style={styles.menuItem}
                            onPress={() => {
                                HapticFeedback.selection();
                                router.push('/settings/billing');
                            }}
                        >
                            <Ionicons
                                name="card-outline"
                                size={20}
                                color={theme.colors.neutral[600]}
                            />
                            <Text style={styles.menuLabel}>Billing & Subscription</Text>
                            <Ionicons
                                name="chevron-forward"
                                size={20}
                                color={theme.colors.neutral[400]}
                            />
                        </Pressable>
                    )}

                    <Pressable
                        style={styles.menuItem}
                        onPress={() => {
                            HapticFeedback.selection();
                            router.push('/settings/privacy');
                        }}
                    >
                        <Ionicons
                            name="shield-outline"
                            size={20}
                            color={theme.colors.neutral[600]}
                        />
                        <Text style={styles.menuLabel}>Privacy & Data</Text>
                        <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={theme.colors.neutral[400]}
                        />
                    </Pressable>

                    <Pressable
                        style={styles.menuItem}
                        onPress={handleSignOut}
                    >
                        <Ionicons
                            name="log-out-outline"
                            size={20}
                            color={theme.colors.neutral[600]}
                        />
                        <Text style={styles.menuLabel}>Sign Out</Text>
                    </Pressable>

                    <Pressable
                        style={styles.menuItem}
                        onPress={handleDeleteAccount}
                    >
                        <Ionicons
                            name="trash-outline"
                            size={20}
                            color={theme.colors.error}
                        />
                        <Text style={[styles.menuLabel, styles.dangerText]}>
                            Delete Account
                        </Text>
                    </Pressable>
                </Animated.View>

                {/* Support */}
                <Animated.View
                    entering={FadeInDown.delay(600)}
                    style={styles.section}
                >
                    <Text style={styles.sectionTitle}>Support</Text>

                    <Pressable
                        style={styles.menuItem}
                        onPress={() => {
                            HapticFeedback.selection();
                            // Open help center
                        }}
                    >
                        <Ionicons
                            name="help-circle-outline"
                            size={20}
                            color={theme.colors.neutral[600]}
                        />
                        <Text style={styles.menuLabel}>Help Center</Text>
                        <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={theme.colors.neutral[400]}
                        />
                    </Pressable>

                    <Pressable
                        style={styles.menuItem}
                        onPress={() => {
                            HapticFeedback.selection();
                            // Open feedback form
                        }}
                    >
                        <Ionicons
                            name="chatbubble-outline"
                            size={20}
                            color={theme.colors.neutral[600]}
                        />
                        <Text style={styles.menuLabel}>Send Feedback</Text>
                        <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={theme.colors.neutral[400]}
                        />
                    </Pressable>
                </Animated.View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Explain Anything v{version}</Text>
                    <Text style={styles.footerText}>Made with ❤️ for curious minds</Text>
                </View>
            </ScrollView>
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
    section: {
        backgroundColor: '#fff',
        marginBottom: theme.spacing.md,
        paddingVertical: theme.spacing.md,
    },
    sectionTitle: {
        fontSize: theme.typography.fontSize.sm,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.neutral[500],
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme.colors.primary[500],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    avatarText: {
        fontSize: 28,
        fontWeight: theme.typography.fontWeight.bold,
        color: '#fff',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.neutral[900],
        marginBottom: 4,
    },
    profileEmail: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.neutral[600],
        marginBottom: theme.spacing.sm,
    },
    badge: {
        alignSelf: 'flex-start',
        backgroundColor: theme.colors.primary[100],
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.sm,
    },
    badgeText: {
        fontSize: theme.typography.fontSize.xs,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.primary[700],
    },
    upgradeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.primary[50],
        marginHorizontal: theme.spacing.md,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.primary[200],
    },
    upgradeContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    upgradeText: {
        marginLeft: theme.spacing.md,
        flex: 1,
    },
    upgradeTitle: {
        fontSize: theme.typography.fontSize.base,
        fontWeight: theme.typography.fontWeight.semibold,
        color: theme.colors.primary[900],
        marginBottom: 4,
    },
    upgradeDescription: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.primary[700],
    },
    statsGrid: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
    },
    statCard: {
        flex: 1,
        backgroundColor: theme.colors.neutral[50],
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 28,
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.primary[600],
        marginBottom: 4,
    },
    statLabel: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.neutral[600],
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.neutral[100],
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingText: {
        marginLeft: theme.spacing.md,
        flex: 1,
    },
    settingLabel: {
        fontSize: theme.typography.fontSize.base,
        fontWeight: theme.typography.fontWeight.medium,
        color: theme.colors.neutral[900],
        marginBottom: 4,
    },
    settingDescription: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.neutral[600],
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.neutral[100],
        gap: theme.spacing.md,
    },
    menuLabel: {
        flex: 1,
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.neutral[900],
    },
    dangerText: {
        color: theme.colors.error,
    },
    footer: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xl,
        gap: theme.spacing.xs,
    },
    footerText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.neutral[500],
    },
});