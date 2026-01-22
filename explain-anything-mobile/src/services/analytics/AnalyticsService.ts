// src/services/analytics/AnalyticsService.ts
import { PostHog } from 'posthog-node';
import { prisma } from '@/lib/database/client';
import { logger } from '@/utils/logger';

export interface TrackEventParams {
    userId?: string;
    event: string;
    properties?: Record<string, any>;
    timestamp?: Date;
}

export interface IdentifyUserParams {
    userId: string;
    traits?: Record<string, any>;
}

export interface AnalyticsReport {
    period: 'day' | 'week' | 'month';
    metrics: {
        totalExplanations: number;
        uniqueUsers: number;
        avgExplanationsPerUser: number;
        topCategories: Array<{ category: string; count: number }>;
        conversionRate: number;
        churnRate: number;
    };
}

export class AnalyticsService {
    private posthog: PostHog;

    constructor() {
        this.posthog = new PostHog(process.env.POSTHOG_API_KEY!, {
            host: 'https://app.posthog.com',
        });
    }

    /**
     * Track custom event
     */
    async track(params: TrackEventParams): Promise<void> {
        try {
            this.posthog.capture({
                distinctId: params.userId || 'anonymous',
                event: params.event,
                properties: params.properties,
                timestamp: params.timestamp,
            });

            // Also store critical events in database
            if (this.isCriticalEvent(params.event)) {
                await this.storeCriticalEvent(params);
            }

            logger.debug('Event tracked', {
                event: params.event,
                userId: params.userId,
            });

        } catch (error) {
            logger.error('Failed to track event', error);
            // Don't throw - analytics failures shouldn't break app
        }
    }

    /**
     * Identify user
     */
    async identify(params: IdentifyUserParams): Promise<void> {
        try {
            this.posthog.identify({
                distinctId: params.userId,
                properties: params.traits,
            });

            logger.debug('User identified', { userId: params.userId });

        } catch (error) {
            logger.error('Failed to identify user', error);
        }
    }

    /**
     * Track page view
     */
    async trackPageView(params: {
        userId?: string;
        path: string;
        referrer?: string;
    }): Promise<void> {
        await this.track({
            userId: params.userId,
            event: '$pageview',
            properties: {
                $current_url: params.path,
                $referrer: params.referrer,
            },
        });
    }

    /**
     * Track explanation created
     */
    async trackExplanationCreated(params: {
        userId: string;
        explanationId: string;
        category: string;
        isDeveloperMode: boolean;
        processingTimeMs: number;
    }): Promise<void> {
        await this.track({
            userId: params.userId,
            event: 'explanation_created',
            properties: {
                explanation_id: params.explanationId,
                category: params.category,
                is_developer_mode: params.isDeveloperMode,
                processing_time_ms: params.processingTimeMs,
            },
        });
    }

    /**
     * Track subscription event
     */
    async trackSubscriptionEvent(params: {
        userId: string;
        event: 'started' | 'cancelled' | 'renewed';
        tier: string;
        amount?: number;
    }): Promise<void> {
        await this.track({
            userId: params.userId,
            event: `subscription_${params.event}`,
            properties: {
                tier: params.tier,
                amount: params.amount,
            },
        });
    }

    /**
     * Track user registration
     */
    async trackUserRegistration(params: {
        userId: string;
        method: 'email' | 'google' | 'apple';
    }): Promise<void> {
        await this.track({
            userId: params.userId,
            event: 'user_registered',
            properties: {
                method: params.method,
            },
        });

        await this.identify({
            userId: params.userId,
            traits: {
                registration_method: params.method,
                registered_at: new Date().toISOString(),
            },
        });
    }

