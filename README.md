# 🏗️ **"Explain Anything" - Production-Grade System Design**

## **Senior Engineer at Google would build it like this:**

---

# 📐 **SYSTEM ARCHITECTURE**

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Mobile     │  │     Web      │  │     CLI      │          │
│  │ (React Native│  │  (Next.js)   │  │  (Node.js)   │          │
│  │   + Expo)    │  │              │  │              │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
└─────────┼──────────────────┼──────────────────┼───────────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                    ┌────────▼─────────┐
                    │   API Gateway    │
                    │  (Rate Limiting, │
                    │   Auth, CORS)    │
                    └────────┬─────────┘
                             │
          ┏━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━┓
          ▼                                    ▼
┌─────────────────────┐          ┌─────────────────────┐
│   BACKEND SERVICES  │          │   EDGE FUNCTIONS    │
│   (Next.js API)     │          │   (Supabase Edge)   │
├─────────────────────┤          ├─────────────────────┤
│                     │          │                     │
│ • Auth Service      │          │ • Image Processing  │
│ • Explanation Svc   │          │ • Webhook Handlers  │
│ • Payment Service   │          │ • Real-time Updates │
│ • User Service      │          │                     │
│ • Analytics Service │          │                     │
└──────────┬──────────┘          └──────────┬──────────┘
           │                                 │
           └────────────┬────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌─────────────┐ ┌─────────────┐
│  PostgreSQL  │ │   Redis     │ │  S3/Storage │
│  (Supabase)  │ │  (Cache)    │ │   (Images)  │
│              │ │             │ │             │
│ • Users      │ │ • Sessions  │ │ • Original  │
│ • Explains   │ │ • Rate Limit│ │ • Compressed│
│ • Messages   │ │ • Queue     │ │ • Thumbnails│
└──────────────┘ └─────────────┘ └─────────────┘

