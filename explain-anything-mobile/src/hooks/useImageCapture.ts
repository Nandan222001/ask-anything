// src/hooks/useImageCapture.ts
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { ImageProcessingService } from '@/services/image/ImageProcessingService';
import { apiClient } from '@/lib/api/client';
import { logger } from '@/utils/logger';
import * as FileSystem from 'expo-file-system';

export function useImageCapture() {
    const [isProcessing, setIsProcessing] = useState(false);
    const { user } = useAuthStore();

    const captureImage = async (uri: string) => {
        if (!user) {
            throw new Error('User not authenticated');
        }

        setIsProcessing(true);

        try {
            // Read image file
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // Detect MIME type
            const mimeType = uri.toLowerCase().endsWith('.png')
                ? 'image/png'
                : 'image/jpeg';

            const dataUrl = `data:${mimeType};base64,${base64}`;

            // Upload and create explanation
            const response = await apiClient.post('/v1/explanations', {
                image: dataUrl,
                isDeveloperMode: false,
            });

            logger.info('Explanation created', { id: response.data.id });

            return response.data;

        } catch (error) {
            logger.error('Image capture failed', error);
            throw error;
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        captureImage,
        isProcessing,
    };
}