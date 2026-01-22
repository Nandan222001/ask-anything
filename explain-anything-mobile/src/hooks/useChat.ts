// src/hooks/useChat.ts
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { ChatMessage } from '@/services/chat/ChatService';

export function useChat(explanationId: string) {
    const queryClient = useQueryClient();
    const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);

    // Fetch chat history
    const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
        queryKey: ['chat', explanationId],
        queryFn: async () => {
            const response = await apiClient.get(
                `/v1/explanations/${explanationId}/chat`
            );
            return response.data;
        },
    });

    // Send message
    const sendMessage = useMutation({
        mutationFn: async (message: string) => {
            const response = await apiClient.post(
                `/v1/explanations/${explanationId}/chat`,
                { message }
            );
            return response.data;
        },
        onMutate: async (message) => {
            // Optimistic update
            const tempId = `temp-${Date.now()}`;
            const userMessage: ChatMessage = {
                id: tempId,
                role: 'user',
                content: message,
                createdAt: new Date(),
            };

            setOptimisticMessages((prev) => [...prev, userMessage]);

            return { tempId };
        },
        onSuccess: (assistantMessage, _, context) => {
            // Remove temp message and add real messages
            setOptimisticMessages((prev) =>
                prev.filter((m) => m.id !== context?.tempId)
            );

            queryClient.setQueryData<ChatMessage[]>(
                ['chat', explanationId],
                (old = []) => [...old, assistantMessage]
            );
        },
        onError: (_, __, context) => {
            // Remove optimistic message on error
            setOptimisticMessages((prev) =>
                prev.filter((m) => m.id !== context?.tempId)
            );
        },
    });

    const allMessages = [...messages, ...optimisticMessages];

    return {
        messages: allMessages,
        isLoading,
        sendMessage: sendMessage.mutate,
        isSending: sendMessage.isPending,
    };
}