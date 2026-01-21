// src/middleware/rateLimit.ts
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/cache/redis';
import { logger } from '@/utils/logger';

interface RateLimitConfig {
    free: { requests: number; window: number };
    pro: { requests: number; window: number };
    dev: { requests: number; window: number };
}

const RATE_LIMITS: RateLimitConfig = {
    free: { requests: 10, window: 86400 }, // 10 per day
    pro: { requests: 1000, window: 86400 }, // 1000 per day
    dev: { requests: 10000, window: 86400 }, // 10k per day
};

export async function rateLimitMiddleware(req: NextRequest) {
    const user = (req as any).user;

    if (!user) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    const tier = user.subscription_tier as keyof RateLimitConfig;
    const limit = RATE_LIMITS[tier] || RATE_LIMITS.free;

    const key = `ratelimit:${user.id}:${Date.now()}`;
    const current = await redis.incr(key);

    if (current === 1) {
        await redis.expire(key, limit.window);
    }

    if (current > limit.requests) {
        const ttl = await redis.ttl(key);

        return NextResponse.json(
            {
                error: 'Rate limit exceeded',
                limit: limit.requests,
                resetIn: ttl,
            },
            {
                status: 429,
                headers: {
                    'X-RateLimit-Limit': limit.requests.toString(),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': (Date.now() + ttl * 1000).toString(),
                },
            }
        );
    }

    // Add rate limit headers
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', limit.requests.toString());
    response.headers.set('X-RateLimit-Remaining', (limit.requests - current).toString());

    return response;
}