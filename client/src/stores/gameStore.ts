// ============================================
// Kalimba Hero - Game Store (Zustand)
// ============================================

import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';
import type {
  GameState,
  GameScore,
  GameSettings,
  Song,
  SongNote,
  DetectedPitch,
  NoteHit,
  HitAccuracy,
} from '@/types/game';

interface GameStoreState {
  // Game State
  gameState: GameState;
  currentSong: Song | null;
  progress: number;
  score: GameScore;
  settings: GameSettings;

  // Audio Input
  currentPitch: DetectedPitch | null;

  // Active notes (in hit zone)
  activeNotes: SongNote[];
  hitNotes: Set<string>; // IDs of notes that have been hit

  // Actions
  startGame: (song: Song) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  resetGame: () => void;
  updateProgress: (time: number) => void;
  registerHit: (hit: NoteHit) => void;
  setCurrentPitch: (pitch: DetectedPitch | null) => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  setActiveNotes: (notes: SongNote[]) => void;
  markNoteAsHit: (noteId: string) => void;
}

const DEFAULT_SETTINGS: GameSettings = {
  noteSpeed: 5,
  hitWindow: 150, // ms
  pitchTolerance: 15, // cents
  showNotation: true,
  showLaneNumbers: true,
  audioLatency: 0,
  hardwarePresetId: '17',
  userTuning: 'C',
  labelType: 'numbers',
};

const DEFAULT_SCORE: GameScore = {
  score: 0,
  combo: 0,
  maxCombo: 0,
  perfect: 0,
  good: 0,
  okay: 0,
  miss: 0,
  accuracy: 100,
};

// Score multipliers for different hit accuracies
const SCORE_VALUES: Record<HitAccuracy, number> = {
  perfect: 100,
  good: 75,
  okay: 50,
  miss: 0,
};

// Combo multiplier thresholds
const getComboMultiplier = (combo: number): number => {
  if (combo >= 100) return 4;
  if (combo >= 50) return 3;
  if (combo >= 25) return 2;
  if (combo >= 10) return 1.5;
  return 1;
};

export const useGameStore = create<GameStoreState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial State
        gameState: 'idle',
        currentSong: null,
        progress: 0,
        score: { ...DEFAULT_SCORE },
        settings: { ...DEFAULT_SETTINGS },
        currentPitch: null,
        activeNotes: [],
        hitNotes: new Set(),

        // Actions
        startGame: (song: Song) => {
          set({
            gameState: 'countdown',
            currentSong: song,
            progress: -3, // Start offset (matches LEAD_IN_TIME)
            score: { ...DEFAULT_SCORE },
            activeNotes: [],
            hitNotes: new Set(),
          });

          // Start countdown, then switch to playing
          setTimeout(() => {
            set({ gameState: 'playing' });
          }, 3000); // 3 second countdown
        },

        pauseGame: () => {
          const { gameState } = get();
          if (gameState === 'playing') {
            set({ gameState: 'paused' });
          }
        },

        resumeGame: () => {
          const { gameState } = get();
          if (gameState === 'paused') {
            set({ gameState: 'playing' });
          }
        },

        endGame: () => {
          set({ gameState: 'finished' });
        },

        resetGame: () => {
          set({
            gameState: 'idle',
            currentSong: null,
            progress: 0,
            score: { ...DEFAULT_SCORE },
            currentPitch: null,
            activeNotes: [],
            hitNotes: new Set(),
          });
        },

        updateProgress: (time: number) => {
          const { currentSong, gameState } = get();

          if (gameState !== 'playing' || !currentSong) return;

          set({ progress: time });

          // Check if song is finished
          if (time >= currentSong.duration) {
            set({ gameState: 'finished' });
          }
        },

        registerHit: (hit: NoteHit) => {
          const { score, hitNotes } = get();

          // Don't register if already hit
          if (hitNotes.has(hit.noteId)) return;

          const newHitNotes = new Set(hitNotes);
          newHitNotes.add(hit.noteId);

          let newCombo = score.combo;
          let newMaxCombo = score.maxCombo;

          // Update combo
          if (hit.accuracy === 'miss') {
            newCombo = 0;
          } else {
            newCombo += 1;
            newMaxCombo = Math.max(newMaxCombo, newCombo);
          }

          // Calculate score with combo multiplier
          const baseScore = SCORE_VALUES[hit.accuracy];
          const multiplier = getComboMultiplier(newCombo);
          const scoreGain = Math.round(baseScore * multiplier);

          // Update accuracy counts
          const newScore: GameScore = {
            score: score.score + scoreGain,
            combo: newCombo,
            maxCombo: newMaxCombo,
            perfect: score.perfect + (hit.accuracy === 'perfect' ? 1 : 0),
            good: score.good + (hit.accuracy === 'good' ? 1 : 0),
            okay: score.okay + (hit.accuracy === 'okay' ? 1 : 0),
            miss: score.miss + (hit.accuracy === 'miss' ? 1 : 0),
            accuracy: 0, // Calculate below
          };

          // Calculate overall accuracy
          const totalHits = newScore.perfect + newScore.good + newScore.okay + newScore.miss;
          if (totalHits > 0) {
            const weightedSum =
              newScore.perfect * 100 +
              newScore.good * 75 +
              newScore.okay * 50;
            newScore.accuracy = Math.round(weightedSum / totalHits);
          }

          set({ score: newScore, hitNotes: newHitNotes });
        },

        setCurrentPitch: (pitch: DetectedPitch | null) => {
          set({ currentPitch: pitch });
        },

        updateSettings: (newSettings: Partial<GameSettings>) => {
          const { settings } = get();
          set({ settings: { ...settings, ...newSettings } });
        },

        setActiveNotes: (notes: SongNote[]) => {
          set({ activeNotes: notes });
        },

        markNoteAsHit: (noteId: string) => {
          const { hitNotes } = get();
          const newHitNotes = new Set(hitNotes);
          newHitNotes.add(noteId);
          set({ hitNotes: newHitNotes });
        },
      }),
      {
        name: 'kalimba-hero-settings',
        // Only persist settings, not game state
        partialize: (state) => ({
          settings: state.settings,
        }),
      }
    )
  )
);

// Selectors for common derived state
export const selectIsPlaying = (state: GameStoreState) => state.gameState === 'playing';
export const selectCanStart = (state: GameStoreState) => state.gameState === 'idle';
export const selectIsPaused = (state: GameStoreState) => state.gameState === 'paused';
export const selectIsFinished = (state: GameStoreState) => state.gameState === 'finished';