EXTERNAL SERVICES:
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│  OpenAI    │ │  Stripe    │ │  Sentry    │ │  PostHog   │
│  Vision    │ │  Payments  │ │  Errors    │ │  Analytics │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
```

---

# 📁 **COMPLETE FOLDER STRUCTURE**

## **Mobile App (React Native + Expo)**

```
explain-anything-mobile/
├── app/                                    # Expo Router (file-based routing)
│   ├── (auth)/                            # Auth group (signed out)
│   │   ├── sign-in.tsx
│   │   ├── sign-up.tsx
│   │   └── _layout.tsx
│   │
│   ├── (tabs)/                            # Main app (signed in)
│   │   ├── index.tsx                      # Camera/Home screen
│   │   ├── history.tsx                    # History list
│   │   ├── settings.tsx                   # Settings & profile
│   │   └── _layout.tsx                    # Tab navigator
│   │
│   ├── explain/
│   │   └── [id].tsx                       # Explanation detail + chat
│   │
│   ├── onboarding.tsx                     # First-time user flow
│   ├── paywall.tsx                        # Subscription upgrade
│   ├── _layout.tsx                        # Root layout
│   └── +not-found.tsx
│
├── src/
│   ├── components/                        # Reusable components
│   │   ├── ui/                           # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── Modal.tsx
│   │   │
│   │   ├── camera/
│   │   │   ├── CameraView.tsx            # Main camera interface
│   │   │   ├── CaptureButton.tsx         # Animated capture button
│   │   │   ├── FlashToggle.tsx
│   │   │   ├── FocusRing.tsx             # Tap-to-focus animation
│   │   │   └── ImagePreview.tsx
│   │   │
│   │   ├── explanation/
│   │   │   ├── ExplanationCard.tsx       # Main explanation display
│   │   │   ├── LoadingAnimation.tsx      # AI thinking animation
│   │   │   ├── ChatBubble.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   ├── FollowUpSuggestions.tsx
│   │   │   └── ShareButton.tsx
│   │   │
│   │   ├── history/
│   │   │   ├── HistoryList.tsx
│   │   │   ├── HistoryItem.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   └── FilterChips.tsx
│   │   │
│   │   └── common/
│   │       ├── Header.tsx
│   │       ├── LoadingOverlay.tsx
│   │       ├── ErrorBoundary.tsx
│   │       └── EmptyState.tsx
│   │
│   ├── lib/                              # Core utilities & clients
│   │   ├── supabase/
│   │   │   ├── client.ts                # Supabase client config
│   │   │   ├── auth.ts                  # Auth helpers
│   │   │   ├── storage.ts               # Storage helpers
│   │   │   └── realtime.ts              # Realtime subscriptions
│   │   │
│   │   ├── api/
│   │   │   ├── client.ts                # API client with interceptors
│   │   │   ├── endpoints.ts             # API endpoint definitions
│   │   │   ├── openai.ts                # OpenAI integration
│   │   │   └── stripe.ts                # Stripe integration
│   │   │
│   │   ├── cache/
│   │   │   ├── query-client.ts          # React Query config
│   │   │   └── persistence.ts           # Offline persistence
│   │   │
│   │   └── monitoring/
│   │       ├── sentry.ts                # Error tracking
│   │       ├── analytics.ts             # PostHog analytics
│   │       └── performance.ts           # Performance monitoring
│   │
│   ├── hooks/                            # Custom React hooks
│   │   ├── useCamera.ts
│   │   ├── useExplanation.ts
│   │   ├── useAuth.ts
│   │   ├── useSubscription.ts
│   │   ├── useImageUpload.ts
│   │   ├── useDebounce.ts
│   │   ├── useKeyboard.ts
│   │   └── useNetworkStatus.ts
│   │
│   ├── services/                         # Business logic layer
│   │   ├── explanation/
│   │   │   ├── ExplanationService.ts    # Core explanation logic
│   │   │   ├── ChatService.ts           # Follow-up chat
│   │   │   └── HistoryService.ts
│   │   │
│   │   ├── image/
│   │   │   ├── ImageService.ts          # Image processing
│   │   │   ├── CompressionService.ts    # Image compression
│   │   │   └── OCRService.ts            # Text extraction
│   │   │
│   │   ├── auth/
│   │   │   └── AuthService.ts
│   │   │
│   │   ├── payment/
│   │   │   └── PaymentService.ts
│   │   │
│   │   └── offline/
│   │       └── QueueService.ts          # Offline request queue
│   │
│   ├── store/                            # State management (Zustand)
│   │   ├── authStore.ts
│   │   ├── explanationStore.ts
│   │   ├── cameraStore.ts
│   │   ├── settingsStore.ts
│   │   └── offlineStore.ts
│   │
│   ├── types/                            # TypeScript definitions
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── Explanation.ts
│   │   │   ├── Message.ts
│   │   │   └── Subscription.ts
│   │   │
│   │   ├── api/
│   │   │   ├── requests.ts
│   │   │   └── responses.ts
│   │   │
│   │   └── common/
│   │       └── index.ts
│   │
│   ├── utils/                            # Helper functions
│   │   ├── image/
│   │   │   ├── compress.ts
│   │   │   ├── validate.ts
│   │   │   └── transform.ts
│   │   │
│   │   ├── validation/
│   │   │   ├── schemas.ts               # Zod schemas
│   │   │   └── validators.ts
│   │   │
│   │   ├── formatting/
│   │   │   ├── date.ts
│   │   │   ├── text.ts
│   │   │   └── currency.ts
│   │   │
│   │   ├── security/
│   │   │   ├── encryption.ts
│   │   │   ├── sanitization.ts
│   │   │   └── rateLimit.ts
│   │   │
│   │   └── constants.ts
│   │
│   ├── styles/                           # Shared styles
│   │   ├── theme.ts                     # Design tokens
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   ├── animations.ts
│   │   └── shadows.ts
│   │
│   └── config/                           # App configuration
│       ├── env.ts                       # Environment variables
│       ├── app.ts                       # App constants
│       └── features.ts                  # Feature flags
│
├── assets/
│   ├── images/
│   ├── animations/                      # Lottie files
│   ├── fonts/
│   └── icons/
│
├── __tests__/                           # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── scripts/
│   ├── generate-icons.sh
│   └── setup-env.sh
│
├── .env.local
├── .env.production
├── app.json
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

---

## **Backend (Next.js API)**

