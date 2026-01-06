import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Song } from '@/types/game';

interface BuilderStoreState {
    editingSong: Song | null;
    setEditingSong: (song: Song | null | ((prev: Song | null) => Song | null)) => void;
    clearEditingSong: () => void;
}

export const useBuilderStore = create<BuilderStoreState>()(
    persist(
        (set) => ({
            editingSong: null,
            setEditingSong: (song) => set((state) => ({
                editingSong: typeof song === 'function' ? song(state.editingSong) : song
            })),
            clearEditingSong: () => set({ editingSong: null }),
        }),
        {
            name: 'kalimba-hero-builder', // unique name for localStorage
        }
    )
);
