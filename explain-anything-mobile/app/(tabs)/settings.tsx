import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Feature coming soon!');
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Settings', headerShown: true }} />

            <ScrollView style={styles.content}>
                <View style={styles.section}>
                    <View style={styles.profileHeader}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>U</Text>
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>User</Text>
                            <Text style={styles.profileEmail}>user@example.com</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Pressable style={styles.menuItem}>
                        <Ionicons name="person-outline" size={20} color="#525252" />
                        <Text style={styles.menuLabel}>Account</Text>
                        <Ionicons name="chevron-forward" size={20} color="#A3A3A3" />
                    </Pressable>

                    <Pressable style={styles.menuItem} onPress={handleSignOut}>
                        <Ionicons name="log-out-outline" size={20} color="#525252" />
                        <Text style={styles.menuLabel}>Sign Out</Text>
                    </Pressable>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Explain Anything v1.0.0</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        flex: 1,
    },
    section: {
        backgroundColor: '#fff',
        marginBottom: 16,
        paddingVertical: 16,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#6366F1',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 4,
    },
    profileEmail: {
        fontSize: 14,
        color: '#737373',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    menuLabel: {
        flex: 1,
        fontSize: 16,
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    footerText: {
        fontSize: 14,
        color: '#737373',
    },
});