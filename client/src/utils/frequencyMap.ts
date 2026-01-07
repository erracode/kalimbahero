// ============================================
// Kalimba Hero - 21-Key Frequency Map (Custom Calibration)
// ============================================
// Based on user's specific instrument measurements (Right -> Left scan)
//
// MEASURED VALUES & MAPPING:
// Right Side (Outer to Inner):
// 21. E6  (Target: ~1318Hz) -> Measured: ~1290Hz (E6)
// 20. C6  (Target: ~1046Hz) -> Measured: ~1052Hz (C6)
// 19. A5  (Target: ~880Hz)  -> Measured: ~880Hz (A5)
// 18. F5  (Target: ~698Hz)  -> Measured: ~687Hz (F5)
// 17. D5  (Target: ~587Hz)  -> Measured: ~584Hz (D5)
// 16. Bb4 (Target: ~466Hz)  -> Measured: ~475-478Hz (A#4/Bb4) - labeled B7
// 15. G4  (Target: ~392Hz)  -> Measured: ~399Hz (G4)
// 14. E4  (Target: ~329Hz)  -> Measured: ~326Hz (E4)
// 13. C4  (Target: ~261Hz)  -> Measured: ~265Hz (C4)
// 12. A3  (Target: ~220Hz)  -> Measured: ~214Hz (A3)
//
// Center:
// 11. F3  (Target: ~174Hz)  -> Measured: NO DATA (User skipped or missed center?)
//     Wait, user sequence: E6, C6, A5, F5, D5, Bb4, G4, E4, C4, A3.
//     Then "un extrano bug" -> G3?
//
// Left Side (Inner to Outer):
// 10. G3  (Target: ~196Hz)  -> Measured: ~190-196Hz (G3)
// 9.  Bb3 (Target: ~233Hz)  -> Measured: ~258-263Hz (C4??) - labeled B7* (B3)
//     User note: "corresponde a B 7* segun la imagen ... en la tabla no veo valor para B3 ... aprox 246"
//     User measured ~260Hz which is close to C4. Likely tuned to C4 or B3 is very sharp.
//     Let's map it to B3 but acknowledge the measured freq.
// 8.  D4  (Target: ~293Hz)  -> Measured: ~290-297Hz (D4) - labeled D2
// 7.  F4  (Target: ~349Hz)  -> Measured: ~350Hz (F4) - labeled F4
// 6.  A4  (Target: ~440Hz)  -> Measured: ~442Hz (A4)
// 5.  C5  (Target: ~523Hz)  -> Measured: ~526Hz (C5)
// 4.  E5  (Target: ~659Hz)  -> Measured: ~680Hz (F5??) - labeled E3* (E5 target)
//     User measured ~680Hz which is F5. This tine might be tuned very sharp or is actually F5.
//     Target is E5.
// 3.  G5  (Target: ~783Hz)  -> Measured: ~762Hz (G5)
// 2.  B5  (Target: ~987Hz)  -> Measured: ~1020-1036Hz (C6??) - labeled B7** (B5 target)
//     User measured >1000Hz.
// 1.  D6  (Target: ~1174Hz) -> Measured: ~1205Hz (D6)

import type { KalimbaKey, LaneConfig } from '@/types/game';

// Standard reference for calculations
const A4_FREQUENCY = 440;
const getFrequency = (semitonesFromA4: number): number =>
  A4_FREQUENCY * Math.pow(2, semitonesFromA4 / 12);

