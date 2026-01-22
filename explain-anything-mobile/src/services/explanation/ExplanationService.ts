// src/services/explanation/ExplanationService.ts
import { prisma } from '@/lib/database/client';
import { OpenAIService } from '@/services/ai/OpenAIService';
import { ImageProcessingService } from '@/services/image/ImageProcessingService';
import { StorageService } from '@/services/storage/StorageService';
import { analytics } from '@/lib/monitoring/analytics';
import { logger } from '@/utils/logger';

export interface CreateExplanationRequest {
    userId: string;
    imageUrl: string;
    thumbnailUrl: string;
    imageHash: string;
    prompt?: string;
    isDeveloperMode: boolean;
    language?: string;
}

export interface ExplanationResponse {
    id: string;
    userId: string;
    imageUrl: string;
    thumbnailUrl: string;
    explanation: string;
    category: string;
    tags: string[];
    confidence: number;
    tokensUsed: number;
    processingTimeMs: number;
    isFavorited: boolean;
    createdAt: Date;
}

export class ExplanationService {
    private openAI: OpenAIService;
    private imageProcessor: ImageProcessingService;
    private storage: StorageService;

    constructor() {
        this.openAI = new OpenAIService();
        this.imageProcessor = new ImageProcessingService();
        this.storage = new StorageService();
    }

    /**
     * Create new explanation
     */
    async create(request: CreateExplanationRequest): Promise<ExplanationResponse> {
        const startTime = Date.now();

        try {
            // Check for duplicate (same image hash for this user)
            const existing = await this.findDuplicate(request.userId, request.imageHash);
            if (existing) {
                logger.info('Returning existing explanation', { id: existing.id });
                return this.toResponse(existing);
            }

            // Check user's daily usage limit
            await this.checkUsageLimit(request.userId);

            // Analyze image with OpenAI
            const analysis = await this.openAI.analyzeImage({
                imageUrl: request.imageUrl,
                prompt: request.prompt,
                isDeveloperMode: request.isDeveloperMode,
                language: request.language || 'en',
            });

            // Create explanation record
            const explanation = await prisma.explanation.create({
                data: {
                    user_id: request.userId,
                    image_url: request.imageUrl,
                    image_thumbnail_url: request.thumbnailUrl,
                    image_hash: request.imageHash,
                    prompt_text: request.prompt,
                    explanation_text: analysis.explanation,
                    explanation_model: 'gpt-4-vision-preview',
                    processing_time_ms: analysis.processingTimeMs,
                    confidence_score: analysis.confidence,
                    category: analysis.category,
                    tags: analysis.tags,
                    language: request.language || 'en',
                    is_developer_mode: request.isDeveloperMode,
                },
            });

            // Log usage
            await this.logUsage(request.userId, explanation.id, analysis.tokensUsed);

            // Update user stats
            await this.updateUserStats(request.userId);

            // Track analytics
            analytics.explanationCreated(explanation.id, analysis.category);

            const totalTime = Date.now() - startTime;
            logger.info('Explanation created', {
                id: explanation.id,
                category: analysis.category,
                totalTimeMs: totalTime,
            });

            return this.toResponse(explanation);

        } catch (error) {
            logger.error('Failed to create explanation', error);
            throw error;
        }
    }

    /**
     * Get explanation by ID
     */
    async getById(id: string, userId: string): Promise<ExplanationResponse | null> {
        const explanation = await prisma.explanation.findFirst({
            where: {
                id,
                user_id: userId,
                deleted_at: null,
            },
        });

        if (!explanation) {
            return null;
        }

        // Increment view count
        await prisma.explanation.update({
            where: { id },
            data: { view_count: { increment: 1 } },
        });

        return this.toResponse(explanation);
    }

