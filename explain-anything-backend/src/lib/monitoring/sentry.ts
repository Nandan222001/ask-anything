// src/lib/monitoring/sentry.ts
import * as Sentry from '@sentry/react-native';

export function initSentry() {
    Sentry.init({
        dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
        environment: process.env.EXPO_PUBLIC_ENV,
        tracesSampleRate: 0.2,
        profilesSampleRate: 0.1,

        beforeSend(event, hint) {
            // Don't send events from development
            if (__DEV__) return null;

            // Scrub sensitive data
            if (event.request?.headers) {
                delete event.request.headers.Authorization;
            }

            return event;
        },

        integrations: [
            new Sentry.ReactNativeTracing({
                routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),
            }),
        ],
    });
}

// Usage
export function captureException(error: Error, context?: Record<string, any>) {
    Sentry.captureException(error, {
        contexts: { custom: context },
    });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
    Sentry.captureMessage(message, level);
}