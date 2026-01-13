// ============================================
// Kalimba Hero - Game Loop Hook
// ============================================
// Manages game timing, note spawning, and hit detection

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import type { SongNote, DetectedPitch, HitAccuracy, NoteHit } from '@/types/game';
import { getKalimbaConfig, getTranspositionOffset, transposeFrequency } from '@/utils/frequencyMap';
import { HARDWARE_PRESETS } from '@/utils/hardwarePresets';

interface UseGameLoopOptions {
  onNoteHit?: (hit: NoteHit) => void;
  onNoteMiss?: (note: SongNote) => void;
}

interface UseGameLoopReturn {
  visibleNotes: SongNote[];
  hitZoneNotes: SongNote[];
  progress: number;
}

// Calculate how far ahead to show notes (in seconds)
const getNoteLookahead = (noteSpeed: number): number => {
  // noteSpeed 1-10 maps to 4-1 seconds lookahead
  return 4 - (noteSpeed - 1) * (3 / 9);
};

// Start offset to give player time to see notes coming (lead-in)
const START_OFFSET = 3.0;

// Calculate hit window based on timing (in ms)
const getHitAccuracy = (timeDelta: number, hitWindow: number): HitAccuracy => {
  const absTime = Math.abs(timeDelta);

  if (absTime <= hitWindow * 0.3) return 'perfect';
  if (absTime <= hitWindow * 0.6) return 'good';
  if (absTime <= hitWindow) return 'okay';
  return 'miss';
};