```
explain-anything-backend/
├── app/                                  # Next.js 14 App Router
│   ├── api/
│   │   ├── v1/
│   │   │   ├── auth/
│   │   │   │   ├── sign-in/route.ts
│   │   │   │   ├── sign-up/route.ts
│   │   │   │   ├── refresh/route.ts
│   │   │   │   └── logout/route.ts
│   │   │   │
│   │   │   ├── explanations/
│   │   │   │   ├── route.ts             # POST create, GET list
│   │   │   │   ├── [id]/route.ts        # GET, PATCH, DELETE
│   │   │   │   └── [id]/chat/route.ts   # Follow-up questions
│   │   │   │
│   │   │   ├── upload/
│   │   │   │   └── route.ts             # Signed URL generation
│   │   │   │
│   │   │   ├── subscriptions/
│   │   │   │   ├── route.ts
│   │   │   │   └── webhook/route.ts     # Stripe webhooks
│   │   │   │
│   │   │   └── users/
│   │   │       ├── me/route.ts
│   │   │       └── usage/route.ts       # Usage stats
│   │   │
│   │   └── health/route.ts
│   │
│   └── (web)/                           # Web app routes
│       ├── page.tsx
│       ├── pricing/page.tsx
│       └── dashboard/page.tsx
│
├── src/
│   ├── middleware/
│   │   ├── auth.ts                      # JWT verification
│   │   ├── rateLimit.ts                 # Rate limiting
│   │   ├── cors.ts
│   │   ├── validation.ts                # Request validation
│   │   ├── errorHandler.ts
│   │   └── logger.ts
│   │
│   ├── services/
│   │   ├── ai/
│   │   │   ├── OpenAIService.ts
│   │   │   ├── PromptService.ts         # Prompt engineering
│   │   │   └── FallbackService.ts       # Backup AI models
│   │   │
│   │   ├── storage/
│   │   │   ├── StorageService.ts        # S3/Supabase storage
│   │   │   └── CDNService.ts
│   │   │
│   │   ├── payment/
│   │   │   ├── StripeService.ts
│   │   │   └── SubscriptionService.ts
│   │   │
│   │   ├── notification/
│   │   │   ├── EmailService.ts
│   │   │   └── PushService.ts
│   │   │
│   │   └── analytics/
│   │       └── AnalyticsService.ts
│   │
│   ├── repositories/                    # Data access layer
│   │   ├── UserRepository.ts
│   │   ├── ExplanationRepository.ts
│   │   ├── MessageRepository.ts
│   │   └── SubscriptionRepository.ts
│   │
│   ├── models/                          # Domain models
│   │   ├── User.ts
│   │   ├── Explanation.ts
│   │   ├── Message.ts
│   │   └── Subscription.ts
│   │
│   ├── lib/
│   │   ├── database/
│   │   │   ├── client.ts               # Prisma client
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   │
│   │   ├── cache/
│   │   │   └── redis.ts
│   │   │
│   │   ├── queue/
│   │   │   └── bullmq.ts               # Job queue
│   │   │
│   │   └── monitoring/
│   │       ├── sentry.ts
│   │       └── datadog.ts
│   │
│   ├── workers/                         # Background jobs
│   │   ├── imageProcessor.ts
│   │   ├── usageAggregator.ts
│   │   └── cleanupWorker.ts
│   │
│   ├── utils/
│   │   ├── crypto.ts
│   │   ├── jwt.ts
│   │   ├── validation.ts
│   │   └── logger.ts
│   │
│   └── config/
│       ├── env.ts
│       ├── database.ts
│       ├── redis.ts
│       └── openai.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── load/
│
├── .env
├── .env.production
├── next.config.js
├── tsconfig.json
└── package.json
```

---

# 🗄️ **DATABASE SCHEMA (PostgreSQL)**

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified_at TIMESTAMP,
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    avatar_url TEXT,
    
    -- Subscription
    subscription_tier VARCHAR(50) DEFAULT 'free',
    subscription_status VARCHAR(50) DEFAULT 'active',
    stripe_customer_id VARCHAR(255),
    subscription_expires_at TIMESTAMP,
    
    -- Usage tracking
    daily_usage_count INT DEFAULT 0,
    daily_usage_reset_at TIMESTAMP DEFAULT NOW(),
    total_explanations INT DEFAULT 0,
    
    -- Preferences
    preferences JSONB DEFAULT '{}',
    developer_mode BOOLEAN DEFAULT false,
    
    -- Security
    last_login_at TIMESTAMP,
    last_login_ip INET,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX idx_users_subscription ON users(subscription_tier, subscription_status);

