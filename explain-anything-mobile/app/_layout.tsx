// app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/store/authStore';
import { initSentry } from '@/lib/monitoring/sentry';
import { analytics } from '@/lib/monitoring/analytics';

// Initialize services
initSentry();

// Create query client
const queryClient = new QueryClient();

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        'Inter-Regular': require('@/assets/fonts/Inter-Regular.ttf'),
        'Inter-Medium': require('@/assets/fonts/Inter-Medium.ttf'),
        'Inter-SemiBold': require('@/assets/fonts/Inter-SemiBold.ttf'),
        'Inter-Bold': require('@/assets/fonts/Inter-Bold.ttf'),
    });

    const { isAuthenticated, user } = useAuthStore();

    useEffect(() => {
        if (fontsLoaded) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded]);

    useEffect(() => {
        // Identify user in analytics
        if (user) {
            analytics.identify({
                userId: user.id,
                traits: {
                    email: user.email,
                    subscriptionTier: user.subscriptionTier,
                },
            });
        }
    }, [user]);

    if (!fontsLoaded) {
        return null;
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <QueryClientProvider client={queryClient}>
                    <StatusBar style="auto" />
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="onboarding" />
                        <Stack.Screen name="(auth)" />
                        <Stack.Screen
                            name="explain/[id]"
                            options={{
                                presentation: 'card',
                                headerShown: true,
                                title: 'Explanation',
                            }}
                        />
                        <Stack.Screen
                            name="paywall"
                            options={{
                                presentation: 'modal',
                                headerShown: true,
                                title: 'Upgrade',
                            }}
                        />
                    </Stack>
                </QueryClientProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}