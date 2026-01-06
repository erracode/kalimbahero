// ============================================
// Kalimba Hero - 21-Key Frequency Map
// ============================================
// EXACT layout from user's rainbow kalimba (left to right):
// D°2°, B°7°, G°5°, E°3°, C°1°, A6, F4, D2, B7°, G5°, F4°(CENTER), A6°, C1, E3, G5, B7, D°2°, F°4°, A°6°, C°°1°°, E°°3°°

import type { KalimbaKey, LaneConfig } from '@/types/game';

const A4_FREQUENCY = 440;
const getFrequency = (semitonesFromA4: number): number => 
  A4_FREQUENCY * Math.pow(2, semitonesFromA4 / 12);

// Rainbow colors matching the kalimba image (left to right)
const RAINBOW_COLORS: string[] = [
  '#E84393', // 0 - Pink (D°/2°)
  '#9B59B6', // 1 - Purple (B°/7°)
  '#5B5EA6', // 2 - Indigo (G°/5°)
  '#3498DB', // 3 - Blue (E°/3°)
  '#00CEC9', // 4 - Teal (C°/1°)
  '#00B894', // 5 - Green (A/6)
  '#55EFC4', // 6 - Light Green (F/4)
  '#BADC58', // 7 - Yellow-Green (D/2)
  '#F9CA24', // 8 - Yellow (B/7°)
  '#F0932B', // 9 - Orange (G/5°)
  '#EB4D4B', // 10 - Red (F/4° CENTER)
  '#E056FD', // 11 - Magenta (A/6°)
  '#00CEC9', // 12 - Teal (C/1)
  '#00B894', // 13 - Green (E/3)
  '#55EFC4', // 14 - Light Green (G/5)
  '#BADC58', // 15 - Yellow-Green (B/7)
  '#F9CA24', // 16 - Yellow (D°/2°)
  '#00CEC9', // 17 - Teal (F°/4°)
  '#3498DB', // 18 - Blue (A°/6°)
  '#9B59B6', // 19 - Purple (C°°/1°°)
  '#E84393', // 20 - Pink (E°°/3°°)
];

// Exact kalimba layout from user
// Format: { position, scaleDegree, note, displayDegree, displayNote }
// displayDegree: what shows for the NUMBER (e.g., "2°")
// displayNote: what shows for the NOTE LETTER (e.g., "D°")
interface KalimbaKeyData {
  physicalPosition: number;
  scaleDegree: number;
  noteName: string;
  octave: number;
  semitonesFromA4: number;
  displayDegree: string;  // e.g., "2°" or "1°°"
  displayNote: string;    // e.g., "D°" or "C°°"
}

