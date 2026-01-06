// ============================================
// Kalimba Hero - Main Game Route
// ============================================

import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState, useEffect, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { KalimbaScene } from "@/components/game/KalimbaScene"
import { TabViewer } from "@/components/game/TabViewer"
import { HomeScreen } from "@/components/ui/HomeScreen"
import { SongLibrary } from "@/components/ui/SongLibrary"
import { SongBuilder } from "@/components/ui/SongBuilder"
import { ScoreBoard } from "@/components/ui/ScoreBoard"
import { ResultsScreen } from "@/components/ui/ResultsScreen"
import { NeonButton } from "@/components/ui/NeonButton"
import { GlassPanel } from "@/components/ui/GlassPanel"
import { AuroraBackground } from "@/components/ui/AuroraBackground"
import { useAudioDetection } from "@/hooks/useAudioDetection"
import { useGameLoop } from "@/hooks/useGameLoop"
import { useGameStore } from "@/stores/gameStore"
import { useLocalStorage, STORAGE_KEYS } from "@/hooks/useLocalStorage"
import { EXAMPLE_SONGS, createTestSong } from "@/utils/songParser"
import type { Song } from "@/types/game"
import { Pause, Play, RotateCcw, Home, Mic, MicOff } from "lucide-react"

type GameMode = "3d" | "tab"

export const Route = createFileRoute("/")({
  component: KalimbaHero,
})

type Screen = "home" | "library" | "builder" | "game" | "tabviewer"