// Rainbow colors matching the kalimba image (left to right)
const RAINBOW_COLORS: string[] = [
  '#E84393', // 0 - Pink (D6)
  '#9B59B6', // 1 - Purple (Bb5)
  '#5B5EA6', // 2 - Indigo (G5)
  '#3498DB', // 3 - Blue (E5)
  '#00CEC9', // 4 - Teal (C5)
  '#00B894', // 5 - Green (A4)
  '#55EFC4', // 6 - Light Green (F4)
  '#BADC58', // 7 - Yellow-Green (D4)
  '#F9CA24', // 8 - Yellow (Bb3)
  '#F0932B', // 9 - Orange (G3)
  '#EB4D4B', // 10 - Red (F3 CENTER)
  '#F0932B', // 11 - Orange (A3)
  '#F9CA24', // 12 - Yellow (C4)
  '#BADC58', // 13 - Yellow-Green (E4)
  '#55EFC4', // 14 - Light Green (G4)
  '#00B894', // 15 - Green (Bb4)
  '#00CEC9', // 16 - Teal (D5)
  '#3498DB', // 17 - Blue (F5)
  '#5B5EA6', // 18 - Indigo (A5)
  '#9B59B6', // 19 - Purple (C6)
  '#E84393', // 20 - Pink (E6)
];

interface KalimbaKeyData {
  physicalPosition: number;
  scaleDegree: number;
  noteName: string;
  octave: number;
  // We use explicit frequency now if provided, otherwise calc
  displayDegree: string;
  displayNote: string;
  isFlat?: boolean;
}

// User's Left-to-Right layout
// LEFT: D6, Bb5, G5, E5, C5, A4, F4, D4, Bb3, G3
// CENTER: F3
// RIGHT: A3, C4, E4, G4, Bb4, D5, F5, A5, C6, E6

const KALIMBA_KEY_DATA: KalimbaKeyData[] = [
  // LEFT SIDE OUTER (0) TO INNER (9)
  { physicalPosition: 0, scaleDegree: 6, noteName: 'D', octave: 6, displayDegree: '2°°', displayNote: 'D°°' }, // D6 (~1174) -> Meas 1205
  { physicalPosition: 1, scaleDegree: 7, noteName: 'B', octave: 5, displayDegree: '7°', displayNote: 'B°', isFlat: false }, // B5 (Bb5? Image says Bb5 or B5? User said B7** B5 target). Let's assume B5 as user said B7
  { physicalPosition: 2, scaleDegree: 5, noteName: 'G', octave: 5, displayDegree: '5°', displayNote: 'G°' }, // G5 (~783) -> Meas 762
  { physicalPosition: 3, scaleDegree: 3, noteName: 'E', octave: 5, displayDegree: '3°', displayNote: 'E°' }, // E5 (~659) -> Meas 680 (Sharp/F5)
  { physicalPosition: 4, scaleDegree: 1, noteName: 'C', octave: 5, displayDegree: '1°', displayNote: 'C°' }, // C5 (~523) -> Meas 526
  { physicalPosition: 5, scaleDegree: 6, noteName: 'A', octave: 4, displayDegree: '6', displayNote: 'A' },   // A4 (~440) -> Meas 442
  { physicalPosition: 6, scaleDegree: 4, noteName: 'F', octave: 4, displayDegree: '4', displayNote: 'F' },   // F4 (~349) -> Meas 350
  { physicalPosition: 7, scaleDegree: 2, noteName: 'D', octave: 4, displayDegree: '2', displayNote: 'D' },   // D4 (~293) -> Meas 290
  { physicalPosition: 8, scaleDegree: 7, noteName: 'B', octave: 3, displayDegree: '7', displayNote: 'B', isFlat: false },   // B3 (Bb3?) User said B7*. Meas 260. Target B3 ~246.
  { physicalPosition: 9, scaleDegree: 5, noteName: 'G', octave: 3, displayDegree: '5', displayNote: 'G' },   // G3 (~196) -> Meas 196

  // CENTER
  { physicalPosition: 10, scaleDegree: 4, noteName: 'F', octave: 3, displayDegree: '1', displayNote: 'F' },  // F3 Center. (~174)

  // RIGHT SIDE INNER (11) TO OUTER (20)
  { physicalPosition: 11, scaleDegree: 6, noteName: 'A', octave: 3, displayDegree: '6', displayNote: 'A' },  // A3 (~220) -> Meas 214
  { physicalPosition: 12, scaleDegree: 1, noteName: 'C', octave: 4, displayDegree: '1', displayNote: 'C' },  // C4 (~261) -> Meas 265
  { physicalPosition: 13, scaleDegree: 3, noteName: 'E', octave: 4, displayDegree: '3', displayNote: 'E' },  // E4 (~329) -> Meas 326
  { physicalPosition: 14, scaleDegree: 5, noteName: 'G', octave: 4, displayDegree: '5', displayNote: 'G' },  // G4 (~392) -> Meas 399
  { physicalPosition: 15, scaleDegree: 7, noteName: 'B', octave: 4, displayDegree: '7', displayNote: 'B', isFlat: false },  // B4 (Bb4?) User said B7. Meas 475. B4 ~493. Bb4 ~466. 475 is closer to Bb4 but sharp.
  { physicalPosition: 16, scaleDegree: 2, noteName: 'D', octave: 5, displayDegree: '2°', displayNote: 'D°' }, // D5 (~587) -> Meas 584
  { physicalPosition: 17, scaleDegree: 4, noteName: 'F', octave: 5, displayDegree: '4°', displayNote: 'F°' }, // F5 (~698) -> Meas 687
  { physicalPosition: 18, scaleDegree: 6, noteName: 'A', octave: 5, displayDegree: '6°', displayNote: 'A°' }, // A5 (~880) -> Meas 880
  { physicalPosition: 19, scaleDegree: 1, noteName: 'C', octave: 6, displayDegree: '1°°', displayNote: 'C°°' }, // C6 (~1046) -> Meas 1052
  { physicalPosition: 20, scaleDegree: 3, noteName: 'E', octave: 6, displayDegree: '3°°', displayNote: 'E°°' }, // E6 (~1318) -> Meas 1290
];

