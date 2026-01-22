// src/services/payment/StripeService.ts
import Stripe from 'stripe';
import { prisma } from '@/lib/database/client';
import { logger } from '@/utils/logger';
import { analytics } from '@/lib/monitoring/analytics';

export interface CreateCheckoutSessionRequest {
    userId: string;
    email: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
}

export interface SubscriptionDetails {
    id: string;
    status: Stripe.Subscription.Status;
    tier: 'free' | 'pro' | 'developer';
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    trialEnd?: Date;
}

export class StripeService {
    private stripe: Stripe;

    // Price IDs (set these in your Stripe Dashboard)
    private readonly PRICE_IDS = {
        pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY!,
        pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY!,
        developer_monthly: process.env.STRIPE_PRICE_DEVELOPER_MONTHLY!,
        developer_yearly: process.env.STRIPE_PRICE_DEVELOPER_YEARLY!,
    };

    constructor() {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: '2024-11-20.acacia',
            typescript: true,
        });
    }

    /**
     * Create Stripe customer for user
     */
    async createCustomer(params: {
        userId: string;
        email: string;
        name?: string;
    }): Promise<string> {
        try {
            const customer = await this.stripe.customers.create({
                email: params.email,
                name: params.name,
                metadata: {
                    userId: params.userId,
                },
            });

            // Save customer ID to database
            await prisma.user.update({
                where: { id: params.userId },
                data: { stripe_customer_id: customer.id },
            });

            logger.info('Stripe customer created', {
                userId: params.userId,
                customerId: customer.id,
            });

            return customer.id;

        } catch (error) {
            logger.error('Failed to create Stripe customer', error);
            throw error;
        }
    }

    /**
     * Create checkout session for subscription
     */
    async createCheckoutSession(
        request: CreateCheckoutSessionRequest
    ): Promise<{ sessionId: string; url: string }> {
        try {
            // Get or create customer
            const user = await prisma.user.findUnique({
                where: { id: request.userId },
                select: { stripe_customer_id: true },
            });

            let customerId = user?.stripe_customer_id;

            if (!customerId) {
                customerId = await this.createCustomer({
                    userId: request.userId,
                    email: request.email,
                });
            }

            // Create checkout session
            const session = await this.stripe.checkout.sessions.create({
                customer: customerId,
                mode: 'subscription',
                payment_method_types: ['card'],
                line_items: [
                    {
                        price: request.priceId,
                        quantity: 1,
                    },
                ],
                success_url: request.successUrl,
                cancel_url: request.cancelUrl,
                metadata: {
                    userId: request.userId,
                },
                subscription_data: {
                    metadata: {
                        userId: request.userId,
                    },
                    trial_period_days: this.getTrialDays(request.priceId),
                },
                allow_promotion_codes: true,
                billing_address_collection: 'auto',
                tax_id_collection: {
                    enabled: true,
                },
            });

            logger.info('Checkout session created', {
                userId: request.userId,
                sessionId: session.id,
            });

            return {
                sessionId: session.id,
                url: session.url!,
            };

        } catch (error) {
            logger.error('Failed to create checkout session', error);
            throw error;
        }
    }

    /**
     * Create customer portal session
     */
    async createPortalSession(params: {
        userId: string;
        returnUrl: string;
    }): Promise<{ url: string }> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: params.userId },
                select: { stripe_customer_id: true },
            });

            if (!user?.stripe_customer_id) {
                throw new Error('User has no Stripe customer ID');
            }

            const session = await this.stripe.billingPortal.sessions.create({
                customer: user.stripe_customer_id,
                return_url: params.returnUrl,
            });

            return { url: session.url };

        } catch (error) {
            logger.error('Failed to create portal session', error);
            throw error;
        }
    }

    /**
     * Get subscription details
     */
    async getSubscription(userId: string): Promise<SubscriptionDetails | null> {
        try {
            const subscription = await prisma.subscription.findFirst({
                where: {
                    user_id: userId,
                    status: { in: ['active', 'trialing', 'past_due'] },
                },
                orderBy: { created_at: 'desc' },
            });

            if (!subscription) {
                return null;
            }

            return {
                id: subscription.id,
                status: subscription.status as Stripe.Subscription.Status,
                tier: this.getTierFromPriceId(subscription.stripe_price_id || ''),
                currentPeriodEnd: subscription.current_period_end!,
                cancelAtPeriodEnd: !!subscription.cancel_at,
                trialEnd: undefined, // Can be added if needed
            };

        } catch (error) {
            logger.error('Failed to get subscription', error);
            return null;
        }
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(userId: string): Promise<void> {
        try {
            const subscription = await prisma.subscription.findFirst({
                where: {
                    user_id: userId,
                    status: { in: ['active', 'trialing'] },
                },
            });

            if (!subscription?.stripe_subscription_id) {
                throw new Error('No active subscription found');
            }

            // Cancel at period end (don't cancel immediately)
            await this.stripe.subscriptions.update(subscription.stripe_subscription_id, {
                cancel_at_period_end: true,
            });

            await prisma.subscription.update({
                where: { id: subscription.id },
                data: {
                    cancel_at: subscription.current_period_end,
                    updated_at: new Date(),
                },
            });

            logger.info('Subscription cancelled', {
                userId,
                subscriptionId: subscription.id,
            });

        } catch (error) {
            logger.error('Failed to cancel subscription', error);
            throw error;
        }
    }

    /**
     * Reactivate cancelled subscription
     */
    async reactivateSubscription(userId: string): Promise<void> {
        try {
            const subscription = await prisma.subscription.findFirst({
                where: {
                    user_id: userId,
                    status: 'active',
                    cancel_at: { not: null },
                },
            });

            if (!subscription?.stripe_subscription_id) {
                throw new Error('No cancelled subscription found');
            }

            await this.stripe.subscriptions.update(subscription.stripe_subscription_id, {
                cancel_at_period_end: false,
            });

            await prisma.subscription.update({
                where: { id: subscription.id },
                data: {
                    cancel_at: null,
                    updated_at: new Date(),
                },
            });

            logger.info('Subscription reactivated', {
                userId,
                subscriptionId: subscription.id,
            });

        } catch (error) {
            logger.error('Failed to reactivate subscription', error);
            throw error;
        }
    }

    /**
     * Handle webhook events
     */
    async handleWebhook(
        rawBody: string,
        signature: string
    ): Promise<{ received: boolean }> {
        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(
                rawBody,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET!
            );
        } catch (error) {
            logger.error('Webhook signature verification failed', error);
            throw new Error('Invalid signature');
        }

        logger.info('Stripe webhook received', { type: event.type });

        try {
            switch (event.type) {
                case 'checkout.session.completed':
                    await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
                    break;

                case 'customer.subscription.created':
                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
                    break;

                case 'customer.subscription.deleted':
                    await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
                    break;

                case 'invoice.payment_succeeded':
                    await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
                    break;

                case 'invoice.payment_failed':
                    await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
                    break;

                default:
                    logger.info('Unhandled webhook event', { type: event.type });
            }

            return { received: true };

        } catch (error) {
            logger.error('Webhook handler failed', { type: event.type, error });
            throw error;
        }
    }

    /**
     * Handle checkout completed
     */
    private async handleCheckoutCompleted(
        session: Stripe.Checkout.Session
    ): Promise<void> {
        const userId = session.metadata?.userId;
        if (!userId) {
            logger.error('No userId in checkout session metadata');
            return;
        }

        logger.info('Checkout completed', {
            userId,
            sessionId: session.id,
            customerId: session.customer,
        });

        // Subscription will be created via subscription.created webhook
    }

    /**
     * Handle subscription created/updated
     */
    private async handleSubscriptionUpdated(
        subscription: Stripe.Subscription
    ): Promise<void> {
        const userId = subscription.metadata?.userId;
        if (!userId) {
            logger.error('No userId in subscription metadata');
            return;
        }

        const tier = this.getTierFromPriceId(subscription.items.data[0]?.price.id || '');

        // Upsert subscription
        await prisma.subscription.upsert({
            where: { stripe_subscription_id: subscription.id },
            create: {
                user_id: userId,
                stripe_subscription_id: subscription.id,
                stripe_price_id: subscription.items.data[0]?.price.id,
                tier,
                status: subscription.status,
                current_period_start: new Date(subscription.current_period_start * 1000),
                current_period_end: new Date(subscription.current_period_end * 1000),
                cancel_at: subscription.cancel_at
                    ? new Date(subscription.cancel_at * 1000)
                    : null,
            },
            update: {
                stripe_price_id: subscription.items.data[0]?.price.id,
                tier,
                status: subscription.status,
                current_period_start: new Date(subscription.current_period_start * 1000),
                current_period_end: new Date(subscription.current_period_end * 1000),
                cancel_at: subscription.cancel_at
                    ? new Date(subscription.cancel_at * 1000)
                    : null,
                updated_at: new Date(),
            },
        });

        // Update user tier
        await prisma.user.update({
            where: { id: userId },
            data: {
                subscription_tier: tier,
                subscription_status: subscription.status,
                subscription_expires_at: new Date(subscription.current_period_end * 1000),
            },
        });

        // Track analytics
        if (subscription.status === 'active') {
            analytics.subscriptionStarted(tier);
        }

        logger.info('Subscription updated', {
            userId,
            subscriptionId: subscription.id,
            status: subscription.status,
            tier,
        });
    }

    /**
     * Handle subscription deleted
     */
    private async handleSubscriptionDeleted(
        subscription: Stripe.Subscription
    ): Promise<void> {
        const userId = subscription.metadata?.userId;
        if (!userId) {
            logger.error('No userId in subscription metadata');
            return;
        }

        await prisma.subscription.update({
            where: { stripe_subscription_id: subscription.id },
            data: {
                status: 'canceled',
                canceled_at: new Date(),
                updated_at: new Date(),
            },
        });

        await prisma.user.update({
            where: { id: userId },
            data: {
                subscription_tier: 'free',
                subscription_status: 'canceled',
            },
        });

        logger.info('Subscription deleted', {
            userId,
            subscriptionId: subscription.id,
        });
    }

    /**
     * Handle successful payment
     */
    private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
        logger.info('Payment succeeded', {
            invoiceId: invoice.id,
            amount: invoice.amount_paid,
            customerId: invoice.customer,
        });

        // Could send receipt email here
    }

    /**
     * Handle failed payment
     */
    private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
        logger.warn('Payment failed', {
            invoiceId: invoice.id,
            customerId: invoice.customer,
        });

        // Could send payment failure notification here
    }

    /**
     * Get tier from Stripe price ID
     */
    private getTierFromPriceId(priceId: string): 'free' | 'pro' | 'developer' {
        if (
            priceId === this.PRICE_IDS.pro_monthly ||
            priceId === this.PRICE_IDS.pro_yearly
        ) {
            return 'pro';
        }
        if (
            priceId === this.PRICE_IDS.developer_monthly ||
            priceId === this.PRICE_IDS.developer_yearly
        ) {
            return 'developer';
        }
        return 'free';
    }

    /**
     * Get trial days based on price
     */
    private getTrialDays(priceId: string): number {
        // 7-day trial for all paid plans
        return priceId === this.PRICE_IDS.pro_monthly ||
            priceId === this.PRICE_IDS.pro_yearly ||
            priceId === this.PRICE_IDS.developer_monthly ||
            priceId === this.PRICE_IDS.developer_yearly
            ? 7
            : 0;
    }

    /**
     * Get usage-based pricing (for future)
     */
    async recordUsage(params: {
        subscriptionId: string;
        quantity: number;
        timestamp?: number;
    }): Promise<void> {
        try {
            const subscription = await this.stripe.subscriptions.retrieve(
                params.subscriptionId
            );

            const subscriptionItem = subscription.items.data[0];

            await this.stripe.subscriptionItems.createUsageRecord(
                subscriptionItem.id,
                {
                    quantity: params.quantity,
                    timestamp: params.timestamp || Math.floor(Date.now() / 1000),
                    action: 'increment',
                }
            );

            logger.info('Usage recorded', {
                subscriptionId: params.subscriptionId,
                quantity: params.quantity,
            });

        } catch (error) {
            logger.error('Failed to record usage', error);
            throw error;
        }
    }
}