// src/components/camera/CameraView.tsx
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { CameraView as ExpoCameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

export default function CameraView() {
    const [permission, requestPermission] = useCameraPermissions();

    // Loading state
    if (!permission) {
        return (
            <View style={styles.container}>
                <Text>Loading...</Text>
            </View>
        );
    }

    // Permission not granted
    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Ionicons name="camera-outline" size={80} color="#6366F1" />

                <Text style={styles.permissionTitle}>Camera Access Needed</Text>

                <Text style={styles.permissionText}>
                    We need camera permission to capture images for explanation
                </Text>

                <Pressable style={styles.permissionButton} onPress={requestPermission}>
                    <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </Pressable>
            </View>
        );
    }

    // Camera ready
    return (
        <View style={styles.container}>
            <ExpoCameraView style={styles.camera} facing="back">
                <View style={styles.overlay}>
                    <Text style={styles.hint}>Point at anything to explain</Text>
                </View>
            </ExpoCameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 32,
    },
    permissionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 24,
        marginBottom: 12,
        textAlign: 'center',
    },
    permissionText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    permissionButton: {
        backgroundColor: '#6366F1',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
        minWidth: 200,
    },
    permissionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hint: {
        fontSize: 16,
        color: '#fff',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
    },
});