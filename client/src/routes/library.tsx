// ============================================
// Kalimba Hero - Song Library Route
// ============================================

import { useNavigate, createFileRoute } from "@tanstack/react-router";
import { SongLibrary } from "@/components/ui/SongLibrary";
import { useSongStore } from "@/stores/songStore";
import { useLocalStorage, STORAGE_KEYS } from "@/hooks/useLocalStorage";
import { useAuthSync } from "@/hooks/useAuthSync";
import { useBuilderStore } from "@/stores/builderStore";
import type { Song } from "@/types/game";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";

const searchSchema = z.object({
  view: z.enum(["all", "bookmarks", "my-tabs"]).optional().default("all"),
});

export const Route = createFileRoute("/library")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    title: "Song Library | Kalimba Hero",
    meta: [
      {
        name: "description",
        content: "Discover and play community songs or manage your own Kalimba creations.",
      },
    ],
  }),
  component: SongLibraryRoute,
});

function SongLibraryRoute() {
  const navigate = useNavigate();
  const { view } = Route.useSearch();
  const { setEditingSong } = useBuilderStore();

  const { songs: storedSongs, deleteSong } = useSongStore();

  // Persist game mode
  const [gameMode, setGameMode] = useLocalStorage<"3d" | "tab">(STORAGE_KEYS.GAME_MODE, "3d");

  const { deleteCloudSong, isAuthenticated } = useAuthSync();

  const handleSelectSong = (song: Song) => {
    if (gameMode === "tab") {
      navigate({ to: "/game/$songId", params: { songId: song.id }, search: { mode: "tab" } });
    } else {
      navigate({ to: "/game/$songId", params: { songId: song.id } });
    }
  };

  const handleDeleteSong = async (songId: string) => {
    // 1. Find the song to check if it's on cloud
    const songToDelete = storedSongs.find(s => s.id === songId);

    // 2. Delete from cloud if applicable
    if (songToDelete?.cloudId && isAuthenticated) {
      try {
        await deleteCloudSong(songToDelete.cloudId);
      } catch (err) {
        console.error("Failed to delete from cloud", err);
      }
    }

    // 3. Delete from store
    deleteSong(songId);
  };

  const handleEditSong = (song: Song) => {
    setEditingSong(song);
    navigate({ to: "/song-builder" });
  };

  const handleCreateNew = () => {
    setEditingSong(null);
    navigate({ to: "/song-builder" });
  };

  return (
    <div className="relative min-h-screen bg-[#050510]">
      <SongLibrary
        onSelectSong={handleSelectSong}
        onEditSong={handleEditSong}
        onDeleteSong={handleDeleteSong}
        onCreateNew={handleCreateNew}
        onBack={() => navigate({ to: "/" })}
        gameMode={gameMode}
        onGameModeChange={setGameMode}
        initialView={view}
      />
    </div>
  );
}