// User's exact layout (left to right):
// D°2°, B°7°, G°5°, E°3°, C°1°, A6, F4, D2, B7°, G5°, F4°, A6°, C1, E3, G5, B7, D°2°, F°4°, A°6°, C°°1°°, E°°3°°
const KALIMBA_KEY_DATA: KalimbaKeyData[] = [
  // Position 0-4: Left outer (high notes - ° on both note AND number)
  { physicalPosition: 0,  scaleDegree: 2, noteName: 'D', octave: 6, semitonesFromA4: 17,  displayDegree: '2°', displayNote: 'D°' },
  { physicalPosition: 1,  scaleDegree: 7, noteName: 'B', octave: 5, semitonesFromA4: 14,  displayDegree: '7°', displayNote: 'B°' },
  { physicalPosition: 2,  scaleDegree: 5, noteName: 'G', octave: 5, semitonesFromA4: 10,  displayDegree: '5°', displayNote: 'G°' },
  { physicalPosition: 3,  scaleDegree: 3, noteName: 'E', octave: 5, semitonesFromA4: 7,   displayDegree: '3°', displayNote: 'E°' },
  { physicalPosition: 4,  scaleDegree: 1, noteName: 'C', octave: 5, semitonesFromA4: 3,   displayDegree: '1°', displayNote: 'C°' },
  
  // Position 5-7: Left middle (base notes - NO markers)
  { physicalPosition: 5,  scaleDegree: 6, noteName: 'A', octave: 3, semitonesFromA4: -12, displayDegree: '6',  displayNote: 'A' },
  { physicalPosition: 6,  scaleDegree: 4, noteName: 'F', octave: 3, semitonesFromA4: -16, displayDegree: '4',  displayNote: 'F' },
  { physicalPosition: 7,  scaleDegree: 2, noteName: 'D', octave: 4, semitonesFromA4: -7,  displayDegree: '2',  displayNote: 'D' },
  
  // Position 8-11: Inner (° on NUMBER only, not on note letter)
  { physicalPosition: 8,  scaleDegree: 7, noteName: 'B', octave: 3, semitonesFromA4: -10, displayDegree: '7°', displayNote: 'B' },
  { physicalPosition: 9,  scaleDegree: 5, noteName: 'G', octave: 4, semitonesFromA4: -2,  displayDegree: '5°', displayNote: 'G' },
  { physicalPosition: 10, scaleDegree: 4, noteName: 'F', octave: 4, semitonesFromA4: -4,  displayDegree: '4°', displayNote: 'F' },  // CENTER
  { physicalPosition: 11, scaleDegree: 6, noteName: 'A', octave: 4, semitonesFromA4: 0,   displayDegree: '6°', displayNote: 'A' },
  
  // Position 12-15: Right middle (base notes - NO markers)
  { physicalPosition: 12, scaleDegree: 1, noteName: 'C', octave: 4, semitonesFromA4: -9,  displayDegree: '1',  displayNote: 'C' },
  { physicalPosition: 13, scaleDegree: 3, noteName: 'E', octave: 4, semitonesFromA4: -5,  displayDegree: '3',  displayNote: 'E' },
  { physicalPosition: 14, scaleDegree: 5, noteName: 'G', octave: 4, semitonesFromA4: -2,  displayDegree: '5',  displayNote: 'G' },
  { physicalPosition: 15, scaleDegree: 7, noteName: 'B', octave: 4, semitonesFromA4: 2,   displayDegree: '7',  displayNote: 'B' },
  
  // Position 16-18: Right outer (° on both note AND number)
  { physicalPosition: 16, scaleDegree: 2, noteName: 'D', octave: 5, semitonesFromA4: 5,   displayDegree: '2°', displayNote: 'D°' },
  { physicalPosition: 17, scaleDegree: 4, noteName: 'F', octave: 5, semitonesFromA4: 8,   displayDegree: '4°', displayNote: 'F°' },
  { physicalPosition: 18, scaleDegree: 6, noteName: 'A', octave: 5, semitonesFromA4: 12,  displayDegree: '6°', displayNote: 'A°' },
  
  // Position 19-20: Far right (°° on both note AND number)
  { physicalPosition: 19, scaleDegree: 1, noteName: 'C', octave: 6, semitonesFromA4: 15,  displayDegree: '1°°', displayNote: 'C°°' },
  { physicalPosition: 20, scaleDegree: 3, noteName: 'E', octave: 6, semitonesFromA4: 19,  displayDegree: '3°°', displayNote: 'E°°' },
];

// TAB NOTATION MAPPING
// Maps standard kalimba tab notation to physical key positions
// When playing a song, "1" means position 12, "1°" means position 4, etc.
export const NOTATION_TO_KEY_INDEX = new Map<string, number>();

// Base notes (no marker) - center of kalimba
NOTATION_TO_KEY_INDEX.set('1', 12);  // C at position 12
NOTATION_TO_KEY_INDEX.set('2', 7);   // D at position 7
NOTATION_TO_KEY_INDEX.set('3', 13);  // E at position 13
NOTATION_TO_KEY_INDEX.set('4', 6);   // F at position 6
NOTATION_TO_KEY_INDEX.set('5', 14);  // G at position 14
NOTATION_TO_KEY_INDEX.set('6', 5);   // A at position 5
NOTATION_TO_KEY_INDEX.set('7', 15);  // B at position 15

// One ° marker (1°, 2°, etc.) - using ° * and ' variants
['°', '*', "'"].forEach(marker => {
  NOTATION_TO_KEY_INDEX.set(`1${marker}`, 4);   // C° at position 4
  NOTATION_TO_KEY_INDEX.set(`2${marker}`, 16);  // D° at position 16
  NOTATION_TO_KEY_INDEX.set(`3${marker}`, 3);   // E° at position 3
  NOTATION_TO_KEY_INDEX.set(`4${marker}`, 10);  // F° at position 10 (CENTER)
  NOTATION_TO_KEY_INDEX.set(`5${marker}`, 9);   // G° at position 9
  NOTATION_TO_KEY_INDEX.set(`6${marker}`, 11);  // A° at position 11
  NOTATION_TO_KEY_INDEX.set(`7${marker}`, 8);   // B° at position 8
});

// Two °° markers (1°°, 2°°, etc.)
['°°', '**', "''"].forEach(marker => {
  NOTATION_TO_KEY_INDEX.set(`1${marker}`, 19);  // C°° at position 19
  NOTATION_TO_KEY_INDEX.set(`2${marker}`, 0);   // D°° at position 0 (highest D)
  NOTATION_TO_KEY_INDEX.set(`3${marker}`, 20);  // E°° at position 20
  NOTATION_TO_KEY_INDEX.set(`4${marker}`, 17);  // F°° at position 17
  NOTATION_TO_KEY_INDEX.set(`5${marker}`, 2);   // G°° at position 2
  NOTATION_TO_KEY_INDEX.set(`6${marker}`, 18);  // A°° at position 18
  NOTATION_TO_KEY_INDEX.set(`7${marker}`, 1);   // B°° at position 1
});