    /**
     * List user's explanations
     */
    async list(params: {
        userId: string;
        page: number;
        limit: number;
        category?: string;
        search?: string;
        favoritesOnly?: boolean;
    }): Promise<{
        data: ExplanationResponse[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const { userId, page, limit, category, search, favoritesOnly } = params;

        const where: any = {
            user_id: userId,
            deleted_at: null,
        };

        if (category) {
            where.category = category;
        }

        if (favoritesOnly) {
            where.is_favorited = true;
        }

        if (search) {
            where.OR = [
                { explanation_text: { contains: search, mode: 'insensitive' } },
                { tags: { has: search.toLowerCase() } },
            ];
        }

        const [explanations, total] = await Promise.all([
            prisma.explanation.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.explanation.count({ where }),
        ]);

        return {
            data: explanations.map(this.toResponse),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Toggle favorite status
     */
    async toggleFavorite(id: string, userId: string): Promise<boolean> {
        const explanation = await prisma.explanation.findFirst({
            where: { id, user_id: userId },
            select: { is_favorited: true },
        });

        if (!explanation) {
            throw new Error('Explanation not found');
        }

        const newStatus = !explanation.is_favorited;

        await prisma.explanation.update({
            where: { id },
            data: { is_favorited: newStatus },
        });

        return newStatus;
    }

    /**
     * Delete explanation
     */
    async delete(id: string, userId: string): Promise<void> {
        const explanation = await prisma.explanation.findFirst({
            where: { id, user_id: userId },
        });

        if (!explanation) {
            throw new Error('Explanation not found');
        }

        // Soft delete
        await prisma.explanation.update({
            where: { id },
            data: { deleted_at: new Date() },
        });

        // Delete images from storage
        await this.storage.deleteImage(explanation.image_url);
        if (explanation.image_thumbnail_url) {
            await this.storage.deleteImage(explanation.image_thumbnail_url);
        }

        logger.info('Explanation deleted', { id });
    }

    /**
     * Find duplicate explanation
     */
    private async findDuplicate(
        userId: string,
        imageHash: string
    ): Promise<any | null> {
        return prisma.explanation.findFirst({
            where: {
                user_id: userId,
                image_hash: imageHash,
                deleted_at: null,
            },
            orderBy: { created_at: 'desc' },
        });
    }

    /**
     * Check if user has exceeded daily limit
     */
    private async checkUsageLimit(userId: string): Promise<void> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                subscription_tier: true,
                daily_usage_count: true,
                daily_usage_reset_at: true,
            },
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Reset counter if needed
        const now = new Date();
        if (!user.daily_usage_reset_at || user.daily_usage_reset_at < now) {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    daily_usage_count: 0,
                    daily_usage_reset_at: new Date(now.getTime() + 24 * 60 * 60 * 1000),
                },
            });
            return;
        }

        // Check limit based on tier
        const limits: Record<string, number> = {
            free: 10,
            pro: 1000,
            developer: 10000,
        };

        const limit = limits[user.subscription_tier] || limits.free;

        if (user.daily_usage_count >= limit) {
            throw new Error('Daily usage limit exceeded');
        }
    }

    /**
     * Log API usage
     */
    private async logUsage(
        userId: string,
        resourceId: string,
        tokensUsed: number
    ): Promise<void> {
        await prisma.usage_log.create({
            data: {
                user_id: userId,
                action: 'explanation',
                resource_id: resourceId,
                tokens_used: tokensUsed,
                cost_usd: tokensUsed * 0.00001, // Rough estimate
            },
        });
    }

    /**
     * Update user statistics
     */
    private async updateUserStats(userId: string): Promise<void> {
        await prisma.user.update({
            where: { id: userId },
            data: {
                daily_usage_count: { increment: 1 },
                total_explanations: { increment: 1 },
            },
        });
    }

    /**
     * Convert DB model to response
     */
    private toResponse(explanation: any): ExplanationResponse {
        return {
            id: explanation.id,
            userId: explanation.user_id,
            imageUrl: explanation.image_url,
            thumbnailUrl: explanation.image_thumbnail_url,
            explanation: explanation.explanation_text,
            category: explanation.category,
            tags: explanation.tags || [],
            confidence: explanation.confidence_score || 0,
            tokensUsed: 0, // Not exposed in response
            processingTimeMs: explanation.processing_time_ms || 0,
            isFavorited: explanation.is_favorited || false,
            createdAt: explanation.created_at,
        };
    }
}