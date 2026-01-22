// src/hooks/useExplanation.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { ExplanationResponse } from '@/services/explanation/ExplanationService';
import { logger } from '@/utils/logger';

export function useExplanation(id: string) {
    const queryClient = useQueryClient();

    // Fetch explanation
    const {
        data: explanation,
        isLoading,
        error,
    } = useQuery<ExplanationResponse>({
        queryKey: ['explanation', id],
        queryFn: async () => {
            const response = await apiClient.get(`/v1/explanations/${id}`);
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Toggle favorite
    const toggleFavorite = useMutation({
        mutationFn: async () => {
            const response = await apiClient.patch(`/v1/explanations/${id}/favorite`);
            return response.data;
        },
        onSuccess: (isFavorited) => {
            queryClient.setQueryData(['explanation', id], (old: any) => ({
                ...old,
                isFavorited,
            }));

            // Invalidate list queries
            queryClient.invalidateQueries({ queryKey: ['explanations'] });
        },
        onError: (error) => {
            logger.error('Toggle favorite failed', error);
        },
    });

    // Delete explanation
    const deleteExplanation = useMutation({
        mutationFn: async () => {
            await apiClient.delete(`/v1/explanations/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['explanations'] });
        },
    });

    return {
        explanation,
        isLoading,
        error,
        toggleFavorite: toggleFavorite.mutate,
        deleteExplanation: deleteExplanation.mutate,
        isTogglingFavorite: toggleFavorite.isPending,
        isDeleting: deleteExplanation.isPending,
    };
}