// Total number of kalimba keys/lanes
export const TOTAL_LANES = 21;

// Generate KALIMBA_KEYS array from data
export const KALIMBA_KEYS: KalimbaKey[] = KALIMBA_KEY_DATA.map((data, index) => ({
  index,
  noteNumber: index + 1,
  noteName: `${data.noteName}${data.octave}`,
  frequency: getFrequency(data.semitonesFromA4),
  octave: data.octave,
  isSharp: false,
  scaleDegree: data.scaleDegree,
  octaveMarker: data.displayDegree.replace(/\d/g, ''),
  physicalPosition: data.physicalPosition,
  displayDegree: data.displayDegree,
  displayNote: data.displayNote,
}));

// Parse notation like "1", "1°", "1*", "1°°", "1**"
export const parseScaleNotation = (notation: string): { scaleDegree: number; octaveUp: number } | null => {
  const normalized = notation.trim()
    .replace(/\*\*/g, '°°').replace(/\*/g, '°')
    .replace(/''/g, '°°').replace(/'/g, '°');
  
  const match = normalized.match(/^(\d)([°]*)$/);
  if (!match) return null;
  
  const scaleDegree = parseInt(match[1]);
  if (scaleDegree < 1 || scaleDegree > 7) return null;
  
  return { scaleDegree, octaveUp: (match[2] || '').length };
};

export const findKeyByScaleNotation = (notation: { scaleDegree: number; octaveUp: number }): number | null => {
  const markers = '°'.repeat(notation.octaveUp);
  return NOTATION_TO_KEY_INDEX.get(`${notation.scaleDegree}${markers}`) ?? null;
};

export const findClosestKey = (frequency: number, tolerance = 15): { key: KalimbaKey; cents: number } | null => {
  if (frequency <= 0) return null;
  
  let closestKey: KalimbaKey | null = null;
  let smallestCentsDiff = Infinity;
  
  for (const key of KALIMBA_KEYS) {
    const centsDiff = Math.abs(1200 * Math.log2(frequency / key.frequency));
    if (centsDiff < smallestCentsDiff) {
      smallestCentsDiff = centsDiff;
      closestKey = key;
    }
  }
  
  if (closestKey && smallestCentsDiff <= tolerance) {
    return { key: closestKey, cents: 1200 * Math.log2(frequency / closestKey.frequency) };
  }
  return null;
};

export const frequencyToNoteName = (frequency: number): string => {
  if (frequency <= 0) return '-';
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const semitones = 12 * Math.log2(frequency / A4_FREQUENCY);
  const roundedSemitones = Math.round(semitones);
  const noteIndex = ((roundedSemitones % 12) + 12 + 9) % 12;
  const octave = Math.floor((roundedSemitones + 9) / 12) + 4;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
};

export const getKeyColor = (keyIndex: number): string => RAINBOW_COLORS[keyIndex] || '#00E5FF';
export const LANE_COLORS: string[] = RAINBOW_COLORS;

export const generateLaneConfigs = (laneWidth = 0.8, laneGap = 0.1, laneLength = 20): LaneConfig[] => {
  const totalWidth = (laneWidth + laneGap) * 21;
  const startX = -totalWidth / 2 + laneWidth / 2;
  return KALIMBA_KEYS.map((_, i) => ({
    index: i,
    position: [startX + i * (laneWidth + laneGap), 0, -laneLength / 2] as [number, number, number],
    color: RAINBOW_COLORS[i],
    glowColor: RAINBOW_COLORS[i],
  }));
};

export const getLaneXPosition = (keyIndex: number, laneWidth = 0.8, laneGap = 0.1): number => {
  const totalWidth = (laneWidth + laneGap) * 21;
  return -totalWidth / 2 + laneWidth / 2 + keyIndex * (laneWidth + laneGap);
};

export const getTineHeight = (physicalPosition: number): number => {
  const center = 10;
  return 1.0 + Math.abs(physicalPosition - center) * 0.18;
};

export const KALIMBA_FREQUENCY_RANGE = {
  min: Math.min(...KALIMBA_KEYS.map(k => k.frequency)),
  max: Math.max(...KALIMBA_KEYS.map(k => k.frequency)),
};

export const isInKalimbaRange = (frequency: number): boolean => {
  const margin = 50;
  return frequency >= KALIMBA_FREQUENCY_RANGE.min - margin && 
         frequency <= KALIMBA_FREQUENCY_RANGE.max + margin;
};

// Return the display labels for a key
export const getKeyDisplayLabel = (keyIndex: number): { degree: string; note: string } => {
  const data = KALIMBA_KEY_DATA[keyIndex];
  return data ? { degree: data.displayDegree, note: data.displayNote } : { degree: '', note: '' };
};

export const KALIMBA_PHYSICAL_DATA = KALIMBA_KEY_DATA;
