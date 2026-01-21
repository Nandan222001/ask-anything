// app/api/v1/explanations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ExplanationService } from '@/services/explanation/ExplanationService';
import { StorageService } from '@/services/storage/StorageService';
import { validateRequest } from '@/utils/validation';
import { logger } from '@/utils/logger';

const createSchema = z.object({
    image: z.string().startsWith('data:image'),
    prompt: z.string().max(500).optional(),
    isDeveloperMode: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
    try {
        const user = (req as any).user;

        // Parse and validate request
        const body = await req.json();
        const data = createSchema.parse(body);

        // Extract image from data URL
        const matches = data.image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
            return NextResponse.json(
                { error: 'Invalid image format' },
                { status: 400 }
            );
        }

        const [, mimeType, base64Data] = matches;
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // Upload image
        const storageService = new StorageService();
        const { url, thumbnail, hash } = await storageService.uploadImage(
            imageBuffer,
            user.id,
            `image/${mimeType}`
        );

        // Generate explanation
        const explanationService = new ExplanationService();
        const result = await explanationService.create({
            userId: user.id,
            imageUrl: url,
            thumbnailUrl: thumbnail,
            imageHash: hash,
            prompt: data.prompt,
            isDeveloperMode: data.isDeveloperMode,
        });

        // Log analytics
        logger.info('Explanation created', {
            userId: user.id,
            explanationId: result.id,
            processingTime: result.processingTimeMs,
        });

        return NextResponse.json(result, { status: 201 });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        logger.error('Failed to create explanation', error);

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    try {
        const user = (req as any).user;
        const { searchParams } = new URL(req.url);

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const category = searchParams.get('category');
        const search = searchParams.get('search');

        const explanationService = new ExplanationService();
        const results = await explanationService.list({
            userId: user.id,
            page,
            limit,
            category,
            search,
        });

        return NextResponse.json(results);

    } catch (error) {
        logger.error('Failed to list explanations', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}