-- Explanations table
CREATE TABLE explanations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Image data
    image_url TEXT NOT NULL,
    image_thumbnail_url TEXT,
    image_hash VARCHAR(64),
    image_size_bytes BIGINT,
    image_width INT,
    image_height INT,
    
    -- AI Processing
    prompt_text TEXT,
    explanation_text TEXT NOT NULL,
    explanation_model VARCHAR(100),
    processing_time_ms INT,
    confidence_score FLOAT,
    
    -- Categorization
    category VARCHAR(100),
    tags TEXT[],
    language VARCHAR(10) DEFAULT 'en',
    
    -- Usage context
    is_developer_mode BOOLEAN DEFAULT false,
    device_type VARCHAR(50),
    
    -- Engagement
    is_favorited BOOLEAN DEFAULT false,
    share_count INT DEFAULT 0,
    view_count INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_explanations_user ON explanations(user_id);
CREATE INDEX idx_explanations_created ON explanations(created_at DESC);
CREATE INDEX idx_explanations_category ON explanations(category);
CREATE INDEX idx_explanations_favorited ON explanations(user_id, is_favorited) WHERE is_favorited = true;

-- Messages table (for follow-up chats)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    explanation_id UUID REFERENCES explanations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    
    -- AI metadata
    model VARCHAR(100),
    tokens_used INT,
    processing_time_ms INT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_explanation ON messages(explanation_id, created_at);

-- Subscriptions table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_price_id VARCHAR(255),
    
    tier VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at TIMESTAMP,
    canceled_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

-- Usage tracking (for rate limiting)
CREATE TABLE usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    action VARCHAR(100) NOT NULL, -- 'explanation', 'chat_message'
    resource_id UUID,
    
    -- Cost tracking
    tokens_used INT,
    cost_usd DECIMAL(10, 6),
    
    -- Request metadata
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_usage_user_date ON usage_logs(user_id, created_at);
CREATE INDEX idx_usage_created ON usage_logs(created_at);

-- API Keys (for developer tier)
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
```

---

# 🔐 **SECURITY IMPLEMENTATION**

## **1. Authentication & Authorization**

```typescript
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
```

## **2. Rate Limiting**

```typescript
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
```

## **3. Input Validation & Sanitization**

```typescript
// src/utils/validation.ts
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Schemas
export const createExplanationSchema = z.object({
  imageUrl: z.string().url().max(2048),
  prompt: z.string().max(500).optional(),
  isDeveloperMode: z.boolean().default(false),
  language: z.enum(['en', 'es', 'fr', 'de', 'zh', 'hi']).default('en'),
});

export const chatMessageSchema = z.object({
  explanationId: z.string().uuid(),
  message: z.string().min(1).max(1000),
});

// Sanitization
export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .substring(0, 255);
}
```

## **4. Image Upload Security**

```typescript
// src/services/storage/StorageService.ts
import sharp from 'sharp';
import { createHash } from 'crypto';
import { supabase } from '@/lib/supabase/client';

export class StorageService {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  
  async uploadImage(
    file: Buffer,
    userId: string,
    mimeType: string
  ): Promise<{ url: string; thumbnail: string; hash: string }> {
    // Validate file type
    if (!this.ALLOWED_TYPES.includes(mimeType)) {
      throw new Error('Invalid file type');
    }

    // Validate file size
    if (file.length > this.MAX_FILE_SIZE) {
      throw new Error('File too large');
    }

    // Strip EXIF data and validate image
    const processedImage = await sharp(file)
      .rotate() // Auto-rotate based on EXIF
      .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Generate thumbnail
    const thumbnail = await sharp(processedImage)
      .resize(400, 400, { fit: 'cover' })
      .jpeg({ quality: 70 })
      .toBuffer();

    // Generate content hash for deduplication
    const hash = createHash('sha256').update(processedImage).digest('hex');

    // Check if image already exists
    const existing = await this.findByHash(hash, userId);
    if (existing) {
      return existing;
    }

    // Upload to storage
    const filename = `${userId}/${Date.now()}-${hash.substring(0, 8)}.jpg`;
    const thumbnailFilename = `${userId}/thumbnails/${Date.now()}-${hash.substring(0, 8)}.jpg`;

    const [{ data: imageData }, { data: thumbData }] = await Promise.all([
      supabase.storage.from('images').upload(filename, processedImage, {
        contentType: 'image/jpeg',
        cacheControl: '31536000', // 1 year
      }),
      supabase.storage.from('images').upload(thumbnailFilename, thumbnail, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
      }),
    ]);

