// src/store/cameraStore.ts
import { create } from 'zustand';
import { CameraType, FlashMode } from 'expo-camera';

interface CameraState {
    facing: CameraType;
    flashMode: FlashMode;
    zoom: number;

    // Actions
    toggleFacing: () => void;
    setFlashMode: (mode: FlashMode) => void;
    setZoom: (zoom: number) => void;
    reset: () => void;
}

export const useCameraStore = create<CameraState>((set) => ({
    facing: 'back',
    flashMode: 'off',
    zoom: 0,

    toggleFacing: () =>
        set((state) => ({
            facing: state.facing === 'back' ? 'front' : 'back',
        })),

    setFlashMode: (mode) => set({ flashMode: mode }),

    setZoom: (zoom) => set({ zoom: Math.max(0, Math.min(1, zoom)) }),

    reset: () =>
        set({
            facing: 'back',
            flashMode: 'off',
            zoom: 0,
        }),
}));