export const TOTAL_LANES = 21;

// Helper to get frequency from NoteName+Octave
const getStandardFrequency = (note: string, octave: number): number => {
  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteIndex = NOTES.indexOf(note);
  // A4 is index 9, octave 4. 
  // semitones = (octave - 4) * 12 + (noteIndex - 9)
  const semitones = (octave - 4) * 12 + (noteIndex - 9);
  return getFrequency(semitones);
};

// Generate KALIMBA_KEYS array from data
export const KALIMBA_KEYS: KalimbaKey[] = KALIMBA_KEY_DATA.map((data, index) => {
  // Use standard frequency based on note name to be "in tune" standard
  // We want the tuner to guide them to the STANDARD pitch, not their current pitch, 
  // UNLESS the note is fundamentally different (like B vs Bb).

  // Based on user data, the B notes seem to be B, not Bb in some cases, or tuned weirdly.
  // Their "B7" (B4) measured 475Hz. B4 is 493. Bb4 is 466. 475 is right in between.
  // Their "B7*" (B3) measured 260Hz. B3 is 246. C4 is 261. It's almost C4.
  // Their "B7**" (B5) measured 1020Hz. B5 is 987. C6 is 1046. It's almost C6.

  // Decision: Trust the "Note Name" they see on the tine (B) and aim for standard B frequencies.
  // If they are physically tuned to Bb, the tuner will just show them as Flat.
  // Exception: If they are F-major keys, B should be Bb.
  // The user mentions "Frequencies de referencia" image often. 
  // Let's assume standard Western Concert Pitch for the named notes.

  // Correction for F-Major items if needed:
  // If the user says it's "B7", they probably mean scale degree 7.
  // In C Major, 7 is B. In F Major, 7 is E? No, 7th note of F Major is E.
  // If it's labeled "7", and it's F-Major...
  // 1=F, 2=G, 3=A, 4=Bb, 5=C, 6=D, 7=E.
  // BUT traditional Jianpu on Kalimbas usually treats C as 1.
  // If they have an "F-tone" Kalimba, usually 'F' is marked as '1'.

  // Let's use the USER'S provided Note Names in the data structure above as truth for target.
  const frequency = getStandardFrequency(data.noteName, data.octave);

  return {
    index,
    noteNumber: index + 1,
    noteName: `${data.noteName}${data.octave}`,
    frequency,
    octave: data.octave,
    isSharp: data.noteName.includes('#'),
    scaleDegree: data.scaleDegree,
    octaveMarker: data.displayDegree.replace(/\d/g, ''),
    physicalPosition: data.physicalPosition,
    displayDegree: data.displayDegree,
    displayNote: data.displayNote,
  };
});

