
// ============================================
// Kalimba Hero - Shared Type Definitions
// ============================================

export interface ApiResponse<T = any> {
    message?: string;
    success: boolean;
    data?: T;
    error?: string;
}

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
    authorTuning?: string;  // e.g., "C", "F"
    authorTineCount?: number; // e.g., 17, 21
}
