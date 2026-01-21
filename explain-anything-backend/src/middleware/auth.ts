// src/middleware/auth.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, JWTPayload } from '@/utils/jwt';
import { redis } from '@/lib/cache/redis';
import { logger } from '@/utils/logger';

export async function authMiddleware(req: NextRequest) {
    try {
        // Extract token
        const token = req.headers.get('authorization')?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check token blacklist (for logged out users)
        const isBlacklisted = await redis.get(`blacklist:${token}`);
        if (isBlacklisted) {
            return NextResponse.json(
                { error: 'Token revoked' },
                { status: 401 }
            );
        }

        // Verify JWT
        const payload = await verifyJWT(token);

        // Check if user still exists and is active
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                email: true,
                subscription_tier: true,
                subscription_status: true,
                locked_until: true,
            }
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 401 }
            );
        }

        // Check if account is locked
        if (user.locked_until && user.locked_until > new Date()) {
            return NextResponse.json(
                { error: 'Account locked' },
                { status: 403 }
            );
        }

        // Attach user to request
        (req as any).user = user;

        return NextResponse.next();

    } catch (error) {
        logger.error('Auth middleware error', error);
        return NextResponse.json(
            { error: 'Invalid token' },
            { status: 401 }
        );
    }
}