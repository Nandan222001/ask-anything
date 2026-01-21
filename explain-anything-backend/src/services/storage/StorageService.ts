// src/services/storage/StorageService.ts
import sharp from 'sharp';
import { createHash } from 'crypto';
import { supabase } from '@/lib/supabase/client';

export class StorageService {
    private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    async uploadImage(
        file: Buffer,
        userId: string,
        mimeType: string
    ): Promise<{ url: string; thumbnail: string; hash: string }> {
        // Validate file type
        if (!this.ALLOWED_TYPES.includes(mimeType)) {
            throw new Error('Invalid file type');
        }

        // Validate file size
        if (file.length > this.MAX_FILE_SIZE) {
            throw new Error('File too large');
        }

        // Strip EXIF data and validate image
        const processedImage = await sharp(file)
            .rotate() // Auto-rotate based on EXIF
            .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toBuffer();

        // Generate thumbnail
        const thumbnail = await sharp(processedImage)
            .resize(400, 400, { fit: 'cover' })
            .jpeg({ quality: 70 })
            .toBuffer();

        // Generate content hash for deduplication
        const hash = createHash('sha256').update(processedImage).digest('hex');

        // Check if image already exists
        const existing = await this.findByHash(hash, userId);
        if (existing) {
            return existing;
        }

        // Upload to storage
        const filename = `${userId}/${Date.now()}-${hash.substring(0, 8)}.jpg`;
        const thumbnailFilename = `${userId}/thumbnails/${Date.now()}-${hash.substring(0, 8)}.jpg`;

        const [{ data: imageData }, { data: thumbData }] = await Promise.all([
            supabase.storage.from('images').upload(filename, processedImage, {
                contentType: 'image/jpeg',
                cacheControl: '31536000', // 1 year
            }),
            supabase.storage.from('images').upload(thumbnailFilename, thumbnail, {
                contentType: 'image/jpeg',
                cacheControl: '31536000',
            }),
        ]);

        if (!imageData || !thumbData) {
            throw new Error('Upload failed');
        }

        const { data: { publicUrl: imageUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(filename);

        const { data: { publicUrl: thumbnailUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(thumbnailFilename);

        return {
            url: imageUrl,
            thumbnail: thumbnailUrl,
            hash,
        };
    }

    private async findByHash(hash: string, userId: string) {
        const existing = await prisma.explanation.findFirst({
            where: { image_hash: hash, user_id: userId },
            select: { image_url: true, image_thumbnail_url: true, image_hash: true },
        });

        if (existing) {
            return {
                url: existing.image_url,
                thumbnail: existing.image_thumbnail_url!,
                hash: existing.image_hash!,
            };
        }

        return null;
    }
}