    /**
     * Get analytics report
     */
    async getReport(
        period: 'day' | 'week' | 'month'
    ): Promise<AnalyticsReport> {
        try {
            const now = new Date();
            const startDate = this.getStartDate(now, period);

            // Get explanation stats
            const explanationStats = await prisma.explanation.groupBy({
                by: ['category'],
                where: {
                    created_at: { gte: startDate },
                    deleted_at: null,
                },
                _count: { id: true },
            });

            const totalExplanations = explanationStats.reduce(
                (sum, stat) => sum + stat._count.id,
                0
            );

            // Get unique users
            const uniqueUsers = await prisma.explanation.findMany({
                where: {
                    created_at: { gte: startDate },
                    deleted_at: null,
                },
                distinct: ['user_id'],
                select: { user_id: true },
            });

            // Get subscription stats
            const newSubscriptions = await prisma.subscription.count({
                where: {
                    created_at: { gte: startDate },
                    status: 'active',
                },
            });

            const canceledSubscriptions = await prisma.subscription.count({
                where: {
                    canceled_at: { gte: startDate },
                },
            });

            const totalUsers = await prisma.user.count({
                where: { created_at: { lt: startDate } },
            });

            return {
                period,
                metrics: {
                    totalExplanations,
                    uniqueUsers: uniqueUsers.length,
                    avgExplanationsPerUser:
                        uniqueUsers.length > 0
                            ? totalExplanations / uniqueUsers.length
                            : 0,
                    topCategories: explanationStats
                        .map((stat) => ({
                            category: stat.category,
                            count: stat._count.id,
                        }))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 5),
                    conversionRate:
                        uniqueUsers.length > 0
                            ? (newSubscriptions / uniqueUsers.length) * 100
                            : 0,
                    churnRate:
                        totalUsers > 0 ? (canceledSubscriptions / totalUsers) * 100 : 0,
                },
            };

        } catch (error) {
            logger.error('Failed to generate analytics report', error);
            throw error;
        }
    }

    /**
     * Get user analytics
     */
    async getUserAnalytics(userId: string): Promise<{
        totalExplanations: number;
        categoriesUsed: string[];
        averageProcessingTime: number;
        mostUsedCategory: string;
        streakDays: number;
    }> {
        const explanations = await prisma.explanation.findMany({
            where: { user_id: userId, deleted_at: null },
            select: {
                category: true,
                processing_time_ms: true,
                created_at: true,
            },
        });

        const categories = [...new Set(explanations.map((e) => e.category))];
        const categoryCount = explanations.reduce((acc, e) => {
            acc[e.category] = (acc[e.category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const mostUsedCategory = Object.entries(categoryCount).sort(
            ([, a], [, b]) => b - a
        )[0]?.[0] || 'none';

        const avgProcessingTime =
            explanations.reduce((sum, e) => sum + (e.processing_time_ms || 0), 0) /
            (explanations.length || 1);

        const streak = this.calculateStreak(explanations.map((e) => e.created_at));

        return {
            totalExplanations: explanations.length,
            categoriesUsed: categories,
            averageProcessingTime: Math.round(avgProcessingTime),
            mostUsedCategory,
            streakDays: streak,
        };
    }

    /**
     * Calculate user streak
     */
    private calculateStreak(dates: Date[]): number {
        if (dates.length === 0) return 0;

        const sortedDates = dates
            .map((d) => d.toISOString().split('T')[0])
            .filter((v, i, a) => a.indexOf(v) === i) // unique dates
            .sort()
            .reverse();

        let streak = 0;
        const today = new Date().toISOString().split('T')[0];
        let expectedDate = today;

        for (const date of sortedDates) {
            if (date === expectedDate) {
                streak++;
                const d = new Date(expectedDate);
                d.setDate(d.getDate() - 1);
                expectedDate = d.toISOString().split('T')[0];
            } else {
                break;
            }
        }

        return streak;
    }

    /**
     * Check if event is critical (should be stored in DB)
     */
    private isCriticalEvent(event: string): boolean {
        const criticalEvents = [
            'user_registered',
            'subscription_started',
            'subscription_cancelled',
            'payment_failed',
        ];
        return criticalEvents.includes(event);
    }

    /**
     * Store critical event in database
     */
    private async storeCriticalEvent(params: TrackEventParams): Promise<void> {
        // Could store in a separate analytics_events table
        // For now, we rely on PostHog
    }

    /**
     * Get start date based on period
     */
    private getStartDate(now: Date, period: 'day' | 'week' | 'month'): Date {
        const date = new Date(now);

        switch (period) {
            case 'day':
                date.setHours(0, 0, 0, 0);
                break;
            case 'week':
                date.setDate(date.getDate() - 7);
                break;
            case 'month':
                date.setMonth(date.getMonth() - 1);
                break;
        }

        return date;
    }

    /**
     * Flush events on shutdown
     */
    async shutdown(): Promise<void> {
        await this.posthog.shutdown();
        logger.info('Analytics service shut down');
    }
}