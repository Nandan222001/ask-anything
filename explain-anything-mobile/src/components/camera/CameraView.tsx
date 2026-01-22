// src/components/camera/CameraView.tsx
import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Alert, Platform } from 'react-native';
import { CameraView as ExpoCameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles/theme';
import { CaptureButton } from './CaptureButton';
import { FlashToggle } from './FlashToggle';
import { FocusRing } from './FocusRing';
import { PermissionScreen } from './PermissionScreen';
import { useImageCapture } from '@/hooks/useImageCapture';
import { useCameraStore } from '@/store/cameraStore';
import { HapticFeedback } from '@/utils/haptics';

export function CameraView() {
    const router = useRouter();
    const cameraRef = useRef<ExpoCameraView>(null);
    const [permission, requestPermission] = useCameraPermissions();

    // Store
    const {
        facing,
        flashMode,
        zoom,
        toggleFacing,
        setFlashMode,
        setZoom,
    } = useCameraStore();

    // Hooks
    const { captureImage, isProcessing } = useImageCapture();

    // State
    const [isReady, setIsReady] = useState(false);
    const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);

    // Animations
    const overlayOpacity = useSharedValue(0);
    const captureScale = useSharedValue(1);

    useEffect(() => {
        // Fade in overlay when camera is ready
        if (isReady) {
            overlayOpacity.value = withTiming(1, { duration: 300 });
        }
    }, [isReady]);

    // Request permissions if needed
    if (!permission) {
        return <View style={styles.container} />;
    }

    if (!permission.granted) {
        return <PermissionScreen onRequestPermission={requestPermission} />;
    }

    /**
     * Handle camera capture
     */
    const handleCapture = async () => {
        if (!cameraRef.current || isProcessing) return;

        try {
            HapticFeedback.impact('medium');

            // Animate capture
            captureScale.value = withSpring(0.95, { damping: 10 }, () => {
                captureScale.value = withSpring(1);
            });

            // Take picture
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
                base64: false,
                skipProcessing: false,
            });

            if (!photo) {
                throw new Error('Failed to capture photo');
            }

            // Process and upload
            const result = await captureImage(photo.uri);

            // Navigate to explanation
            router.push(`/explain/${result.id}`);

        } catch (error) {
            console.error('Capture failed:', error);
            Alert.alert('Error', 'Failed to capture image. Please try again.');
        }
    };

    /**
     * Handle tap to focus
     */
    const handleFocus = async (event: any) => {
        const { locationX, locationY } = event.nativeEvent;

        setFocusPoint({ x: locationX, y: locationY });
        HapticFeedback.selection();

        // Clear focus ring after animation
        setTimeout(() => setFocusPoint(null), 1500);
    };

    /**
     * Handle pinch to zoom
     */
    const handlePinch = (scale: number) => {
        const newZoom = Math.max(0, Math.min(1, zoom + scale * 0.01));
        setZoom(newZoom);
    };

    const overlayStyle = useAnimatedStyle(() => ({
        opacity: overlayOpacity.value,
    }));

    const cameraContainerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: captureScale.value }],
    }));

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.cameraContainer, cameraContainerStyle]}>
                <ExpoCameraView
                    ref={cameraRef}
                    style={styles.camera}
                    facing={facing}
                    flash={flashMode}
                    zoom={zoom}
                    onCameraReady={() => setIsReady(true)}
                    onTouchEnd={handleFocus}
                >
                    {/* Focus ring */}
                    {focusPoint && <FocusRing x={focusPoint.x} y={focusPoint.y} />}
                </ExpoCameraView>
            </Animated.View>

            {/* Overlay controls */}
            <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="box-none">
                {/* Top controls */}
                <View style={styles.topControls}>
                    <FlashToggle
                        mode={flashMode}
                        onToggle={(mode) => {
                            setFlashMode(mode);
                            HapticFeedback.selection();
                        }}
                    />

                    <Pressable
                        style={styles.settingsButton}
                        onPress={() => {
                            HapticFeedback.selection();
                            router.push('/settings');
                        }}
                    >
                        <Ionicons name="settings-outline" size={24} color="#fff" />
                    </Pressable>
                </View>

                {/* Center hint text */}
                <View style={styles.centerHint}>
                    <Animated.Text style={styles.hintText}>
                        Point at anything to explain
                    </Animated.Text>
                </View>

                {/* Bottom controls */}
                <View style={styles.bottomControls}>
                    {/* Flip camera button */}
                    <Pressable
                        style={styles.flipButton}
                        onPress={() => {
                            toggleFacing();
                            HapticFeedback.selection();
                        }}
                    >
                        <Ionicons name="camera-reverse-outline" size={32} color="#fff" />
                    </Pressable>

                    {/* Capture button */}
                    <CaptureButton
                        onPress={handleCapture}
                        disabled={isProcessing || !isReady}
                        isProcessing={isProcessing}
                    />

                    {/* History button */}
                    <Pressable
                        style={styles.historyButton}
                        onPress={() => {
                            HapticFeedback.selection();
                            router.push('/(tabs)/history');
                        }}
                    >
                        <Ionicons name="time-outline" size={32} color="#fff" />
                    </Pressable>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    cameraContainer: {
        flex: 1,
    },
    camera: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
    },
    topControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingTop: Platform.OS === 'ios' ? 60 : theme.spacing.xl,
    },
    settingsButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerHint: {
        alignItems: 'center',
    },
    hintText: {
        fontSize: theme.typography.fontSize.base,
        color: '#fff',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.full,
        overflow: 'hidden',
    },
    bottomControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.xl,
        paddingBottom: Platform.OS === 'ios' ? 40 : theme.spacing.xl,
    },
    flipButton: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    historyButton: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
});