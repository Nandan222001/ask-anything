// src/services/notification/NotificationService.ts
import sgMail from '@sendgrid/mail';
import admin from 'firebase-admin';
import { prisma } from '@/lib/database/client';
import { logger } from '@/utils/logger';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// Initialize Firebase Admin (for push notifications)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

export interface SendEmailRequest {
    userId: string;
    template: string;
    data: Record<string, any>;
}

export interface SendPushRequest {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, any>;
}

export class NotificationService {
    private readonly FROM_EMAIL = 'notifications@explainanything.app';
    private readonly FROM_NAME = 'Explain Anything';

    /**
     * Send email notification
     */
    async sendEmail(request: SendEmailRequest): Promise<void> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: request.userId },
                select: { email: true, full_name: true },
            });

            if (!user?.email) {
                logger.warn('User has no email', { userId: request.userId });
                return;
            }

            const { subject, html, text } = this.renderEmailTemplate(
                request.template,
                {
                    ...request.data,
                    userName: user.full_name || 'there',
                }
            );

            await sgMail.send({
                to: user.email,
                from: {
                    email: this.FROM_EMAIL,
                    name: this.FROM_NAME,
                },
                subject,
                text,
                html,
            });

            logger.info('Email sent', {
                userId: request.userId,
                template: request.template,
                to: user.email,
            });

        } catch (error) {
            logger.error('Failed to send email', error);
            throw error;
        }
    }

    /**
     * Send push notification
     */
    async sendPushNotification(request: SendPushRequest): Promise<void> {
        try {
            // Get user's FCM tokens
            const user = await prisma.user.findUnique({
                where: { id: request.userId },
                select: { preferences: true },
            });

            const preferences = user?.preferences as any;
            const fcmTokens = preferences?.fcmTokens || [];

            if (fcmTokens.length === 0) {
                logger.warn('User has no FCM tokens', { userId: request.userId });
                return;
            }

            const message: admin.messaging.MulticastMessage = {
                notification: {
                    title: request.title,
                    body: request.body,
                },
                data: request.data,
                tokens: fcmTokens,
                android: {
                    priority: 'high',
                    notification: {
                        sound: 'default',
                        channelId: 'explanations',
                    },
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1,
                        },
                    },
                },
            };

            const response = await admin.messaging().sendMulticast(message);

            // Remove invalid tokens
            if (response.failureCount > 0) {
                const invalidTokens: string[] = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        invalidTokens.push(fcmTokens[idx]);
                    }
                });

                if (invalidTokens.length > 0) {
                    const validTokens = fcmTokens.filter((t: string) => !invalidTokens.includes(t));
                    await prisma.user.update({
                        where: { id: request.userId },
                        data: {
                            preferences: {
                                ...preferences,
                                fcmTokens: validTokens,
                            },
                        },
                    });
                }
            }

            logger.info('Push notification sent', {
                userId: request.userId,
                successCount: response.successCount,
                failureCount: response.failureCount,
            });

        } catch (error) {
            logger.error('Failed to send push notification', error);
            throw error;
        }
    }

    /**
     * Send welcome email
     */
    async sendWelcomeEmail(userId: string): Promise<void> {
        await this.sendEmail({
            userId,
            template: 'welcome',
            data: {},
        });
    }

    /**
     * Send subscription confirmation
     */
    async sendSubscriptionConfirmation(
        userId: string,
        tier: string
    ): Promise<void> {
        await this.sendEmail({
            userId,
            template: 'subscription-confirmed',
            data: { tier },
        });
    }

    /**
     * Send payment failed notification
     */
    async sendPaymentFailed(userId: string): Promise<void> {
        await this.sendEmail({
            userId,
            template: 'payment-failed',
            data: {},
        });
    }

    /**
     * Send daily usage summary
     */
    async sendDailyUsageSummary(
        userId: string,
        stats: {
            explanationsCount: number;
            categoriesUsed: string[];
        }
    ): Promise<void> {
        await this.sendEmail({
            userId,
            template: 'daily-summary',
            data: stats,
        });
    }

    /**
     * Render email template
     */
    private renderEmailTemplate(
        template: string,
        data: Record<string, any>
    ): { subject: string; html: string; text: string } {
        const templates: Record<string, any> = {
            welcome: {
                subject: 'Welcome to Explain Anything! 🎉',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Welcome, ${data.userName}!</h1>
            <p>Thanks for joining Explain Anything. You're now ready to understand the world around you instantly.</p>
            <p><strong>Here's what you can do:</strong></p>
            <ul>
              <li>Point your camera at anything and get instant explanations</li>
              <li>Get help with homework, translations, or identifying objects</li>
              <li>Ask follow-up questions to dive deeper</li>
            </ul>
            <p>You get <strong>10 free explanations per day</strong>. Need more? Upgrade to Pro anytime!</p>
            <a href="https://explainanything.app" style="display: inline-block; padding: 12px 24px; background: #6366F1; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px;">Start Explaining</a>
          </div>
        `,
                text: `Welcome, ${data.userName}!\n\nThanks for joining Explain Anything...`,
            },

            'subscription-confirmed': {
                subject: `Your ${data.tier} subscription is active! 🚀`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Subscription Activated!</h1>
            <p>Hi ${data.userName},</p>
            <p>Your <strong>${data.tier}</strong> subscription is now active. Enjoy unlimited explanations!</p>
            <p>Questions? Reply to this email anytime.</p>
          </div>
        `,
                text: `Your ${data.tier} subscription is now active!`,
            },

            'payment-failed': {
                subject: 'Payment failed - Please update your payment method',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Payment Issue</h1>
            <p>Hi ${data.userName},</p>
            <p>We couldn't process your payment. Please update your payment method to continue using Explain Anything Pro.</p>
            <a href="https://explainanything.app/settings/billing" style="display: inline-block; padding: 12px 24px; background: #EF4444; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px;">Update Payment Method</a>
          </div>
        `,
                text: 'We couldn\'t process your payment...',
            },

            'daily-summary': {
                subject: 'Your daily summary from Explain Anything',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Daily Summary</h1>
            <p>Hi ${data.userName},</p>
            <p>Today you created <strong>${data.explanationsCount} explanations</strong> across these categories:</p>
            <ul>
              ${data.categoriesUsed.map((cat: string) => `<li>${cat}</li>`).join('')}
            </ul>
            <p>Keep learning! 📚</p>
          </div>
        `,
                text: `You created ${data.explanationsCount} explanations today!`,
            },
        };

        const tmpl = templates[template] || templates.welcome;
        return {
            subject: tmpl.subject,
            html: tmpl.html,
            text: tmpl.text,
        };
    }

    /**
     * Register FCM token for user
     */
    async registerFCMToken(userId: string, token: string): Promise<void> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { preferences: true },
        });

        const preferences = (user?.preferences as any) || {};
        const tokens = preferences.fcmTokens || [];

        if (!tokens.includes(token)) {
            tokens.push(token);

            await prisma.user.update({
                where: { id: userId },
                data: {
                    preferences: {
                        ...preferences,
                        fcmTokens: tokens,
                    },
                },
            });

            logger.info('FCM token registered', { userId });
        }
    }

    /**
     * Unregister FCM token
     */
    async unregisterFCMToken(userId: string, token: string): Promise<void> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { preferences: true },
        });

        const preferences = (user?.preferences as any) || {};
        const tokens = (preferences.fcmTokens || []).filter((t: string) => t !== token);

        await prisma.user.update({
            where: { id: userId },
            data: {
                preferences: {
                    ...preferences,
                    fcmTokens: tokens,
                },
            },
        });

        logger.info('FCM token unregistered', { userId });
    }
}