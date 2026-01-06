// ============================================
// Kalimba Hero - Game Route
// ============================================

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { KalimbaScene } from "@/components/game/KalimbaScene";
import { TabViewer } from "@/components/game/TabViewer";
import { ScoreBoard } from "@/components/ui/ScoreBoard";
import { ResultsScreen } from "@/components/ui/ResultsScreen";
import { NeonButton } from "@/components/ui/NeonButton";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { useAudioDetection } from "@/hooks/useAudioDetection";
import { useGameLoop } from "@/hooks/useGameLoop";
import { useGameStore } from "@/stores/gameStore";
import { useSongStore } from "@/stores/songStore";
import type { Song } from "@/types/game";
import { Pause, Play, RotateCcw, Home, Mic, MicOff } from "lucide-react";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const searchSchema = z.object({
  mode: z.enum(["3d", "tab"]).optional().default("3d"),
});

export const Route = createFileRoute("/game/$songId")({
  validateSearch: zodValidator(searchSchema),
  component: GameRoute,
  loader: async ({ params }) => {
    return { songId: params.songId };
  },
  head: () => ({
    title: `Playing Song | Kalimba Hero`,
  }),
});

function GameRoute() {
  const { songId } = Route.useLoaderData();
  const { mode: gameMode } = Route.useSearch();
  const navigate = useNavigate();

  const { songs: storedSongs } = useSongStore();
  const [song, setSong] = useState<Song | null>(null);

  const {
    gameState,
    currentSong,
    score,
    settings,
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
  } = useGameStore();

  useEffect(() => {
    const found = storedSongs.find(s => s.id === songId);
    if (found) {
      setSong(found);
    } else {
      fetch(`http://localhost:3000/api/songs/${songId}`)
        .then(res => res.json())
        .then(json => {
          if (json.success) {
            setSong({
              ...json.data.songData,
              id: json.data.id,
              artist: json.data.artist || json.data.songData.artist
            });
          }
        })
        .catch(console.error);
    }
  }, [songId, storedSongs]);

  useEffect(() => {
    if (song && gameState === 'idle' && gameMode === '3d') {
      startGame(song);
    }
  }, [song, gameState, startGame, gameMode]);

  const {
    isListening,
    isSupported,
    currentPitch,
    error: audioError,
  } = useAudioDetection({
    enabled: gameState === "playing",
    pitchTolerance: settings.pitchTolerance,
  });

  const { visibleNotes, progress } = useGameLoop(currentPitch);

  const handleRestart = () => {
    if (song) {
      resetGame();
      setTimeout(() => startGame(song), 100);
    }
  };

  const handleBackToLibrary = () => {
    resetGame();
    navigate({ to: "/library" });
  };

  const CountdownOverlay = () => {
    const [count, setCount] = useState(3);
    useEffect(() => {
      let c = 3;
      const timer = setInterval(() => {
        c--;
        if (c < 0) {
          clearInterval(timer);
        } else {
          setCount(c);
        }
      }, 1000);
      return () => clearInterval(timer);
    }, []);

    return (
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div key={count} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.5, opacity: 0 }} className="text-9xl font-black text-white" style={{ textShadow: "0 0 60px #00E5FF" }}>
          {count > 0 ? count : "GO!"}
        </motion.div>
      </motion.div>
    );
  };

  const PauseOverlay = () => (
    <motion.div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <GlassPanel padding="lg" className="text-center">
        <h2 className="text-4xl font-black text-white mb-6">PAUSED</h2>
        <div className="flex flex-col gap-3">
          <NeonButton variant="cyan" icon={<Play className="w-5 h-5" />} onClick={resumeGame} fullWidth>Resume</NeonButton>
          <NeonButton variant="orange" icon={<RotateCcw className="w-5 h-5" />} onClick={handleRestart} fullWidth>Restart</NeonButton>
          <NeonButton variant="purple" icon={<Home className="w-5 h-5" />} onClick={handleBackToLibrary} fullWidth>Quit</NeonButton>
        </div>
      </GlassPanel>
    </motion.div>
  );

  if (gameMode === 'tab' && song) {
    return <TabViewer song={song} onBack={handleBackToLibrary} />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0" style={{ zIndex: 0, pointerEvents: "none" }}>
        <AuroraBackground speed={0.5} intensity={0.8} vibrancy={0.9} frequency={1.0} stretch={1.2} />
      </div>

      <div className="canvas-container">
        <KalimbaScene notes={visibleNotes} progress={progress} currentPitch={currentPitch} isPlaying={gameState === "playing"} />
      </div>

      <div className="fixed inset-0 z-[100] pointer-events-none">
        <div className="absolute top-4 left-4 pointer-events-auto">
          <ScoreBoard score={score} isVisible={gameState === "playing"} />
        </div>

        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
          <GlassPanel padding="sm" className="text-center">
            <div className="text-white font-bold">{song?.title}</div>
            <div className="text-white/50 text-sm">{song?.artist}</div>
          </GlassPanel>
        </div>

        <div className="absolute top-4 right-4 flex gap-2 pointer-events-auto">
          <GlassPanel padding="sm" className="flex items-center gap-2">
            {isListening ? <Mic className="w-4 h-4 text-green-400" /> : <MicOff className="w-4 h-4 text-red-400" />}
            <span className="text-xs text-white/60">{isListening ? "Listening" : audioError || "Mic off"}</span>
          </GlassPanel>
          <NeonButton variant="orange" size="sm" icon={<Pause className="w-4 h-4" />} onClick={pauseGame}>Pause</NeonButton>
        </div>

        {currentSong && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500" style={{ width: `${Math.max(0, (progress / currentSong.duration) * 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {gameState === "countdown" && <CountdownOverlay key="countdown" />}
        {gameState === "paused" && <PauseOverlay key="paused" />}
        {gameState === "finished" && song && (
          <ResultsScreen key="results" score={score} song={song} onRestart={handleRestart} onBackToLibrary={handleBackToLibrary} />
        )}
      </AnimatePresence>
    </div>
  );
}
