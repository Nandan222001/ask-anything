// src/utils/validation.ts
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Schemas
export const createExplanationSchema = z.object({
    imageUrl: z.string().url().max(2048),
    prompt: z.string().max(500).optional(),
    isDeveloperMode: z.boolean().default(false),
    language: z.enum(['en', 'es', 'fr', 'de', 'zh', 'hi']).default('en'),
});

export const chatMessageSchema = z.object({
    explanationId: z.string().uuid(),
    message: z.string().min(1).max(1000),
});

// Sanitization
export function sanitizeInput(input: string): string {
    return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
    });
}

export function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .substring(0, 255);
}