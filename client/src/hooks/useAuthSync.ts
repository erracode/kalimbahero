import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useSongStore } from '@/stores/songStore';
import type { Song } from '@/types/game';

export function useAuthSync() {
    const { isAuthenticated } = useAuth();
    const { songs: storedSongs, markAsSynced } = useSongStore();
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncError, setLastSyncError] = useState<string | null>(null);

    const syncAllLocal = useCallback(async () => {
        if (!isAuthenticated || isSyncing) return;

        setIsSyncing(true);
        setLastSyncError(null);

        try {
            const response = await fetch('http://localhost:3000/api/songs/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ songs: storedSongs }),
                credentials: 'include',
            });

            const result = await response.json();

            if (result.success && result.data) {
                // Update local songs with server metadata via store
                result.data.forEach((serverSong: any) => {
                    const localId = serverSong.songData.id;
                    if (localId) {
                        markAsSynced(localId, serverSong.id, serverSong.isPublic);
                    }
                });
                console.log(`Successfully synced ${result.syncedCount} songs`);
            } else {
                setLastSyncError(result.error || 'Failed to sync');
            }
        } catch (err) {
            setLastSyncError('Network error during sync');
        } finally {
            setIsSyncing(false);
        }
    }, [isAuthenticated, isSyncing, storedSongs, markAsSynced]);

    const syncSong = useCallback(async (song: Song) => {
        if (!isAuthenticated) return;

        try {
            const method = song.cloudId ? 'PUT' : 'POST';
            const url = song.cloudId
                ? `http://localhost:3000/api/songs/${song.cloudId}`
                : 'http://localhost:3000/api/songs';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: song.title,
                    artist: song.artist,
                    songData: song,
                    difficulty: song.difficulty,
                    isPublic: song.isPublic || false
                }),
                credentials: 'include',
            });
            return await response.json();
        } catch (err) {
            console.error("Failed to sync individual song", err);
            return { success: false };
        }
    }, [isAuthenticated]);

    const deleteCloudSong = useCallback(async (songId: string) => {
        if (!isAuthenticated) return;

        try {
            const response = await fetch(`http://localhost:3000/api/songs/${songId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            return await response.json();
        } catch (err) {
            console.error("Failed to delete cloud song", err);
            return { success: false };
        }
    }, [isAuthenticated]);

    return {
        syncAllLocal,
        syncSong,
        deleteCloudSong,
        isSyncing,
        lastSyncError,
        isAuthenticated
    };
}
