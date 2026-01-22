// src/services/image/ImageProcessingService.ts
import sharp from 'sharp';
import { createHash } from 'crypto';
import Tesseract from 'tesseract.js';
import { logger } from '@/utils/logger';

export interface ProcessedImage {
    buffer: Buffer;
    width: number;
    height: number;
    format: string;
    size: number;
    hash: string;
    hasText: boolean;
    extractedText?: string;
}

export interface ImageMetadata {
    width: number;
    height: number;
    format: string;
    space: string;
    channels: number;
    depth: string;
    density: number;
    hasAlpha: boolean;
    orientation?: number;
}

export class ImageProcessingService {
    private readonly MAX_DIMENSION = 2048;
    private readonly THUMBNAIL_SIZE = 400;
    private readonly QUALITY_HIGH = 85;
    private readonly QUALITY_MEDIUM = 70;

    /**
     * Process uploaded image
     * - Strip metadata
     * - Resize if needed
     * - Optimize
     * - Extract text if present
     */
    async processImage(input: Buffer): Promise<{
        main: ProcessedImage;
        thumbnail: ProcessedImage;
    }> {
        try {
            // Get metadata
            const metadata = await this.getMetadata(input);
            logger.info('Processing image', { metadata });

            // Process main image
            const mainImage = await this.processMainImage(input, metadata);

            // Generate thumbnail
            const thumbnail = await this.generateThumbnail(mainImage.buffer);

            // Extract text (OCR) if image likely contains text
            const hasText = await this.detectText(mainImage.buffer);

            if (hasText) {
                const extractedText = await this.extractText(mainImage.buffer);
                mainImage.extractedText = extractedText;
                mainImage.hasText = true;
            }

            return {
                main: mainImage,
                thumbnail,
            };

        } catch (error) {
            logger.error('Image processing failed', error);
            throw new Error('Failed to process image');
        }
    }

    /**
     * Get image metadata
     */
    private async getMetadata(buffer: Buffer): Promise<ImageMetadata> {
        const metadata = await sharp(buffer).metadata();

        return {
            width: metadata.width || 0,
            height: metadata.height || 0,
            format: metadata.format || 'unknown',
            space: metadata.space || 'unknown',
            channels: metadata.channels || 0,
            depth: metadata.depth || 'unknown',
            density: metadata.density || 0,
            hasAlpha: metadata.hasAlpha || false,
            orientation: metadata.orientation,
        };
    }

    /**
     * Process main image
     */
    private async processMainImage(
        buffer: Buffer,
        metadata: ImageMetadata
    ): Promise<ProcessedImage> {
        let pipeline = sharp(buffer);

        // Auto-rotate based on EXIF orientation
        pipeline = pipeline.rotate();

        // Resize if too large
        if (metadata.width > this.MAX_DIMENSION || metadata.height > this.MAX_DIMENSION) {
            pipeline = pipeline.resize(this.MAX_DIMENSION, this.MAX_DIMENSION, {
                fit: 'inside',
                withoutEnlargement: true,
            });
        }

        // Strip all metadata (including EXIF, which may contain GPS data)
        pipeline = pipeline.withMetadata({
            exif: {},
            icc: 'srgb', // Keep color profile
        });

        // Convert to JPEG and optimize
        pipeline = pipeline.jpeg({
            quality: this.QUALITY_HIGH,
            progressive: true,
            mozjpeg: true,
        });

        // Process
        const processed = await pipeline.toBuffer({ resolveWithObject: true });

        // Generate content hash
        const hash = createHash('sha256').update(processed.data).digest('hex');

        return {
            buffer: processed.data,
            width: processed.info.width,
            height: processed.info.height,
            format: processed.info.format,
            size: processed.info.size,
            hash,
            hasText: false,
        };
    }

