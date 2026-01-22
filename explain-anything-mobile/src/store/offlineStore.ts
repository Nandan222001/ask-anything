// src/store/offlineStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface QueuedRequest {
    id: string;
    url: string;
    method: string;
    data?: any;
    timestamp: number;
}

interface OfflineState {
    isOnline: boolean;
    queue: QueuedRequest[];

    // Actions
    setOnline: (online: boolean) => void;
    addToQueue: (request: Omit<QueuedRequest, 'id' | 'timestamp'>) => void;
    removeFromQueue: (id: string) => void;
    clearQueue: () => void;
    processQueue: () => Promise<void>;
}

export const useOfflineStore = create<OfflineState>()(
    persist(
        (set, get) => ({
            isOnline: true,
            queue: [],

            setOnline: (online) => {
                set({ isOnline: online });

                // Process queue when coming online
                if (online) {
                    get().processQueue();
                }
            },

            addToQueue: (request) => {
                const queuedRequest: QueuedRequest = {
                    ...request,
                    id: `${Date.now()}-${Math.random()}`,
                    timestamp: Date.now(),
                };

                set((state) => ({
                    queue: [...state.queue, queuedRequest],
                }));
            },

            removeFromQueue: (id) => {
                set((state) => ({
                    queue: state.queue.filter((req) => req.id !== id),
                }));
            },

            clearQueue: () => {
                set({ queue: [] });
            },

            processQueue: async () => {
                const { queue, isOnline } = get();

                if (!isOnline || queue.length === 0) return;

                // Process requests one by one
                for (const request of queue) {
                    try {
                        // Process request (implement your logic here)
                        console.log('Processing queued request:', request);

                        // Remove from queue on success
                        get().removeFromQueue(request.id);

                    } catch (error) {
                        console.error('Failed to process queued request:', error);
                        // Keep in queue for retry
                    }
                }
            },
        }),
        {
            name: 'offline-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

// Initialize network listener
NetInfo.addEventListener((state) => {
    useOfflineStore.getState().setOnline(state.isConnected ?? false);
});