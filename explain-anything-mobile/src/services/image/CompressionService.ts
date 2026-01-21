// src/services/image/CompressionService.ts
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export class CompressionService {
    async compressForUpload(uri: string): Promise<string> {
        const result = await manipulateAsync(
            uri,
            [
                { resize: { width: 1920 } }, // Max width 1920px
            ],
            {
                compress: 0.8,
                format: SaveFormat.JPEG,
            }
        );

        return result.uri;
    }

    async createThumbnail(uri: string): Promise<string> {
        const result = await manipulateAsync(
            uri,
            [
                { resize: { width: 400, height: 400 } },
            ],
            {
                compress: 0.7,
                format: SaveFormat.JPEG,
            }
        );

        return result.uri;
    }
}