    /**
     * Generate thumbnail
     */
    private async generateThumbnail(buffer: Buffer): Promise<ProcessedImage> {
        const processed = await sharp(buffer)
            .resize(this.THUMBNAIL_SIZE, this.THUMBNAIL_SIZE, {
                fit: 'cover',
                position: 'center',
            })
            .jpeg({
                quality: this.QUALITY_MEDIUM,
                progressive: true,
            })
            .toBuffer({ resolveWithObject: true });

        const hash = createHash('sha256').update(processed.data).digest('hex');

        return {
            buffer: processed.data,
            width: processed.info.width,
            height: processed.info.height,
            format: processed.info.format,
            size: processed.info.size,
            hash,
            hasText: false,
        };
    }

    /**
     * Detect if image contains text
     * Uses simple edge detection heuristic
     */
    private async detectText(buffer: Buffer): Promise<boolean> {
        try {
            // Convert to grayscale and get stats
            const { stats } = await sharp(buffer)
                .greyscale()
                .stats();

            // Check contrast and edge density
            const contrast = stats[0].max - stats[0].min;
            const stdDev = stats[0].stdev;

            // High contrast + high std deviation suggests text
            return contrast > 100 && stdDev > 40;

        } catch (error) {
            logger.warn('Text detection failed', { error });
            return false;
        }
    }

    /**
     * Extract text using OCR
     */
    private async extractText(buffer: Buffer): Promise<string> {
        try {
            // Preprocess image for better OCR
            const preprocessed = await sharp(buffer)
                .greyscale()
                .normalize()
                .sharpen()
                .toBuffer();

            // Run Tesseract OCR
            const { data } = await Tesseract.recognize(preprocessed, 'eng', {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        logger.debug('OCR progress', { progress: m.progress });
                    }
                },
            });

            const text = data.text.trim();

            logger.info('Text extracted', {
                length: text.length,
                confidence: data.confidence,
            });

            return text;

        } catch (error) {
            logger.error('OCR failed', error);
            return '';
        }
    }

    /**
     * Validate image before processing
     */
    async validateImage(buffer: Buffer): Promise<{
        valid: boolean;
        error?: string;
        metadata?: ImageMetadata;
    }> {
        try {
            const metadata = await this.getMetadata(buffer);

            // Check format
            const allowedFormats = ['jpeg', 'jpg', 'png', 'webp'];
            if (!allowedFormats.includes(metadata.format.toLowerCase())) {
                return {
                    valid: false,
                    error: `Invalid format: ${metadata.format}. Allowed: ${allowedFormats.join(', ')}`,
                };
            }

            // Check dimensions
            if (metadata.width < 50 || metadata.height < 50) {
                return {
                    valid: false,
                    error: 'Image too small (minimum 50x50 pixels)',
                };
            }

            if (metadata.width > 10000 || metadata.height > 10000) {
                return {
                    valid: false,
                    error: 'Image too large (maximum 10000x10000 pixels)',
                };
            }

            // Check file size
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (buffer.length > maxSize) {
                return {
                    valid: false,
                    error: 'File too large (maximum 10MB)',
                };
            }

            return {
                valid: true,
                metadata,
            };

        } catch (error) {
            logger.error('Image validation failed', error);
            return {
                valid: false,
                error: 'Invalid or corrupted image file',
            };
        }
    }

    /**
     * Compress image for upload
     * Mobile-friendly version
     */
    async compressForUpload(buffer: Buffer, targetSizeKB: number = 500): Promise<Buffer> {
        try {
            const metadata = await this.getMetadata(buffer);

            let quality = this.QUALITY_HIGH;
            let result = buffer;

            // Iteratively reduce quality until size is acceptable
            while (result.length > targetSizeKB * 1024 && quality > 30) {
                result = await sharp(buffer)
                    .rotate()
                    .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality, progressive: true, mozjpeg: true })
                    .toBuffer();

                quality -= 10;
            }

            logger.info('Image compressed', {
                originalSize: buffer.length,
                compressedSize: result.length,
                quality,
            });

            return result;

        } catch (error) {
            logger.error('Compression failed', error);
            throw new Error('Failed to compress image');
        }
    }
}