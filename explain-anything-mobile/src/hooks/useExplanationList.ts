// src/hooks/useExplanationList.ts
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { ExplanationResponse } from '@/services/explanation/ExplanationService';

interface UseExplanationListParams {
    category?: string;
    search?: string;
    favoritesOnly?: boolean;
}

export function useExplanationList(params: UseExplanationListParams = {}) {
    const queryClient = useQueryClient();

    const {
        data,
        isLoading,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch,
    } = useInfiniteQuery({
        queryKey: ['explanations', params],
        queryFn: async ({ pageParam = 1 }) => {
            const response = await apiClient.get('/v1/explanations', {
                params: {
                    page: pageParam,
                    limit: 20,
                    ...params,
                },
            });
            return response.data;
        },
        getNextPageParam: (lastPage) => {
            const { page, totalPages } = lastPage;
            return page < totalPages ? page + 1 : undefined;
        },
        initialPageParam: 1,
        staleTime: 60 * 1000, // 1 minute
    });

    // Toggle favorite
    const toggleFavorite = useMutation({
        mutationFn: async (id: string) => {
            const response = await apiClient.patch(`/v1/explanations/${id}/favorite`);
            return { id, isFavorited: response.data };
        },
        onSuccess: ({ id, isFavorited }) => {
            // Update in cache
            queryClient.setQueriesData(
                { queryKey: ['explanations'] },
                (old: any) => {
                    if (!old) return old;

                    return {
                        ...old,
                        pages: old.pages.map((page: any) => ({
                            ...page,
                            data: page.data.map((item: ExplanationResponse) =>
                                item.id === id ? { ...item, isFavorited } : item
                            ),
                        })),
                    };
                }
            );
        },
    });

    // Flatten pages into single array
    const explanations = data?.pages.flatMap((page) => page.data) ?? [];

    return {
        explanations,
        isLoading,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch,
        toggleFavorite: toggleFavorite.mutate,
    };
}