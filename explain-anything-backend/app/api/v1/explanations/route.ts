// app/api/v1/explanations/route.ts (Enhanced)
import { NextRequest, NextResponse } from 'next/server';
import { ExplanationService } from '@/services/explanation/ExplanationService';
import { StorageService } from '@/services/storage/StorageService';
import { QueueService } from '@/services/queue/QueueService';
import { AnalyticsService } from '@/services/analytics/AnalyticsService';
import { NotificationService } from '@/services/notification/NotificationService';
import { z } from 'zod';
import { logger } from '@/utils/logger';

const createSchema = z.object({
    image: z.string().startsWith('data:image'),
    prompt: z.string().max(500).optional(),
    isDeveloperMode: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
    const user = (req as any).user;
    const analytics = new AnalyticsService();
    const queue = new QueueService();

    try {
        // Parse request
        const body = await req.json();
        const data = createSchema.parse(body);

        // Extract image
        const matches = data.image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
            return NextResponse.json({ error: 'Invalid image' }, { status: 400 });
        }

        const [, mimeType, base64Data] = matches;
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // Upload image
        const storage = new StorageService();
        const uploaded = await storage.uploadImage(
            imageBuffer,
            user.id,
            `image/${mimeType}`
        );

        // Create explanation
        const explanationService = new ExplanationService();
        const explanation = await explanationService.create({
            userId: user.id,
            imageUrl: uploaded.url,
            thumbnailUrl: uploaded.thumbnailUrl,
            imageHash: uploaded.hash,
            prompt: data.prompt,
            isDeveloperMode: data.isDeveloperMode,
        });

        // Track analytics
        await analytics.trackExplanationCreated({
            userId: user.id,
            explanationId: explanation.id,
            category: explanation.category,
            isDeveloperMode: data.isDeveloperMode,
            processingTimeMs: explanation.processingTimeMs,
        });

        // Queue background job for further processing
        await queue.addImageProcessingJob({
            userId: user.id,
            imageUrl: uploaded.url,
            explanationId: explanation.id,
        });

        // Send push notification if enabled
        const notification = new NotificationService();
        await queue.addNotificationJob({
            userId: user.id,
            type: 'push',
            template: 'explanation_ready',
            data: {
                title: 'Explanation Ready!',
                body: `Your ${explanation.category} explanation is ready.`,
                explanationId: explanation.id,
            },
        });

        return NextResponse.json(explanation, { status: 201 });

    } catch (error) {
        logger.error('Create explanation failed', error);

        // Track error
        await analytics.track({
            userId: user?.id,
            event: 'explanation_creation_failed',
            properties: { error: (error as Error).message },
        });

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}