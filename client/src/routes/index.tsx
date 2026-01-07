// ============================================
// Kalimba Hero - Home Route
// ============================================

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HomeScreen } from "@/components/ui/HomeScreen";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { KalimbaScene } from "@/components/game/KalimbaScene";
import { useBuilderStore } from "@/stores/builderStore";

export const Route = createFileRoute("/")({
  component: HomeRoute,
  head: () => ({
    title: "Kalimba Hero | The Ultimate Rhythm Game for Kalimba",
    meta: [
      {
        name: "description",
        content: "Master the kalimba with interactive 3D tabs, community songs, and cloud sync.",
      },
    ],
  }),
});

function HomeRoute() {
  const navigate = useNavigate();
  const { setEditingSong } = useBuilderStore();

  const handleStartGame = () => {
    navigate({ to: "/library" });
  };

  const handleCreateNew = () => {
    setEditingSong(null);
    navigate({ to: "/song-builder" });
  };



  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background & 3D Decorations */}
      <div className="fixed inset-0" style={{ zIndex: 0, pointerEvents: "none" }}>
        <AuroraBackground speed={0.5} intensity={0.8} vibrancy={0.9} frequency={1.0} stretch={1.2} />
      </div>

      <div className="canvas-container">
        <KalimbaScene
          notes={[]}
          progress={0}
          currentPitch={null}
          isPlaying={false}
        />
      </div>

      <HomeScreen
        onStartGame={handleStartGame}
        onSongBuilder={handleCreateNew}
        onLibrary={() => navigate({ to: "/library" })}
        onTuner={() => navigate({ to: "/tuner" })}
      />
    </div>
  );
}
