// app/api/v1/subscriptions/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { StripeService } from '@/services/payment/StripeService';
import { logger } from '@/utils/logger';

export const config = {
    api: {
        bodyParser: false, // Disable Next.js body parsing for raw body
    },
};

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get('stripe-signature');

        if (!signature) {
            return NextResponse.json(
                { error: 'Missing stripe-signature header' },
                { status: 400 }
            );
        }

        const stripeService = new StripeService();
        const result = await stripeService.handleWebhook(rawBody, signature);

        return NextResponse.json(result);

    } catch (error) {
        logger.error('Webhook processing failed', error);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 400 }
        );
    }
}