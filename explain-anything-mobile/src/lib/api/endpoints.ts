// src/lib/api/endpoints.ts
export const API_ENDPOINTS = {
    // Auth
    AUTH: {
        SIGN_IN: '/v1/auth/sign-in',
        SIGN_UP: '/v1/auth/sign-up',
        SIGN_OUT: '/v1/auth/sign-out',
        REFRESH: '/v1/auth/refresh',
    },

    // Explanations
    EXPLANATIONS: {
        LIST: '/v1/explanations',
        CREATE: '/v1/explanations',
        GET: (id: string) => `/v1/explanations/${id}`,
        UPDATE: (id: string) => `/v1/explanations/${id}`,
        DELETE: (id: string) => `/v1/explanations/${id}`,
        FAVORITE: (id: string) => `/v1/explanations/${id}/favorite`,
        CHAT: (id: string) => `/v1/explanations/${id}/chat`,
    },

    // User
    USER: {
        ME: '/v1/users/me',
        UPDATE: '/v1/users/me',
        USAGE: '/v1/users/usage',
    },

    // Subscriptions
    SUBSCRIPTIONS: {
        CREATE_CHECKOUT: '/v1/subscriptions/checkout',
        PORTAL: '/v1/subscriptions/portal',
        CANCEL: '/v1/subscriptions/cancel',
        REACTIVATE: '/v1/subscriptions/reactivate',
    },

    // Upload
    UPLOAD: {
        SIGNED_URL: '/v1/upload/signed-url',
    },
} as const;