function KalimbaHero() {
  const [screen, setScreen] = useState<Screen>("home")
  // Persist songs in localStorage, merge with example songs
  const [storedSongs, setStoredSongs] = useLocalStorage<Song[]>(STORAGE_KEYS.SONGS, [])
  const [editingSong, setEditingSong] = useState<Song | undefined>()
  // Persist game mode in localStorage
  const [gameMode, setGameMode] = useLocalStorage<GameMode>(STORAGE_KEYS.GAME_MODE, "3d")

  // Merge stored songs with example songs (example songs are always available)
  const songs = [...EXAMPLE_SONGS, ...storedSongs.filter(s => !EXAMPLE_SONGS.find(e => e.id === s.id))]

  // Wrapper for setting songs that only persists user-created songs
  const setSongs = useCallback((newSongs: Song[] | ((prev: Song[]) => Song[])) => {
    setStoredSongs(prev => {
      const currentSongs = typeof newSongs === 'function' ? newSongs([...EXAMPLE_SONGS, ...prev]) : newSongs
      // Only store songs that aren't in EXAMPLE_SONGS
      return currentSongs.filter(s => !EXAMPLE_SONGS.find(e => e.id === s.id))
    })
  }, [setStoredSongs])

  // Game store
  const {
    gameState,
    currentSong,
    score,
    settings,
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
  } = useGameStore()

  // Audio detection
  const {
    isListening,
    isSupported,
    currentPitch,
    error: audioError,
    startListening,
    stopListening,
  } = useAudioDetection({
    enabled: gameState === "playing",
    pitchTolerance: settings.pitchTolerance,
  })

  // Game loop
  const { visibleNotes, progress } = useGameLoop(currentPitch)

  // Navigation handlers
  const handleBackToHome = useCallback(() => {
    resetGame()
    setScreen("home")
  }, [resetGame])

  // Handle keyboard shortcuts - use store directly to avoid stale closures
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Get fresh state from store
      const currentGameState = useGameStore.getState().gameState
      const key = e.key || e.code

      if ((e.code === "Space" || e.key === " ") && screen === "home") {
        e.preventDefault()
        setScreen("library")
      }
      if (e.code === "Escape" || e.key === "Escape") {
        if (currentGameState === "playing") {
          e.preventDefault()
          useGameStore.getState().pauseGame()
        } else if (currentGameState === "paused") {
          e.preventDefault()
          // When paused, escape quits to library
          useGameStore.getState().resetGame()
          setScreen("library")
        } else if (screen !== "home") {
          handleBackToHome()
        }
      }
      if (
        (e.code === "KeyP" || e.key === "p" || e.key === "P") &&
        currentGameState === "playing"
      ) {
        e.preventDefault()
        useGameStore.getState().pauseGame()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [screen, handleBackToHome])

  // Start audio when game starts
  useEffect(() => {
    if (gameState === "playing" && !isListening && isSupported) {
      startListening()
    }
    if (gameState !== "playing" && isListening) {
      stopListening()
    }
  }, [gameState, isListening, isSupported, startListening, stopListening])

  const handleStartGame = () => {
    setScreen("library")
  }

  // Track the song for tab viewer
  const [tabViewerSong, setTabViewerSong] = useState<Song | null>(null)

  const handleSelectSong = (song: Song) => {
    if (gameMode === "tab") {
      // Tab mode: open practice viewer directly
      setTabViewerSong(song)
      setScreen("tabviewer")
    } else {
      // 3D mode: start game
      setScreen("game")
      // Small delay to let scene render
      setTimeout(() => {
        startGame(song)
      }, 500)
    }
  }

  const handleDeleteSong = (songId: string) => {
    setSongs(songs.filter((s) => s.id !== songId))
  }

  const handleEditSong = (song: Song) => {
    setEditingSong(song)
    setScreen("builder")
  }

  const handleSaveSong = (song: Song) => {
    const existingIndex = songs.findIndex((s) => s.id === song.id)
    if (existingIndex >= 0) {
      const newSongs = [...songs]
      newSongs[existingIndex] = song
      setSongs(newSongs)
    } else {
      setSongs([...songs, song])
    }
    setEditingSong(undefined)
    setScreen("library")
  }

  const handleTestPlay = (song: Song) => {
    setScreen("game")
    setTimeout(() => {
      startGame(song)
    }, 500)
  }

  const handleRestart = () => {
    if (currentSong) {
      resetGame()
      setTimeout(() => {
        startGame(currentSong)
      }, 100)
    }
  }

  // Countdown overlay
  const CountdownOverlay = () => {
    const [count, setCount] = useState(3)

    useEffect(() => {
      setCount(3) // Reset count when mounted
      const timer = setInterval(() => {
        setCount((c) => {
          if (c <= 1) {
            clearInterval(timer)
            return 0
          }
          return c - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }, [])

    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          key={`countdown-${count}`}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          className="text-9xl font-black text-white"
          style={{ textShadow: "0 0 60px #00E5FF" }}
        >
          {count > 0 ? count : "GO!"}
        </motion.div>
      </motion.div>
    )
  }

  // Pause overlay
  const PauseOverlay = () => {
    return (
      <motion.div
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <GlassPanel padding="lg" className="text-center">
          <h2 className="text-4xl font-black text-white mb-6">PAUSED</h2>
          <div className="flex flex-col gap-3">
            <NeonButton
              variant="cyan"
              icon={<Play className="w-5 h-5" />}
              onClick={resumeGame}
              fullWidth
            >
              Resume
            </NeonButton>
            <NeonButton
              variant="orange"
              icon={<RotateCcw className="w-5 h-5" />}
              onClick={handleRestart}
              fullWidth
            >
              Restart
            </NeonButton>
            <NeonButton
              variant="purple"
              icon={<Home className="w-5 h-5" />}
              onClick={handleBackToHome}
              fullWidth
            >
              Quit
            </NeonButton>
          </div>
        </GlassPanel>
      </motion.div>
    )
  }

  // Game HUD - handles pause click (use store directly to avoid stale closure)
  const handlePauseClick = () => {
    useGameStore.getState().pauseGame()
  }

  // Game HUD
  const GameHUD = () => {
    if (gameState !== "playing" && gameState !== "countdown") return null

    return (
      <div className="fixed inset-0 z-[100] pointer-events-none">
        {/* Score (top left) */}
        <div className="absolute top-4 left-4 pointer-events-auto">
          <ScoreBoard score={score} isVisible={gameState === "playing"} />
        </div>

        {/* Song info (top center) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
          <GlassPanel padding="sm" className="text-center">
            <div className="text-white font-bold">{currentSong?.title}</div>
            <div className="text-white/50 text-sm">{currentSong?.artist}</div>
          </GlassPanel>
        </div>

        {/* Controls (top right) */}
        <div className="absolute top-4 right-4 flex gap-2 pointer-events-auto">
          {/* Mic status */}
          <GlassPanel padding="sm" className="flex items-center gap-2">
            {isListening ? (
              <Mic className="w-4 h-4 text-green-400" />
            ) : (
              <MicOff className="w-4 h-4 text-red-400" />
            )}
            <span className="text-xs text-white/60">
              {isListening ? "Listening" : audioError || "Mic off"}
            </span>
          </GlassPanel>

          <NeonButton
            variant="orange"
            size="sm"
            icon={<Pause className="w-4 h-4" />}
            onClick={handlePauseClick}
          >
            Pause
          </NeonButton>
        </div>

        {/* Current pitch display (bottom center) */}
        {currentPitch && (
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <div
                className="text-3xl font-black"
                style={{
                  color:
                    Math.abs(currentPitch.cents) < 10 ? "#6BCB77" : "#FFD93D",
                  textShadow: `0 0 20px currentColor`,
                }}
              >
                {currentPitch.noteName}
              </div>
              <div className="text-xs text-white/50">
                {currentPitch.cents > 0 ? "+" : ""}
                {currentPitch.cents.toFixed(0)}¢
              </div>
            </motion.div>
          </div>
        )}

        {/* Progress bar (bottom) */}
        {currentSong && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                style={{ width: `${Math.max(0, (progress / currentSong.duration) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Aurora Background (visible on home and game screens) */}
      {(screen === "game" || screen === "home") && (
        <div
          className="fixed inset-0"
          style={{ zIndex: 0, pointerEvents: "none" }}
        >
          <AuroraBackground
            speed={0.5}
            intensity={0.8}
            vibrancy={0.9}
            frequency={1.0}
            stretch={1.2}
          />
        </div>
      )}

      {/* 3D Scene (visible in 3D game mode, or on home screen) */}
      {(screen === "game" || screen === "home") && (
        <div className="canvas-container">
          <KalimbaScene
            notes={visibleNotes}
            progress={progress}
            currentPitch={currentPitch}
            isPlaying={gameState === "playing"}
          />
        </div>
      )}

      {/* UI Overlays */}
      <AnimatePresence mode="wait">
        {screen === "home" && (
          <HomeScreen
            key="home"
            onStartGame={handleStartGame}
            onSongBuilder={() => {
              setEditingSong(undefined)
              setScreen("builder")
            }}
            onLibrary={() => setScreen("library")}
          />
        )}

        {screen === "library" && (
          <SongLibrary
            key="library"
            songs={songs}
            onSelectSong={handleSelectSong}
            onEditSong={handleEditSong}
            onDeleteSong={handleDeleteSong}
            onCreateNew={() => {
              setEditingSong(undefined)
              setScreen("builder")
            }}
            onBack={handleBackToHome}
            gameMode={gameMode}
            onGameModeChange={setGameMode}
          />
        )}

        {screen === "builder" && (
          <SongBuilder
            key="builder"
            initialSong={editingSong}
            onBack={() => setScreen("library")}
            onTestPlay={handleTestPlay}
            onSave={handleSaveSong}
          />
        )}

        {/* Tab Viewer - Standalone Practice Mode */}
        {screen === "tabviewer" && tabViewerSong && (
          <TabViewer
            key="tabviewer"
            song={tabViewerSong}
            onBack={() => {
              setTabViewerSong(null)
              setScreen("library")
            }}
          />
        )}
      </AnimatePresence>

      {/* Game overlays (3D mode only) */}
      {screen === "game" && (
        <>
          <GameHUD />

          <AnimatePresence>
            {gameState === "countdown" && <CountdownOverlay key="countdown" />}
            {gameState === "paused" && <PauseOverlay key="paused" />}
          </AnimatePresence>

          {/* Results screen */}
          <AnimatePresence mode="wait">
            {gameState === "finished" && currentSong && (
              <ResultsScreen
                key="results"
                score={score}
                song={currentSong}
                onRestart={handleRestart}
                onBackToLibrary={() => {
                  resetGame()
                  setScreen("library")
                }}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

export default KalimbaHero
