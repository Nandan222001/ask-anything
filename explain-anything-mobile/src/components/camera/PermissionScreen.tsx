import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PermissionScreenProps {
    onRequestPermission: () => void;
}

export default function PermissionScreen({ onRequestPermission }: PermissionScreenProps) {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Ionicons name="camera-outline" size={80} color="#6366F1" />

                <Text style={styles.title}>Camera Access Needed</Text>

                <Text style={styles.description}>
                    We need camera permission to capture images for explanation
                </Text>

                <Pressable style={styles.button} onPress={onRequestPermission}>
                    <Text style={styles.buttonText}>Grant Permission</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 32,
    },
    content: {
        alignItems: 'center',
        maxWidth: 300,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 24,
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    button: {
        backgroundColor: '#6366F1',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
        width: '100%',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
});