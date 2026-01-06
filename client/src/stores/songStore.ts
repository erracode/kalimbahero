import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Song } from '@/types/game';

interface SongStoreState {
    songs: Song[];
    addSong: (song: Song) => void;
    updateSong: (id: string, updates: Partial<Song>) => void;
    deleteSong: (id: string) => void;
    setSongs: (songs: Song[]) => void;

    // Cloud sync helpers
    markAsSynced: (localId: string, cloudId: string, isPublic?: boolean) => void;
    markAsUnsynced: (localId: string) => void;
}

export const useSongStore = create<SongStoreState>()(
    persist(
        (set) => ({
            songs: [],

            setSongs: (songs) => set({ songs }),

            addSong: (song) => set((state) => ({
                songs: [...state.songs, song]
            })),

            updateSong: (id, updates) => set((state) => ({
                songs: state.songs.map((s) => (s.id === id ? { ...s, ...updates } : s))
            })),

            deleteSong: (id) => set((state) => ({
                songs: state.songs.filter((s) => s.id !== id)
            })),

            markAsSynced: (localId, cloudId, isPublic) => set((state) => ({
                songs: state.songs.map((s) =>
                    s.id === localId
                        ? { ...s, cloudId, isCloud: true, isPublic: isPublic !== undefined ? isPublic : s.isPublic }
                        : s
                )
            })),

            markAsUnsynced: (localId) => set((state) => ({
                songs: state.songs.map((s) =>
                    s.id === localId
                        ? { ...s, cloudId: undefined, isCloud: false, isPublic: false }
                        : s
                )
            })),
        }),
        {
            name: 'kalimba-hero-songs-store', // Persisted in localStorage
        }
    )
);