export const useGameLoop = (
  currentPitch: DetectedPitch | null,
  options: UseGameLoopOptions = {}
): UseGameLoopReturn => {
  const { onNoteHit, onNoteMiss } = options;

  const {
    gameState,
    currentSong,
    progress,
    settings,
    hitNotes,
    updateProgress,
    registerHit,
    setActiveNotes,
  } = useGameStore();

  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastPitchRef = useRef<DetectedPitch | null>(null);
  const processedMissesRef = useRef<Set<string>>(new Set());

  // Calculate current kalimba keys based on settings
  const kalimbaKeys = useMemo(() => {
    const preset = HARDWARE_PRESETS[settings.hardwarePresetId] || HARDWARE_PRESETS['17'];
    return getKalimbaConfig(preset.tinesCount, settings.userTuning);
  }, [settings.hardwarePresetId, settings.userTuning]);

  // Calculate transposition offset for the current song
  const transpositionOffset = useMemo(() => {
    if (!currentSong || !currentSong.authorTuning) return 0;
    return getTranspositionOffset(currentSong.authorTuning, settings.userTuning);
  }, [currentSong, settings.userTuning]);

  // Get visible notes based on current progress
  const getVisibleNotes = useCallback((): SongNote[] => {
    if (!currentSong) return [];

    const lookahead = getNoteLookahead(settings.noteSpeed);
    const startTime = progress;
    const endTime = progress + lookahead;

    return currentSong.notes.filter(note =>
      note.id &&
      note.time >= startTime - 0.5 && // Small buffer for notes leaving
      note.time <= endTime &&
      !hitNotes.has(note.id)
    );
  }, [currentSong, progress, settings.noteSpeed, hitNotes]);

  // Get notes currently in the hit zone
  const getHitZoneNotes = useCallback((): SongNote[] => {
    if (!currentSong) return [];

    const hitWindowSec = settings.hitWindow / 1000;

    return currentSong.notes.filter(note => {
      const timeDiff = note.time - progress;
      return (
        note.id &&
        Math.abs(timeDiff) <= hitWindowSec &&
        !hitNotes.has(note.id)
      );
    });
  }, [currentSong, progress, settings.hitWindow, hitNotes]);

  // Check for pitch matches with notes in hit zone
  const checkPitchMatch = useCallback((pitch: DetectedPitch) => {
    if (!currentSong || gameState !== 'playing') return;

    const hitZoneNotes = getHitZoneNotes();

    for (const note of hitZoneNotes) {
      if (hitNotes.has(note.id)) continue;

      // Get expected frequency for this note from the dynamic config
      const expectedKey = kalimbaKeys[note.keyIndex];
      if (!expectedKey) continue;

      // Apply smart transposition if needed
      let targetFrequency = expectedKey.frequency;
      if (transpositionOffset !== 0) {
        targetFrequency = transposeFrequency(targetFrequency, transpositionOffset);
      }

      // Check if detected pitch matches the expected note
      const centsDiff = 1200 * Math.log2(pitch.frequency / targetFrequency);

      if (Math.abs(centsDiff) <= settings.pitchTolerance) {
        // We have a match!
        const timeDelta = (note.time - progress) * 1000; // Convert to ms
        const accuracy = getHitAccuracy(timeDelta, settings.hitWindow);

        const hit: NoteHit = {
          noteId: note.id,
          accuracy,
          timeDelta,
          centsDelta: centsDiff,
        };

        registerHit(hit);
        onNoteHit?.(hit);

        // Only process one note per pitch detection
        break;
      }
    }
  }, [
    currentSong,
    gameState,
    getHitZoneNotes,
    hitNotes,
    settings.pitchTolerance,
    settings.hitWindow,
    progress,
    registerHit,
    onNoteHit,
  ]);

  // Check for missed notes
  const checkMissedNotes = useCallback(() => {
    if (!currentSong || gameState !== 'playing') return;

    const missWindowSec = settings.hitWindow / 1000;

    currentSong.notes.forEach(note => {
      // Skip if already hit or already processed as miss
      if (!note.id || hitNotes.has(note.id) || processedMissesRef.current.has(note.id)) return;

      // Check if note has passed the hit zone
      const timeDiff = progress - note.time;

      if (timeDiff > missWindowSec) {
        // Note was missed
        processedMissesRef.current.add(note.id);

        const hit: NoteHit = {
          noteId: note.id,
          accuracy: 'miss',
          timeDelta: timeDiff * 1000,
          centsDelta: 0,
          keyIndex: note.keyIndex,
        };

        registerHit(hit);
        onNoteMiss?.(note);
      }
    });
  }, [currentSong, gameState, hitNotes, settings.hitWindow, progress, registerHit, onNoteMiss]);

  // Main game loop
  const gameLoop = useCallback((timestamp: number) => {
    if (gameState !== 'playing') return;

    if (startTimeRef.current === null) {
      startTimeRef.current = timestamp - (pausedTimeRef.current + START_OFFSET) * 1000;
    }

    // Calculate current progress in seconds
    const elapsed = (timestamp - startTimeRef.current) / 1000;
    updateProgress(elapsed - START_OFFSET);

    // Check for missed notes
    checkMissedNotes();

    // Update active notes for UI
    setActiveNotes(getHitZoneNotes());

    // Continue loop
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, updateProgress, checkMissedNotes, setActiveNotes, getHitZoneNotes]);

  // Handle pitch changes
  useEffect(() => {
    if (currentPitch && currentPitch !== lastPitchRef.current) {
      lastPitchRef.current = currentPitch;
      checkPitchMatch(currentPitch);
    }
  }, [currentPitch, checkPitchMatch]);

  // Start/stop game loop based on state
  useEffect(() => {
    if (gameState === 'playing') {
      // Reset processed misses when starting
      if (progress === 0) {
        processedMissesRef.current.clear();
      }
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    } else if (gameState === 'paused') {
      // Save progress when pausing
      pausedTimeRef.current = progress;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    } else {
      // Stop loop and reset
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      startTimeRef.current = null;
      pausedTimeRef.current = -START_OFFSET;
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, gameLoop, progress]);

  // Reset when song changes
  useEffect(() => {
    startTimeRef.current = null;
    pausedTimeRef.current = -START_OFFSET;
    processedMissesRef.current.clear();
  }, [currentSong]);

  return {
    visibleNotes: getVisibleNotes(),
    hitZoneNotes: getHitZoneNotes(),
    progress,
  };
};

export default useGameLoop;







