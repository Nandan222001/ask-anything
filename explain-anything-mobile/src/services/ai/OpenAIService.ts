// src/services/ai/OpenAIService.ts
import OpenAI from 'openai';
import { logger } from '@/utils/logger';
import { redis } from '@/lib/cache/redis';
import { createHash } from 'crypto';

export interface VisionAnalysisRequest {
    imageUrl: string;
    prompt?: string;
    isDeveloperMode: boolean;
    language: string;
}

export interface VisionAnalysisResponse {
    explanation: string;
    category: string;
    tags: string[];
    confidence: number;
    tokensUsed: number;
    processingTimeMs: number;
}

export class OpenAIService {
    private client: OpenAI;
    private readonly CACHE_TTL = 60 * 60 * 24 * 7; // 7 days
    private readonly MAX_RETRIES = 3;
    private readonly TIMEOUT_MS = 30000; // 30 seconds

    constructor() {
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY!,
            timeout: this.TIMEOUT_MS,
            maxRetries: this.MAX_RETRIES,
        });
    }

    /**
     * Analyze image and generate explanation
     */
    async analyzeImage(
        request: VisionAnalysisRequest
    ): Promise<VisionAnalysisResponse> {
        const startTime = Date.now();

        try {
            // Check cache first
            const cacheKey = this.getCacheKey(request);
            const cached = await this.getFromCache(cacheKey);
            if (cached) {
                logger.info('Cache hit for image analysis', { cacheKey });
                return {
                    ...cached,
                    processingTimeMs: Date.now() - startTime,
                };
            }

            // Build system prompt based on mode
            const systemPrompt = this.buildSystemPrompt(request);

            // Build user prompt
            const userPrompt = this.buildUserPrompt(request);

            // Call GPT-4 Vision
            const completion = await this.client.chat.completions.create({
                model: 'gpt-4-vision-preview',
                max_tokens: 1500,
                temperature: 0.7,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt,
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: userPrompt,
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: request.imageUrl,
                                    detail: 'high',
                                },
                            },
                        ],
                    },
                ],
            });

            const response = completion.choices[0]?.message?.content;

            if (!response) {
                throw new Error('Empty response from OpenAI');
            }

            // Parse structured response
            const parsed = this.parseResponse(response);

            const result: VisionAnalysisResponse = {
                explanation: parsed.explanation,
                category: parsed.category,
                tags: parsed.tags,
                confidence: parsed.confidence,
                tokensUsed: completion.usage?.total_tokens || 0,
                processingTimeMs: Date.now() - startTime,
            };

            // Cache the result
            await this.saveToCache(cacheKey, result);

            logger.info('Image analysis completed', {
                category: result.category,
                tokensUsed: result.tokensUsed,
                processingTimeMs: result.processingTimeMs,
            });

            return result;

        } catch (error) {
            logger.error('OpenAI analysis failed', error);

            // Fallback to simpler prompt on error
            if (error instanceof OpenAI.APIError && error.status === 400) {
                return this.fallbackAnalysis(request);
            }

            throw error;
        }
    }

    /**
     * Generate chat response for follow-up questions
     */
    async chat(params: {
        messages: Array<{ role: 'user' | 'assistant'; content: string }>;
        context: {
            originalExplanation: string;
            imageDescription: string;
            category: string;
        };
        isDeveloperMode: boolean;
    }): Promise<{ response: string; tokensUsed: number }> {
        try {
            const systemPrompt = this.buildChatSystemPrompt(params);

            const completion = await this.client.chat.completions.create({
                model: 'gpt-4-turbo-preview',
                max_tokens: 1000,
                temperature: 0.8,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...params.messages,
                ],
            });

            const response = completion.choices[0]?.message?.content;

            if (!response) {
                throw new Error('Empty chat response');
            }

            return {
                response,
                tokensUsed: completion.usage?.total_tokens || 0,
            };

        } catch (error) {
            logger.error('OpenAI chat failed', error);
            throw error;
        }
    }

    /**
     * Build system prompt based on context
     */
    private buildSystemPrompt(request: VisionAnalysisRequest): string {
        const basePrompt = `You are an expert AI assistant that explains things clearly and accurately.`;

        if (request.isDeveloperMode) {
            return `${basePrompt}

You are in DEVELOPER MODE. When analyzing images:
- If it's code: explain the syntax, logic, algorithms, time complexity
- If it's an error: provide debugging steps and solutions
- If it's architecture: explain system design, data flow, trade-offs
- If it's documentation: summarize key technical points
- Use technical terminology appropriate for experienced developers
- Include code examples when relevant
- Mention potential optimizations or best practices

Always structure your response as JSON:
{
  "explanation": "detailed technical explanation",
  "category": "code|error|architecture|documentation|other",
  "tags": ["relevant", "technical", "tags"],
  "confidence": 0.0-1.0
}`;
        }

        return `${basePrompt}

When analyzing images, provide clear, simple explanations that anyone can understand.

- For educational content (homework, textbooks): break down step-by-step
- For foreign text: translate and explain cultural context
- For objects/plants/animals: identify and provide interesting facts
- For instructions/manuals: simplify into easy steps
- For diagrams: explain what it represents and how it works

Use simple language. Avoid jargon. Be encouraging and helpful.

Always structure your response as JSON:
{
  "explanation": "clear, simple explanation in ${request.language}",
  "category": "education|translation|identification|instructions|other",
  "tags": ["relevant", "tags"],
  "confidence": 0.0-1.0
}`;
    }

    /**
     * Build user prompt
     */
    private buildUserPrompt(request: VisionAnalysisRequest): string {
        if (request.prompt) {
            return `${request.prompt}\n\nPlease analyze this image and respond in JSON format.`;
        }

        if (request.isDeveloperMode) {
            return `Analyze this image from a technical/developer perspective and respond in JSON format.`;
        }

        return `What is this? Please explain it clearly and respond in JSON format.`;
    }

    /**
     * Build chat system prompt
     */
    private buildChatSystemPrompt(params: {
        context: { originalExplanation: string; category: string };
        isDeveloperMode: boolean;
    }): string {
        const mode = params.isDeveloperMode ? 'technical developer' : 'helpful teacher';

        return `You are a ${mode} helping someone understand an image.

Original explanation: ${params.context.originalExplanation}
Category: ${params.context.category}

Continue the conversation by:
- Answering follow-up questions clearly
- Building on previous explanations
- Providing examples when helpful
- Staying focused on the image and topic
${params.isDeveloperMode ? '- Using appropriate technical depth' : '- Keeping language simple and accessible'}

Be conversational, patient, and helpful.`;
    }

    /**
     * Parse OpenAI JSON response
     */
    private parseResponse(response: string): {
        explanation: string;
        category: string;
        tags: string[];
        confidence: number;
    } {
        try {
            // Try to extract JSON from markdown code blocks
            const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) ||
                response.match(/```\n([\s\S]*?)\n```/);

            const jsonStr = jsonMatch ? jsonMatch[1] : response;
            const parsed = JSON.parse(jsonStr);

            return {
                explanation: parsed.explanation || response,
                category: parsed.category || 'other',
                tags: Array.isArray(parsed.tags) ? parsed.tags : [],
                confidence: typeof parsed.confidence === 'number'
                    ? Math.max(0, Math.min(1, parsed.confidence))
                    : 0.8,
            };
        } catch (error) {
            // Fallback: treat entire response as explanation
            logger.warn('Failed to parse JSON response, using raw text', { error });
            return {
                explanation: response,
                category: 'other',
                tags: [],
                confidence: 0.7,
            };
        }
    }

    /**
     * Fallback analysis with simpler prompt
     */
    private async fallbackAnalysis(
        request: VisionAnalysisRequest
    ): Promise<VisionAnalysisResponse> {
        const startTime = Date.now();

        try {
            const completion = await this.client.chat.completions.create({
                model: 'gpt-4-vision-preview',
                max_tokens: 800,
                temperature: 0.7,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Briefly explain what you see in this image.',
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: request.imageUrl,
                                    detail: 'low', // Use low detail for fallback
                                },
                            },
                        ],
                    },
                ],
            });

            const response = completion.choices[0]?.message?.content || 'Unable to analyze image.';

            return {
                explanation: response,
                category: 'other',
                tags: [],
                confidence: 0.5,
                tokensUsed: completion.usage?.total_tokens || 0,
                processingTimeMs: Date.now() - startTime,
            };

        } catch (error) {
            logger.error('Fallback analysis failed', error);
            throw new Error('Failed to analyze image');
        }
    }

    /**
     * Generate cache key for deduplication
     */
    private getCacheKey(request: VisionAnalysisRequest): string {
        const data = JSON.stringify({
            imageUrl: request.imageUrl,
            prompt: request.prompt || '',
            isDeveloperMode: request.isDeveloperMode,
            language: request.language,
        });

        return `openai:analysis:${createHash('sha256').update(data).digest('hex')}`;
    }

    /**
     * Get cached result
     */
    private async getFromCache(key: string): Promise<VisionAnalysisResponse | null> {
        try {
            const cached = await redis.get(key);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            logger.warn('Cache read failed', { error });
            return null;
        }
    }

    /**
     * Save to cache
     */
    private async saveToCache(
        key: string,
        data: VisionAnalysisResponse
    ): Promise<void> {
        try {
            await redis.setex(key, this.CACHE_TTL, JSON.stringify(data));
        } catch (error) {
            logger.warn('Cache write failed', { error });
        }
    }
}