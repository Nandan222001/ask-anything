// src/store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';

interface User {
    id: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
    subscriptionTier: 'free' | 'pro' | 'developer';
    subscriptionStatus: string;
    dailyUsageCount: number;
    totalExplanations: number;
}

interface AuthState {
    user: User | null;
    session: any | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    // Actions
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, fullName: string) => Promise<void>;
    signOut: () => Promise<void>;
    setUser: (user: User | null) => void;
    setSession: (session: any) => void;
    refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,

            signIn: async (email, password) => {
                set({ isLoading: true });
                try {
                    const { data, error } = await supabase.auth.signInWithPassword({
                        email,
                        password,
                    });

                    if (error) throw error;

                    set({
                        session: data.session,
                        user: data.user as any,
                        isAuthenticated: true,
                    });

                    logger.info('User signed in', { userId: data.user.id });

                } catch (error) {
                    logger.error('Sign in failed', error);
                    throw error;
                } finally {
                    set({ isLoading: false });
                }
            },

            signUp: async (email, password, fullName) => {
                set({ isLoading: true });
                try {
                    const { data, error } = await supabase.auth.signUp({
                        email,
                        password,
                        options: {
                            data: {
                                full_name: fullName,
                            },
                        },
                    });

                    if (error) throw error;

                    logger.info('User signed up', { userId: data.user?.id });

                } catch (error) {
                    logger.error('Sign up failed', error);
                    throw error;
                } finally {
                    set({ isLoading: false });
                }
            },

            signOut: async () => {
                try {
                    await supabase.auth.signOut();
                    set({
                        user: null,
                        session: null,
                        isAuthenticated: false,
                    });
                    logger.info('User signed out');
                } catch (error) {
                    logger.error('Sign out failed', error);
                    throw error;
                }
            },

            setUser: (user) => {
                set({ user, isAuthenticated: !!user });
            },

            setSession: (session) => {
                set({ session, isAuthenticated: !!session });
            },

            refreshUser: async () => {
                const { session } = get();
                if (!session) return;

                try {
                    const { data: user } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (user) {
                        set({ user: user as any });
                    }
                } catch (error) {
                    logger.error('Failed to refresh user', error);
                }
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                user: state.user,
                session: state.session,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);