import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { SongBuilder } from '@/components/ui/SongBuilder';
import { useBuilderStore } from '@/stores/builderStore';
import { useSongStore } from '@/stores/songStore';
import { useGameStore } from '@/stores/gameStore';
import type { Song } from '@/types/game';
import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthSync } from '@/hooks/useAuthSync';

export const Route = createFileRoute('/song-builder')({
    component: SongBuilderRoute,
});

function SongBuilderRoute() {
    const navigate = useNavigate();
    const { editingSong, setEditingSong } = useBuilderStore();
    const { startGame } = useGameStore();

    const { isAuthenticated } = useAuth();
    const { syncSong, deleteCloudSong } = useAuthSync();
    const { addSong, updateSong, markAsSynced, markAsUnsynced, songs } = useSongStore();

    const handleSave = useCallback(async (song: Song, options?: { cloud?: boolean; publish?: boolean }) => {
        // 1. Prepare song with intent flags for local storage
        const localSong = {
            ...song,
            isCloud: options?.cloud || false,
            isPublic: options?.publish || false
        };

        // 2. Update store (local library)
        const isNew = !songs.find(s => s.id === localSong.id);
        if (isNew) {
            addSong(localSong);
        } else {
            updateSong(localSong.id, localSong);
        }

        let finalSong = localSong;

        // 3. Optional: Cloud Sync or Unsync
        if (isAuthenticated) {
            if (options?.cloud) {
                try {
                    const result = await syncSong(localSong);
                    if (result.success && result.data?.id) {
                        // Update the local song with server metadata
                        const cloudId = result.data.id;
                        const isPublic = result.data.isPublic;
                        markAsSynced(localSong.id, cloudId, isPublic);

                        // Incorporate cloud metadata into the song we'll store in builderState
                        finalSong = { ...localSong, cloudId, isCloud: true, isPublic };
                    }
                } catch (err) {
                    console.error("Cloud sync failed", err);
                }
            } else if (localSong.cloudId) {
                try {
                    await deleteCloudSong(localSong.cloudId);
                    markAsUnsynced(localSong.id);
                    finalSong = { ...localSong, cloudId: undefined, isCloud: false, isPublic: false };
                } catch (err) {
                    console.error("Cloud removal failed", err);
                }
            }
        }

        // 3. Update builder store current state with final version (including cloudId if synced)
        setEditingSong(finalSong);

        // 4. Navigate back to library
        navigate({ to: '/library' });
    }, [addSong, updateSong, markAsSynced, markAsUnsynced, songs, setEditingSong, navigate, isAuthenticated, syncSong, deleteCloudSong]);

    const handleBack = useCallback(() => {
        navigate({ to: '/library' });
    }, [navigate]);

    const handleTestPlay = useCallback((song: Song) => {
        setEditingSong(song);
        startGame(song);
        navigate({ to: '/game/$songId', params: { songId: song.id } });
    }, [navigate, setEditingSong, startGame]);


    // Update store immediately
    const handleChange = useCallback((partialSong: Partial<Song>) => {
        setEditingSong((prev: Song | null) => {
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
            isAuthenticated={isAuthenticated}
        />
    );
}