// Helper for finding keys
export const NOTATION_TO_KEY_INDEX = new Map<string, number>();

// Map notation to physical indices using the data array
KALIMBA_KEY_DATA.forEach((data, index) => {
  // Map "1", "1°", etc.
  NOTATION_TO_KEY_INDEX.set(data.displayDegree, index);

  // Also map alternate "dots"
  const numb = data.displayDegree.replace(/\D/g, '');
  const dots = data.displayDegree.match(/°/g)?.length || 0;

  if (dots === 1) {
    NOTATION_TO_KEY_INDEX.set(`${numb}*`, index);
    NOTATION_TO_KEY_INDEX.set(`${numb}'`, index);
  } else if (dots === 2) {
    NOTATION_TO_KEY_INDEX.set(`${numb}**`, index);
    NOTATION_TO_KEY_INDEX.set(`${numb}''`, index);
  }
});


export const parseScaleNotation = (notation: string): { scaleDegree: number; octaveUp: number } | null => {
  const normalized = notation.trim()
    .replace(/\*\*/g, '°°').replace(/\*/g, '°')
    .replace(/''/g, '°°').replace(/'/g, '°');

  const match = normalized.match(/^(\d)([°]*)$/);
  if (!match) return null;

  const scaleDegree = parseInt(match[1]);
  // Allow any number technically, but usually 1-7
  return { scaleDegree, octaveUp: (match[2] || '').length };
};

export const findKeyByScaleNotation = (notation: { scaleDegree: number; octaveUp: number }): number | null => {
  const markers = '°'.repeat(notation.octaveUp);
  return NOTATION_TO_KEY_INDEX.get(`${notation.scaleDegree}${markers}`) ?? null;
};

export const findClosestKey = (frequency: number, tolerance = 50): { key: KalimbaKey; cents: number } | null => {
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

  // Increased tolerance to catch out-of-tune notes (since user's notes are drifting)
  if (closestKey && smallestCentsDiff <= tolerance) {
    return { key: closestKey, cents: 1200 * Math.log2(frequency / closestKey.frequency) };
  }
  return null;
};

export const frequencyToNoteName = (frequency: number): string => {
  if (frequency <= 0) return '-';
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const semitones = 12 * Math.log2(frequency / A4_FREQUENCY);

  const noteNameIndex = (Math.round(semitones) + 9);
  const normalizedIndex = ((noteNameIndex % 12) + 12) % 12;
  const oct = 4 + Math.floor((Math.round(semitones) + 9) / 12);

  return `${NOTE_NAMES[normalizedIndex]}${oct}`;
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
  const margin = 100; // Wider margin
  return frequency >= KALIMBA_FREQUENCY_RANGE.min - margin &&
    frequency <= KALIMBA_FREQUENCY_RANGE.max + margin;
};

// Return the display labels for a key
export const getKeyDisplayLabel = (keyIndex: number): { degree: string; note: string } => {
  const data = KALIMBA_KEY_DATA[keyIndex];
  return data ? { degree: data.displayDegree, note: data.displayNote } : { degree: '', note: '' };
};

export const KALIMBA_PHYSICAL_DATA = KALIMBA_KEY_DATA;
