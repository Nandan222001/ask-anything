// src/services/queue/QueueService.ts
import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '@/utils/logger';

// Job types
export interface ImageProcessingJob {
    userId: string;
    imageUrl: string;
    explanationId: string;
}

export interface CleanupJob {
    type: 'old_explanations' | 'failed_uploads' | 'expired_sessions';
    olderThanDays?: number;
}

export interface UsageAggregationJob {
    date: string; // YYYY-MM-DD
}

export interface NotificationJob {
    userId: string;
    type: 'email' | 'push';
    template: string;
    data: Record<string, any>;
}

export class QueueService {
    private connection: IORedis;
    private queues: Map<string, Queue>;
    private workers: Map<string, Worker>;
    private events: Map<string, QueueEvents>;

    constructor() {
        this.connection = new IORedis(process.env.REDIS_URL!, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
        });

        this.queues = new Map();
        this.workers = new Map();
        this.events = new Map();

        this.initializeQueues();
    }

    /**
     * Initialize all queues
     */
    private initializeQueues(): void {
        const queueNames = [
            'image-processing',
            'cleanup',
            'usage-aggregation',
            'notifications',
        ];

        for (const name of queueNames) {
            const queue = new Queue(name, {
                connection: this.connection,
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000,
                    },
                    removeOnComplete: {
                        age: 24 * 60 * 60, // Keep completed jobs for 24 hours
                        count: 1000,
                    },
                    removeOnFail: {
                        age: 7 * 24 * 60 * 60, // Keep failed jobs for 7 days
                    },
                },
            });

            this.queues.set(name, queue);

            // Setup queue events
            const queueEvents = new QueueEvents(name, {
                connection: this.connection,
            });

            queueEvents.on('completed', ({ jobId }) => {
                logger.info('Job completed', { queue: name, jobId });
            });

            queueEvents.on('failed', ({ jobId, failedReason }) => {
                logger.error('Job failed', { queue: name, jobId, reason: failedReason });
            });

            this.events.set(name, queueEvents);
        }

        logger.info('Queues initialized', { count: queueNames.length });
    }

    /**
     * Add image processing job
     */
    async addImageProcessingJob(data: ImageProcessingJob): Promise<string> {
        const queue = this.queues.get('image-processing')!;
        const job = await queue.add('process', data, {
            priority: 1, // Higher priority
        });

        logger.info('Image processing job added', { jobId: job.id });
        return job.id!;
    }

    /**
     * Add cleanup job
     */
    async addCleanupJob(data: CleanupJob): Promise<string> {
        const queue = this.queues.get('cleanup')!;
        const job = await queue.add('cleanup', data, {
            priority: 5, // Lower priority
        });

        logger.info('Cleanup job added', { jobId: job.id, type: data.type });
        return job.id!;
    }

    /**
     * Add usage aggregation job
     */
    async addUsageAggregationJob(data: UsageAggregationJob): Promise<string> {
        const queue = this.queues.get('usage-aggregation')!;
        const job = await queue.add('aggregate', data, {
            priority: 3,
        });

        logger.info('Usage aggregation job added', { jobId: job.id });
        return job.id!;
    }

    /**
     * Add notification job
     */
    async addNotificationJob(data: NotificationJob): Promise<string> {
        const queue = this.queues.get('notifications')!;
        const job = await queue.add('send', data, {
            priority: 2,
        });

        logger.info('Notification job added', { jobId: job.id, type: data.type });
        return job.id!;
    }

    /**
     * Schedule recurring jobs
     */
    async scheduleRecurringJobs(): Promise<void> {
        const cleanupQueue = this.queues.get('cleanup')!;
        const usageQueue = this.queues.get('usage-aggregation')!;

        // Daily cleanup at 2 AM
        await cleanupQueue.add(
            'daily-cleanup',
            {
                type: 'old_explanations',
                olderThanDays: 90,
            } as CleanupJob,
            {
                repeat: {
                    pattern: '0 2 * * *', // Cron: 2 AM every day
                },
            }
        );

        // Daily usage aggregation at 1 AM
        await usageQueue.add(
            'daily-aggregation',
            {
                date: new Date().toISOString().split('T')[0],
            } as UsageAggregationJob,
            {
                repeat: {
                    pattern: '0 1 * * *', // Cron: 1 AM every day
                },
            }
        );

        logger.info('Recurring jobs scheduled');
    }

    /**
     * Start workers
     */
    startWorkers(): void {
        this.startImageProcessingWorker();
        this.startCleanupWorker();
        this.startUsageAggregationWorker();
        this.startNotificationWorker();

        logger.info('All workers started');
    }

    /**
     * Image processing worker
     */
    private startImageProcessingWorker(): void {
        const worker = new Worker<ImageProcessingJob>(
            'image-processing',
            async (job: Job<ImageProcessingJob>) => {
                logger.info('Processing image job', { jobId: job.id, data: job.data });

                const { ImageProcessingService } = await import(
                    '@/services/image/ImageProcessingService'
                );
                const service = new ImageProcessingService();

                // Fetch image
                const response = await fetch(job.data.imageUrl);
                const buffer = Buffer.from(await response.arrayBuffer());

                // Process image
                const result = await service.processImage(buffer);

                logger.info('Image processed', {
                    jobId: job.id,
                    mainSize: result.main.size,
                    thumbSize: result.thumbnail.size,
                });

                return result;
            },
            {
                connection: this.connection,
                concurrency: 5, // Process 5 images concurrently
            }
        );

        this.workers.set('image-processing', worker);
    }

    /**
     * Cleanup worker
     */
    private startCleanupWorker(): void {
        const worker = new Worker<CleanupJob>(
            'cleanup',
            async (job: Job<CleanupJob>) => {
                logger.info('Processing cleanup job', { jobId: job.id, data: job.data });

                const { prisma } = await import('@/lib/database/client');

                switch (job.data.type) {
                    case 'old_explanations':
                        const cutoffDate = new Date();
                        cutoffDate.setDate(cutoffDate.getDate() - (job.data.olderThanDays || 90));

                        const deleted = await prisma.explanation.deleteMany({
                            where: {
                                created_at: { lt: cutoffDate },
                                deleted_at: { not: null },
                            },
                        });

                        logger.info('Old explanations cleaned up', { count: deleted.count });
                        break;

                    case 'failed_uploads':
                        // Clean up failed upload records
                        break;

                    case 'expired_sessions':
                        // Clean up expired sessions
                        break;
                }
            },
            {
                connection: this.connection,
                concurrency: 1,
            }
        );

        this.workers.set('cleanup', worker);
    }

    /**
     * Usage aggregation worker
     */
    private startUsageAggregationWorker(): void {
        const worker = new Worker<UsageAggregationJob>(
            'usage-aggregation',
            async (job: Job<UsageAggregationJob>) => {
                logger.info('Processing usage aggregation job', {
                    jobId: job.id,
                    date: job.data.date,
                });

                const { prisma } = await import('@/lib/database/client');

                // Aggregate usage by user
                const stats = await prisma.usage_log.groupBy({
                    by: ['user_id'],
                    where: {
                        created_at: {
                            gte: new Date(job.data.date),
                            lt: new Date(new Date(job.data.date).getTime() + 24 * 60 * 60 * 1000),
                        },
                    },
                    _sum: {
                        tokens_used: true,
                        cost_usd: true,
                    },
                    _count: {
                        id: true,
                    },
                });

                logger.info('Usage aggregated', {
                    date: job.data.date,
                    userCount: stats.length,
                });

                return stats;
            },
            {
                connection: this.connection,
                concurrency: 1,
            }
        );

        this.workers.set('usage-aggregation', worker);
    }

    /**
     * Notification worker
     */
    private startNotificationWorker(): void {
        const worker = new Worker<NotificationJob>(
            'notifications',
            async (job: Job<NotificationJob>) => {
                logger.info('Processing notification job', {
                    jobId: job.id,
                    type: job.data.type,
                });

                const { NotificationService } = await import(
                    '@/services/notification/NotificationService'
                );
                const service = new NotificationService();

                if (job.data.type === 'email') {
                    await service.sendEmail({
                        userId: job.data.userId,
                        template: job.data.template,
                        data: job.data.data,
                    });
                } else if (job.data.type === 'push') {
                    await service.sendPushNotification({
                        userId: job.data.userId,
                        title: job.data.data.title,
                        body: job.data.data.body,
                        data: job.data.data,
                    });
                }
            },
            {
                connection: this.connection,
                concurrency: 10,
            }
        );

        this.workers.set('notifications', worker);
    }

    /**
     * Get queue stats
     */
    async getQueueStats(queueName: string): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    }> {
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }

        const [waiting, active, completed, failed, delayed] = await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
            queue.getDelayedCount(),
        ]);

        return { waiting, active, completed, failed, delayed };
    }

    /**
     * Shutdown gracefully
     */
    async shutdown(): Promise<void> {
        logger.info('Shutting down queue service...');

        // Close all workers
        for (const [name, worker] of this.workers) {
            await worker.close();
            logger.info('Worker closed', { name });
        }

        // Close all queues
        for (const [name, queue] of this.queues) {
            await queue.close();
            logger.info('Queue closed', { name });
        }

        // Close queue events
        for (const [name, events] of this.events) {
            await events.close();
            logger.info('Queue events closed', { name });
        }

        // Disconnect Redis
        await this.connection.quit();

        logger.info('Queue service shut down successfully');
    }
}