    if (!imageData || !thumbData) {
      throw new Error('Upload failed');
    }

    const { data: { publicUrl: imageUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filename);
      
    const { data: { publicUrl: thumbnailUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(thumbnailFilename);

    return {
      url: imageUrl,
      thumbnail: thumbnailUrl,
      hash,
    };
  }

  private async findByHash(hash: string, userId: string) {
    const existing = await prisma.explanation.findFirst({
      where: { image_hash: hash, user_id: userId },
      select: { image_url: true, image_thumbnail_url: true, image_hash: true },
    });
    
    if (existing) {
      return {
        url: existing.image_url,
        thumbnail: existing.image_thumbnail_url!,
        hash: existing.image_hash!,
      };
    }
    
    return null;
  }
}
```

---

# ⚡ **PERFORMANCE OPTIMIZATION**

## **1. Image Compression (Mobile)**

```typescript
// src/services/image/CompressionService.ts
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export class CompressionService {
  async compressForUpload(uri: string): Promise<string> {
    const result = await manipulateAsync(
      uri,
      [
        { resize: { width: 1920 } }, // Max width 1920px
      ],
      {
        compress: 0.8,
        format: SaveFormat.JPEG,
      }
    );
    
    return result.uri;
  }

  async createThumbnail(uri: string): Promise<string> {
    const result = await manipulateAsync(
      uri,
      [
        { resize: { width: 400, height: 400 } },
      ],
      {
        compress: 0.7,
        format: SaveFormat.JPEG,
      }
    );
    
    return result.uri;
  }
}
```

## **2. Caching Strategy**

```typescript
// src/lib/cache/query-client.ts
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  throttleTime: 1000,
});
```

## **3. Lazy Loading & Code Splitting**

```typescript
// app/(tabs)/index.tsx
import { lazy, Suspense } from 'react';
import { LoadingSkeleton } from '@/components/ui/Skeleton';

// Lazy load heavy components
const CameraView = lazy(() => import('@/components/camera/CameraView'));
const ExplanationCard = lazy(() => import('@/components/explanation/ExplanationCard'));

export default function HomeScreen() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <CameraView />
    </Suspense>
  );
}
```

---

# 🎨 **UI/UX DESIGN SYSTEM**

## **Design Tokens**

```typescript
// src/styles/theme.ts
export const theme = {
  colors: {
    primary: {
      50: '#EEF2FF',
      100: '#E0E7FF',
      200: '#C7D2FE',
      300: '#A5B4FC',
      400: '#818CF8',
      500: '#6366F1', // Main brand color
      600: '#4F46E5',
      700: '#4338CA',
      800: '#3730A3',
      900: '#312E81',
    },
    neutral: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#E5E5E5',
      300: '#D4D4D4',
      400: '#A3A3A3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
      950: '#0A0A0A',
    },
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },
  
  typography: {
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
    },
    fontWeight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
    full: 9999,
  },
  
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
  },
  
  animations: {
    duration: {
      fast: 150,
      normal: 250,
      slow: 350,
    },
    easing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
      spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },
};
```

## **Animated Components**

```typescript
// src/components/camera/CaptureButton.tsx
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { theme } from '@/styles/theme';

export function CaptureButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePress = () => {
    // Capture animation
    scale.value = withSequence(
      withSpring(0.85, { damping: 10 }),
      withSpring(1, { damping: 10 })
    );
    
    opacity.value = withSequence(
      withSpring(0.6),
      withSpring(1)
    );
    
    onPress();
  };

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[styles.button, animatedStyle]}>
        <View style={styles.inner} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  inner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary[500],
  },
});
```

```typescript
// src/components/explanation/LoadingAnimation.tsx
import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';

