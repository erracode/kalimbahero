import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { SongBuilder } from '@/components/ui/SongBuilder';
import { useBuilderStore } from '@/stores/builderStore';
import { useGameStore } from '@/stores/gameStore';
import { useLocalStorage, STORAGE_KEYS } from '@/hooks/useLocalStorage';
import { EXAMPLE_SONGS } from '@/utils/songParser';
import type { Song } from '@/types/game';
import { useCallback } from 'react';

export const Route = createFileRoute('/song-builder')({
    component: SongBuilderRoute,
});

function SongBuilderRoute() {
    const navigate = useNavigate();
    const { editingSong, setEditingSong } = useBuilderStore();
    const { startGame } = useGameStore();

    // We need to access the main song storage to save changes
    // Ideally this should be a unified store, but for now we reuse the hook logic
    // replicated from index.tsx or moved to a store. 
    // Since useLocalStorage is a hook, we can use it here to read/write to the same key.
    const [storedSongs, setStoredSongs] = useLocalStorage<Song[]>(STORAGE_KEYS.SONGS, []);

    const handleSave = useCallback((song: Song) => {
        // 1. Update local storage (User Library)
        setStoredSongs((prevMap) => {
            // Logic copied from index.tsx mainly
            const prev = prevMap || [];
            const existingIndex = prev.findIndex((s) => s.id === song.id);

            let newSongs;
            if (existingIndex >= 0) {
                newSongs = [...prev];
                newSongs[existingIndex] = song;
            } else {
                newSongs = [...prev, song];
            }
            return newSongs;
        });

        // 2. Update builder store current state
        setEditingSong(song);

        // 3. Navigate back to library
        navigate({ to: '/' });
    }, [setStoredSongs, setEditingSong, navigate]);

    const handleBack = useCallback(() => {
        // Optional: Ask for confirmation if unsaved changes?
        navigate({ to: '/' });
    }, [navigate]);

    const handleTestPlay = useCallback((song: Song) => {
        // To test play, we can start the game with this song
        // But we need to be on the game route/screen.
        // Current "Game" is on index route with screen="game".
        // We might need to handle this differently with the new routing.
        // For now, let's verify if we can navigate to index and trigger play.

        // We update the editing song so it persists
        setEditingSong(song);

        // We could pass state to navigate, or just update gameStore
        startGame(song);
        navigate({ to: '/' });
    }, [navigate, setEditingSong, startGame]);


    // Update store immediately (Zustand is fast enough, persist middleware handles storage IO)
    const handleChange = useCallback((partialSong: Partial<Song>) => {
        setEditingSong((prev) => {
            if (!prev) return null;
            return { ...prev, ...partialSong } as Song;
        });
    }, [setEditingSong]);

    return (
        <SongBuilder
            initialSong={editingSong || undefined}
            onBack={handleBack}
            onSave={handleSave}
            onTestPlay={handleTestPlay}
            onChange={handleChange}
        />
    );
}
