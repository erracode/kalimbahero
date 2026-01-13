// ============================================
// Kalimba Hero - Type Definitions
// ============================================

// Kalimba Hardware Presets
export type HardwarePresetId = '8' | '9' | '10' | '13' | '17' | '21' | '34';

export interface HardwarePreset {
  id: HardwarePresetId;
  name: string;
  tinesCount: number;
  centerNoteIndex: number;
  defaultRoot: string;
  description?: string;
  isChromatic?: boolean;
  scale?: string; // Default scale for this preset
}

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
  isChromatic?: boolean;  // Optional, true for upper layer keys
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
  raw_notation_backup?: string; // Original user-formatted notation preservation
  author?: {
    id: string;
    name: string;
    image?: string;
  };
  plays?: number;
  likes?: number;
  isLiked?: boolean;
  isFavorited?: boolean;
  youtubeUrl?: string;
  category?: string;
  averageRating?: number; // 1-5
  voteCount?: number;
  userRating?: number;    // 1-5
  authorTuning?: string;  // e.g., "C", "F"
  authorScale?: string;   // e.g., "Major", "Minor"
  authorTineCount?: number; // e.g., 17, 21
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
  hardwarePresetId: HardwarePresetId;
  userTuning: string;     // e.g., "C", "F", "G"
  labelType: 'numbers' | 'letters' | 'both';
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
  centsDelta?: number;    // pitch deviation
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