export function LoadingAnimation() {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const config = {
      duration: 600,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    };

    dot1.value = withRepeat(
      withSequence(
        withTiming(1, config),
        withTiming(0, config)
      ),
      -1
    );

    setTimeout(() => {
      dot2.value = withRepeat(
        withSequence(
          withTiming(1, config),
          withTiming(0, config)
        ),
        -1
      );
    }, 200);

    setTimeout(() => {
      dot3.value = withRepeat(
        withSequence(
          withTiming(1, config),
          withTiming(0, config)
        ),
        -1
      );
    }, 400);
  }, []);

  const dot1Style = useAnimatedStyle(() => ({
    opacity: 0.3 + dot1.value * 0.7,
    transform: [{ scale: 0.8 + dot1.value * 0.4 }],
  }));

  const dot2Style = useAnimatedStyle(() => ({
    opacity: 0.3 + dot2.value * 0.7,
    transform: [{ scale: 0.8 + dot2.value * 0.4 }],
  }));

  const dot3Style = useAnimatedStyle(() => ({
    opacity: 0.3 + dot3.value * 0.7,
    transform: [{ scale: 0.8 + dot3.value * 0.4 }],
  }));

  return (
    <View style={styles.container}>
      <LottieView
        source={require('@/assets/animations/thinking.json')}
        autoPlay
        loop
        style={styles.lottie}
      />
      
      <View style={styles.dots}>
        <Animated.View style={[styles.dot, dot1Style]} />
        <Animated.View style={[styles.dot, dot2Style]} />
        <Animated.View style={[styles.dot, dot3Style]} />
      </View>
      
      <Text style={styles.text}>Analyzing...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  lottie: {
    width: 120,
    height: 120,
  },
  dots: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary[500],
  },
  text: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.neutral[600],
  },
});
```

---

# 🚀 **API DESIGN**

## **RESTful Endpoints**

```typescript
// app/api/v1/explanations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ExplanationService } from '@/services/explanation/ExplanationService';
import { StorageService } from '@/services/storage/StorageService';
import { validateRequest } from '@/utils/validation';
import { logger } from '@/utils/logger';

const createSchema = z.object({
  image: z.string().startsWith('data:image'),
  prompt: z.string().max(500).optional(),
  isDeveloperMode: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const user = (req as any).user;
    
    // Parse and validate request
    const body = await req.json();
    const data = createSchema.parse(body);
    
    // Extract image from data URL
    const matches = data.image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json(
        { error: 'Invalid image format' },
        { status: 400 }
      );
    }
    
    const [, mimeType, base64Data] = matches;
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Upload image
    const storageService = new StorageService();
    const { url, thumbnail, hash } = await storageService.uploadImage(
      imageBuffer,
      user.id,
      `image/${mimeType}`
    );
    
    // Generate explanation
    const explanationService = new ExplanationService();
    const result = await explanationService.create({
      userId: user.id,
      imageUrl: url,
      thumbnailUrl: thumbnail,
      imageHash: hash,
      prompt: data.prompt,
      isDeveloperMode: data.isDeveloperMode,
    });
    
    // Log analytics
    logger.info('Explanation created', {
      userId: user.id,
      explanationId: result.id,
      processingTime: result.processingTimeMs,
    });
    
    return NextResponse.json(result, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    logger.error('Failed to create explanation', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = (req as any).user;
    const { searchParams } = new URL(req.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    
    const explanationService = new ExplanationService();
    const results = await explanationService.list({
      userId: user.id,
      page,
      limit,
      category,
      search,
    });
    
    return NextResponse.json(results);
    
  } catch (error) {
    logger.error('Failed to list explanations', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

# 📊 **MONITORING & ANALYTICS**

```typescript
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
```

```typescript
// src/lib/monitoring/analytics.ts
import PostHog from 'posthog-react-native';

export const posthog = new PostHog(
  process.env.EXPO_PUBLIC_POSTHOG_KEY!,
  {
    host: 'https://app.posthog.com',
  }
);

// Track events
export const analytics = {
  track(event: string, properties?: Record<string, any>) {
    posthog.capture(event, properties);
  },
  
  identify(userId: string, traits?: Record<string, any>) {
    posthog.identify(userId, traits);
  },
  
  screen(name: string, properties?: Record<string, any>) {
    posthog.screen(name, properties);
  },
  
  // Common events
  explanationCreated(explanationId: string, category?: string) {
    this.track('explanation_created', {
      explanation_id: explanationId,
      category,
    });
  },
  
  subscriptionStarted(tier: string) {
    this.track('subscription_started', { tier });
  },
};
```

---

This is just **Part 1** of the complete system design.

Would you like me to continue with:
1. **Part 2: Complete service implementations** (OpenAI, Image processing, etc.)
2. **Part 3: React Native components with full code**
3. **Part 4: Deployment, CI/CD, and infrastructure**
4. **Part 5: Testing strategy and implementation**

Or do you want me to deep-dive into a specific section first?
