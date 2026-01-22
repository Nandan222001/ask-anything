// src/lib/api/client.ts
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';
import { useOfflineStore } from '@/store/offlineStore';
import { logger } from '@/utils/logger';
import NetInfo from '@react-native-community/netinfo';

class APIClient {
    private client: AxiosInstance;
    private refreshPromise: Promise<string> | null = null;

    constructor() {
        this.client = axios.create({
            baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://api.explainanything.app',
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.setupInterceptors();
    }

    private setupInterceptors() {
        // Request interceptor
        this.client.interceptors.request.use(
            async (config: InternalAxiosRequestConfig) => {
                // Check network connectivity
                const netInfo = await NetInfo.fetch();
                if (!netInfo.isConnected) {
                    // Queue request for later
                    this.queueOfflineRequest(config);
                    throw new Error('No internet connection');
                }

                // Add auth token
                const { session } = useAuthStore.getState();
                if (session?.access_token) {
                    config.headers.Authorization = `Bearer ${session.access_token}`;
                }

                // Add request ID for tracking
                config.headers['X-Request-ID'] = this.generateRequestId();

                logger.debug('API Request', {
                    method: config.method,
                    url: config.url,
                    requestId: config.headers['X-Request-ID'],
                });

                return config;
            },
            (error) => {
                logger.error('Request interceptor error', error);
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.client.interceptors.response.use(
            (response) => {
                logger.debug('API Response', {
                    status: response.status,
                    url: response.config.url,
                });
                return response;
            },
            async (error: AxiosError) => {
                const originalRequest = error.config as InternalAxiosRequestConfig & {
                    _retry?: boolean;
                };

                // Handle 401 Unauthorized
                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;

                    try {
                        // Refresh token
                        const newToken = await this.refreshToken();

                        // Retry original request with new token
                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        }
                        return this.client(originalRequest);

                    } catch (refreshError) {
                        // Refresh failed, sign out user
                        useAuthStore.getState().signOut();
                        return Promise.reject(refreshError);
                    }
                }

                // Handle other errors
                this.handleError(error);
                return Promise.reject(error);
            }
        );
    }

    /**
     * Refresh access token
     */
    private async refreshToken(): Promise<string> {
        // Prevent multiple simultaneous refresh requests
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        this.refreshPromise = (async () => {
            try {
                const { session } = useAuthStore.getState();
                if (!session?.refresh_token) {
                    throw new Error('No refresh token available');
                }

                const response = await axios.post(
                    `${process.env.EXPO_PUBLIC_API_URL}/v1/auth/refresh`,
                    { refresh_token: session.refresh_token }
                );

                const newSession = response.data;
                useAuthStore.getState().setSession(newSession);

                logger.info('Token refreshed successfully');
                return newSession.access_token;

            } catch (error) {
                logger.error('Token refresh failed', error);
                throw error;
            } finally {
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
    }

    /**
     * Queue request for offline processing
     */
    private queueOfflineRequest(config: InternalAxiosRequestConfig) {
        useOfflineStore.getState().addToQueue({
            url: config.url || '',
            method: config.method || 'GET',
            data: config.data,
        });

        logger.info('Request queued for offline processing', {
            url: config.url,
            method: config.method,
        });
    }

    /**
     * Handle API errors
     */
    private handleError(error: AxiosError) {
        if (error.response) {
            // Server responded with error
            logger.error('API Error Response', {
                status: error.response.status,
                data: error.response.data,
                url: error.config?.url,
            });

            // Show user-friendly error messages
            const message = this.getErrorMessage(error.response.status);

            // Could show toast notification here
            console.error(message);

        } else if (error.request) {
            // Request made but no response
            logger.error('API No Response', {
                url: error.config?.url,
            });

        } else {
            // Error setting up request
            logger.error('API Request Setup Error', error);
        }
    }

    /**
     * Get user-friendly error message
     */
    private getErrorMessage(status: number): string {
        const messages: Record<number, string> = {
            400: 'Invalid request. Please check your input.',
            401: 'Please sign in to continue.',
            403: 'You don\'t have permission to do that.',
            404: 'Resource not found.',
            429: 'Too many requests. Please slow down.',
            500: 'Server error. Please try again later.',
            503: 'Service temporarily unavailable.',
        };

        return messages[status] || 'Something went wrong. Please try again.';
    }

    /**
     * Generate unique request ID
     */
    private generateRequestId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Public methods
     */
    async get<T = any>(url: string, config?: any) {
        return this.client.get<T>(url, config);
    }

    async post<T = any>(url: string, data?: any, config?: any) {
        return this.client.post<T>(url, data, config);
    }

    async put<T = any>(url: string, data?: any, config?: any) {
        return this.client.put<T>(url, data, config);
    }

    async patch<T = any>(url: string, data?: any, config?: any) {
        return this.client.patch<T>(url, data, config);
    }

    async delete<T = any>(url: string, config?: any) {
        return this.client.delete<T>(url, config);
    }
}

export const apiClient = new APIClient();