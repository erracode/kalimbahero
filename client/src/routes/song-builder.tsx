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
    const { addSong, updateSong, deleteSong, markAsSynced, markAsUnsynced, songs } = useSongStore();

    const handleSave = useCallback(async (song: Song, options?: { cloud?: boolean; publish?: boolean }) => {
        // 1. Prepare base song
        const localSong = {
            ...song,
            isCloud: options?.cloud || false,
            isPublic: options?.publish || false
        };

        let finalSong = localSong;

        // 2. Local-only or Cloud Sync
        if (isAuthenticated && options?.cloud) {
            try {
                const result = await syncSong(localSong);
                if (result.success && result.data?.id) {
                    // Successfully synced to cloud!
                    // REMOVE from local storage as requested
                    deleteSong(localSong.id);

                    const cloudId = result.data.id;
                    const isPublic = result.data.isPublic;
                    finalSong = { ...localSong, cloudId, isCloud: true, isPublic };
                } else {
                    // Fallback to local if sync failed
                    updateOrAddLocal(localSong);
                }
            } catch (err) {
                console.error("Cloud sync failed, saving locally", err);
                updateOrAddLocal(localSong);
            }
        } else {
            // Unsync or keep local
            if (isAuthenticated && !options?.cloud && localSong.cloudId) {
                try {
                    await deleteCloudSong(localSong.cloudId);
                } catch (err) {
                    console.error("Cloud removal failed", err);
                }
            }
            const updated = { ...localSong, isCloud: false, cloudId: undefined };
            updateOrAddLocal(updated);
            finalSong = updated;
        }

        function updateOrAddLocal(s: Song) {
            const isNew = !songs.find(item => item.id === s.id);
            if (isNew) {
                addSong(s);
            } else {
                updateSong(s.id, s);
            }
        }

        // 3. Update builder store current state with final version
        setEditingSong(finalSong);

        // 4. Navigate back to library
        navigate({ to: '/library', search: { view: 'my-tabs' } });
    }, [addSong, updateSong, deleteSong, markAsSynced, markAsUnsynced, songs, setEditingSong, navigate, isAuthenticated, syncSong, deleteCloudSong]);

    const handleBack = useCallback(() => {
        navigate({ to: '/library', search: { view: 'my-tabs' } });
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
