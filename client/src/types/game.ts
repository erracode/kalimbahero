// ============================================
// Kalimba Hero - Type Definitions
// ============================================

// Difficulty levels
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

// Time signature
export type TimeSignature = '4/4' | '3/4' | '2/4';

// Individual kalimba key configuration
export interface KalimbaKey {
  index: number;
  noteNumber: number;
  noteName: string;       // e.g., "C4", "D5"
  frequency: number;      // Hz
  octave: number;         // 3-6
  isSharp: boolean;
  scaleDegree: number;    // 1-7
  octaveMarker: string;   // '', '°', '°°'
  physicalPosition: number;
  displayDegree: string;  // e.g., "1", "1°", "1°°" - what shows on the tine
  displayNote: string;    // e.g., "C", "C°", "C°°" - note with marker
}

// Lane configuration for 3D rendering
export interface LaneConfig {
  index: number;
  position: [number, number, number];
  color: string;
  glowColor: string;
}

// A single note in a song
export interface SongNote {
  id?: string;            // Unique identifier
  keyIndex: number;
  scaleDegree?: number;   // Optional - set by some parsers
  octaveMarker?: string;  // Optional - set by some parsers
  time: number;           // seconds from start
  duration?: number;      // hold duration
  note?: string;          // Note name
  frequency?: number;     // Note frequency
  isChord?: boolean;      // part of a chord
  chordGroup?: number;    // which chord this belongs to
}

// Song metadata and notes
export interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  timeSignature?: TimeSignature;  // Time signature for grid division
  difficulty: Difficulty | 1 | 2 | 3 | 4 | 5;
  duration: number;       // seconds
  notes: SongNote[];
  icon?: string;
  iconColor?: string;
  color?: string;
  notation?: string;      // original notation string
  createdAt?: number;     // timestamp
  isCloud?: boolean;      // synced to cloud
  isPublic?: boolean;     // published to community
  cloudId?: string;       // server UUID for cloud operations
  author?: {
    id: string;
    name: string;
    image?: string;
  };
  plays?: number;
  likes?: number;
  isLiked?: boolean;
  isFavorited?: boolean;
}

// Real-time pitch detection result
export interface DetectedPitch {
  frequency: number;
  clarity: number;        // 0-1 confidence
  note?: string;          // matched note name (legacy)
  noteName?: string;      // matched note name (full name like C4)
  keyIndex?: number;      // matched kalimba key
  cents: number;          // deviation from perfect pitch
  volume?: number;        // RMS volume (0-1)
  timestamp?: number;     // for tracking timing
}

// Game settings
export interface GameSettings {
  noteSpeed: number;      // 1-10
  hitWindow: number;      // milliseconds
  pitchTolerance: number; // cents
  showNotation: boolean;
  showLaneNumbers: boolean;
  audioLatency: number;
}

// Score tracking
export interface GameScore {
  score: number;
  combo: number;
  maxCombo: number;
  perfect: number;
  good: number;
  okay: number;
  miss: number;
  accuracy: number;
}

// Hit accuracy levels
export type HitAccuracy = 'perfect' | 'good' | 'okay' | 'miss';

// Note hit result
export interface NoteHit {
  noteId: string;
  accuracy: HitAccuracy;
  timeDelta: number;      // ms early/late
  keyIndex: number;
}

// Game state machine
export type GameState =
  | 'idle'
  | 'countdown'
  | 'playing'
  | 'paused'
  | 'finished';

// Performance rank
export type GameRank = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

// Game screen states
export type GameScreen = 'home' | 'library' | 'builder' | 'playing' | 'results' | 'settings';
