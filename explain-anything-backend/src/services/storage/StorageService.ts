// src/services/storage/StorageService.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';
import { ImageProcessingService } from '@/services/image/ImageProcessingService';

export class StorageService {
    private supabase: SupabaseClient;
    private imageProcessor: ImageProcessingService;
    private readonly BUCKET_NAME = 'images';

    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_KEY!
        );
        this.imageProcessor = new ImageProcessingService();
    }

    /**
     * Upload image and return URLs
     */
    async uploadImage(
        buffer: Buffer,
        userId: string,
        mimeType: string
    ): Promise<{
        url: string;
        thumbnailUrl: string;
        hash: string;
        width: number;
        height: number;
        size: number;
    }> {
        try {
            // Validate image
            const validation = await this.imageProcessor.validateImage(buffer);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            // Process image
            const { main, thumbnail } = await this.imageProcessor.processImage(buffer);

            // Generate file paths
            const timestamp = Date.now();
            const mainPath = `${userId}/${timestamp}-${main.hash.substring(0, 8)}.jpg`;
            const thumbPath = `${userId}/thumbnails/${timestamp}-${main.hash.substring(0, 8)}.jpg`;

            // Upload both images
            const [mainUpload, thumbUpload] = await Promise.all([
                this.supabase.storage
                    .from(this.BUCKET_NAME)
                    .upload(mainPath, main.buffer, {
                        contentType: 'image/jpeg',
                        cacheControl: '31536000', // 1 year
                        upsert: false,
                    }),
                this.supabase.storage
                    .from(this.BUCKET_NAME)
                    .upload(thumbPath, thumbnail.buffer, {
                        contentType: 'image/jpeg',
                        cacheControl: '31536000',
                        upsert: false,
                    }),
            ]);

            if (mainUpload.error) {
                throw new Error(`Main upload failed: ${mainUpload.error.message}`);
            }

            if (thumbUpload.error) {
                throw new Error(`Thumbnail upload failed: ${thumbUpload.error.message}`);
            }

            // Get public URLs
            const { data: mainData } = this.supabase.storage
                .from(this.BUCKET_NAME)
                .getPublicUrl(mainPath);

            const { data: thumbData } = this.supabase.storage
                .from(this.BUCKET_NAME)
                .getPublicUrl(thumbPath);

            logger.info('Image uploaded', {
                userId,
                mainSize: main.size,
                thumbSize: thumbnail.size,
                hash: main.hash,
            });

            return {
                url: mainData.publicUrl,
                thumbnailUrl: thumbData.publicUrl,
                hash: main.hash,
                width: main.width,
                height: main.height,
                size: main.size,
            };

        } catch (error) {
            logger.error('Image upload failed', error);
            throw error;
        }
    }

    /**
     * Delete image from storage
     */
    async deleteImage(url: string): Promise<void> {
        try {
            // Extract path from URL
            const path = this.extractPathFromUrl(url);

            if (!path) {
                logger.warn('Could not extract path from URL', { url });
                return;
            }

            const { error } = await this.supabase.storage
                .from(this.BUCKET_NAME)
                .remove([path]);

            if (error) {
                throw error;
            }

            logger.info('Image deleted', { path });

        } catch (error) {
            logger.error('Image deletion failed', error);
            // Don't throw - deletion failures shouldn't block the main operation
        }
    }

    /**
     * Generate signed upload URL
     */
    async generateUploadUrl(
        userId: string,
        fileName: string
    ): Promise<{ uploadUrl: string; path: string }> {
        const timestamp = Date.now();
        const path = `${userId}/${timestamp}-${fileName}`;

        const { data, error } = await this.supabase.storage
            .from(this.BUCKET_NAME)
            .createSignedUploadUrl(path);

        if (error || !data) {
            throw new Error('Failed to generate upload URL');
        }

        return {
            uploadUrl: data.signedUrl,
            path: data.path,
        };
    }

    /**
     * Extract storage path from public URL
     */
    private extractPathFromUrl(url: string): string | null {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/');
            const bucketIndex = pathParts.indexOf(this.BUCKET_NAME);

            if (bucketIndex === -1) {
                return null;
            }

            return pathParts.slice(bucketIndex + 1).join('/');
        } catch {
            return null;
        }
    }
}