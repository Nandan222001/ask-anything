// src/services/chat/ChatService.ts
import { prisma } from '@/lib/database/client';
import { OpenAIService } from '@/services/ai/OpenAIService';
import { logger } from '@/utils/logger';

export interface SendMessageRequest {
    explanationId: string;
    userId: string;
    message: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: Date;
}

export class ChatService {
    private openAI: OpenAIService;
    private readonly MAX_HISTORY = 10; // Keep last 10 messages for context

    constructor() {
        this.openAI = new OpenAIService();
    }

    /**
     * Send a message and get AI response
     */
    async sendMessage(request: SendMessageRequest): Promise<ChatMessage> {
        try {
            // Verify explanation belongs to user
            const explanation = await prisma.explanation.findFirst({
                where: {
                    id: request.explanationId,
                    user_id: request.userId,
                },
            });

            if (!explanation) {
                throw new Error('Explanation not found');
            }

            // Get conversation history
            const history = await this.getHistory(request.explanationId);

            // Save user message
            const userMessage = await prisma.message.create({
                data: {
                    explanation_id: request.explanationId,
                    user_id: request.userId,
                    role: 'user',
                    content: request.message,
                },
            });

            // Build context for AI
            const context = {
                originalExplanation: explanation.explanation_text,
                imageDescription: explanation.explanation_text,
                category: explanation.category,
            };

            // Get AI response
            const { response, tokensUsed } = await this.openAI.chat({
                messages: [
                    ...history.map((m) => ({
                        role: m.role as 'user' | 'assistant',
                        content: m.content,
                    })),
                    { role: 'user', content: request.message },
                ],
                context,
                isDeveloperMode: explanation.is_developer_mode,
            });

            // Save assistant message
            const assistantMessage = await prisma.message.create({
                data: {
                    explanation_id: request.explanationId,
                    user_id: request.userId,
                    role: 'assistant',
                    content: response,
                    model: 'gpt-4-turbo-preview',
                    tokens_used: tokensUsed,
                },
            });

            // Log usage
            await prisma.usage_log.create({
                data: {
                    user_id: request.userId,
                    action: 'chat_message',
                    resource_id: request.explanationId,
                    tokens_used: tokensUsed,
                    cost_usd: tokensUsed * 0.00001,
                },
            });

            logger.info('Chat message processed', {
                explanationId: request.explanationId,
                tokensUsed,
            });

            return {
                id: assistantMessage.id,
                role: 'assistant',
                content: assistantMessage.content,
                createdAt: assistantMessage.created_at,
            };

        } catch (error) {
            logger.error('Failed to send chat message', error);
            throw error;
        }
    }

    /**
     * Get chat history for an explanation
     */
    async getHistory(explanationId: string): Promise<ChatMessage[]> {
        const messages = await prisma.message.findMany({
            where: { explanation_id: explanationId },
            orderBy: { created_at: 'asc' },
            take: this.MAX_HISTORY,
        });

        return messages.map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            createdAt: m.created_at,
        }));
    }

    /**
     * Clear chat history
     */
    async clearHistory(explanationId: string, userId: string): Promise<void> {
        // Verify ownership
        const explanation = await prisma.explanation.findFirst({
            where: {
                id: explanationId,
                user_id: userId,
            },
        });

        if (!explanation) {
            throw new Error('Explanation not found');
        }

        await prisma.message.deleteMany({
            where: { explanation_id: explanationId },
        });

        logger.info('Chat history cleared', { explanationId });
    }
}