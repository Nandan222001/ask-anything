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