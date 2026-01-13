// ============================================
// Kalimba Hero - Song Parser
// ============================================
// Parses standard kalimba tablature notation

import type { Song, SongNote, Difficulty, TimeSignature } from '@/types/game';
import { generateKalimbaLayout } from './frequencyMap';

// Generate unique ID
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};

interface ParseOptions {
  bpm: number;
  timeSignature?: TimeSignature;
  authorTuning?: string;
  authorScale?: string;
  authorTineCount?: number;
}



/**
 * Builds a mapping from notation (e.g., "1°") to the dynamic keyIndex of the kalimba configuration.
 */
const getNotationMap = (tinesCount: number, tuning: string, scale: string = 'Major') => {
  const keys = generateKalimbaLayout(tinesCount, tuning, scale);
  const map = new Map<string, number>();

  keys.forEach(key => {
    // Both degree and note notation can be used
    map.set(key.displayDegree, key.index);
    map.set(key.displayNote, key.index);
    // Simple degree without dots if it's the base octave
    if (!key.octaveMarker) {
      map.set(key.scaleDegree.toString(), key.index);
    }
  });

  return map;
};

// Parse a single note token with smart normalization and range scaling
const parseNoteToken = (token: string, notationMap: Map<string, number>, _tinesCount: number, _tuning: string): number | null => {
  const trimmed = token.trim();
  if (!trimmed) return null;
  if (['-', '_', 'r', 'R'].includes(trimmed)) return -1; // Explicit rest

  // Normalize: * -> °, ' -> °, . -> (dot below - handled as notation variation?)
  // User spec: "1." -> "1 with dot below".  We usually stick to standard strings.
  // We will normalize to standard "1", "1°", "1°°", "1°°°" format if possible, 
  // or rely on what generateKalimbaLayout produces.
  // The layout generator produces: "1", "1°", "1°°".
  // If user input is "1*", we map to "1°".
  let normalized = trimmed
    .replace(/\*\*/g, '°°')
    .replace(/\*/g, '°')
    .replace(/''/g, '°°')
    .replace(/'/g, '°')
    .replace(/\./g, ''); // Remove dot for now or map to lower octave? 
  // If we support lower octave, we need a convention. "1." usually means lower octave.
  // Our layout generator currently only supports BASE and HIGHER octaves (using dots).
  // The 21-key layout has a center F3. If that is "1", then lower E3 is "7.".
  // If the map has "7.", we should match it.
  // Let's assume the map contains whatever keys.displayDegree has.

  // Try exact match first
  let keyIndex = notationMap.get(normalized);
  if (keyIndex !== undefined) return keyIndex;

  // Try raw match (without normalization if map has quirky keys)
  keyIndex = notationMap.get(trimmed);
  if (keyIndex !== undefined) return keyIndex;

  // Auto-scaling / Fallback:
  // If "1°°" not found, try "1°".
  if (normalized.includes('°°')) {
    const lower = normalized.replace('°°', '°');
    keyIndex = notationMap.get(lower);
    if (keyIndex !== undefined) return keyIndex; // Downgrade octave
  }
  if (normalized.includes('°')) {
    const lower = normalized.replace('°', '');
    keyIndex = notationMap.get(lower);
    if (keyIndex !== undefined) return keyIndex; // Downgrade octave
  }

  // Fallback for simple numbers
  const simpleMatch = normalized.match(/^([1-7])/); // Match the number part
  if (simpleMatch) {
    const degree = simpleMatch[1];
    // Try to find the "middle" occurrence of this degree in the map?
    // notationMap is string -> index. Indices are unique.
    // We already tried looking up the degree.
    // If not found, it's likely invalid.
    return notationMap.get(degree) ?? null;
  }

  return null;
};

export const parseSongNotation = (
  notation: string,
  options: ParseOptions
): SongNote[] => {
  const { bpm, timeSignature: _ts = '4/4', authorTuning = 'C', authorScale = 'Major', authorTineCount = 17 } = options;
  // const gridDivision = parseInt(timeSignature.split('/')[1]); // e.g. 4
  const subBeatDuration = 60 / bpm; // 1 beat duration (e.g. quarter note) 
  // Wait, subBeatDuration usually depends on gridDivision? 
  // If timeSig is 4/4, beat is 1/4 note. 
  // If input is "1 2 3", each is a beat.
  // Standard logic: A "token" is a beat (unless subdivided).

  const notationMap = getNotationMap(authorTineCount, authorTuning, authorScale);
  const notes: SongNote[] = [];
  let currentTime = 0;

  // Split by newlines to process line by line (optional, but good for structure)
  const lines = notation.split(/\n/);

  for (const line of lines) {
    if (!line.trim()) continue;

    // Advanced Tokenization:
    // We want to split by space, BUT preserve empty slots for rests.
    // "1  2" -> "1", "", "2".
    // Regex split by space but keep empty?
    // String.split(' ') does exactly that.

    // We also need to handle chords "(1 3)" or "(13)".
    // We should pre-process the line to treat (...) as single tokens.
    // Replace spaces inside () with a temporary placeholder?
    // Or iterate manually.

    const tokens: string[] = [];
    let buffer = '';
    let inChord = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '(') {
        inChord = true;
        buffer += char;
      } else if (char === ')') {
        inChord = false;
        buffer += char;
        tokens.push(buffer); // End of chord token
        buffer = '';
      } else if (char === ' ') {
        if (inChord) {
          buffer += char; // Keep space inside chord
        } else {
          if (buffer.length > 0) {
            tokens.push(buffer);
            buffer = '';
          }
          // Push a dedicated space token for EVERY space found
          // This allows "A B" to have a 0.5s gap (A=0.25, space=0.25)
          // and "A  B" to have a 0.75s gap, etc.
          tokens.push(' ');
        }
      } else {
        buffer += char;
      }
    }
    if (buffer.length > 0) tokens.push(buffer);

    // Process Tokens
    for (const token of tokens) {
      if (token === '') {
        // Rest
        currentTime += subBeatDuration;
        continue;
      }

      // Subdivide Logic
      // If token is wrapped in (), it's a chord.
      // If token is alphanumeric "467" (no parens), it's fast notes.
      // Duration of the whole token is `subBeatDuration`.

      if (token.startsWith('(') && token.endsWith(')')) {
        // CHORD
        const content = token.slice(1, -1);
        // Parse notes inside chord
        // "1 3 5" or "135"
        // We need to extract individual notes from chord string.
        // Regex to find notes: digit + optional modifiers
        const noteMatches = content.matchAll(/([0-9][°*'.]*)/g);
        let hasNotes = false;
        for (const match of noteMatches) {
          const noteStr = match[0];
          const idx = parseNoteToken(noteStr, notationMap, authorTineCount, authorTuning);
          if (idx !== null && idx !== -1) {
            notes.push({
              id: generateId(),
              keyIndex: idx,
              time: currentTime,
              duration: subBeatDuration // Chords usually hold for the beat
            });
            hasNotes = true;
          }
        }
        if (hasNotes || content.includes('-')) {
          // A chord token advances time by 0.25 beat
          currentTime += subBeatDuration / 4;
        }
      } else if (token === ' ') {
        // Space token advances time by 0.25 beat
        currentTime += subBeatDuration / 4;
      } else {
        // MELODY (Sequential Notes)
        // Extract notes: "467" -> 4, 6, 7 in sequence.
        // Each note takes 1 subBeatDuration.
        // Regex: digit explicit (1-7) followed by optional modifiers (*, °, ', .)

        const matcher = /([1-7][°*'.]*)/g;
        let match;
        let hasMelody = false;

        while ((match = matcher.exec(token)) !== null) {
          const noteStr = match[0];
          const idx = parseNoteToken(noteStr, notationMap, authorTineCount, authorTuning);
          if (idx !== null && idx !== -1) {
            notes.push({
              id: generateId(),
              keyIndex: idx,
              time: currentTime,
              duration: subBeatDuration / 4 // 16th note duration
            });
            // Advance time by 0.25 beat for each dense note
            currentTime += subBeatDuration / 4;
            hasMelody = true;
          }
        }

        // If the token had no valid notes but wasn't empty, check if it was a rest symbol like '-' or 'r'
        if (!hasMelody) {
          // Check for explicit rest like '-' or 'r'
          if (/^[-r_]+$/i.test(token)) {
            currentTime += subBeatDuration;
          }
        }
      }
    }
  }

  return notes;
};

export const createSongFromNotation = (
  notation: string,
  metadata: {
    title: string;
    artist?: string;
    bpm: number;
    timeSignature?: TimeSignature;
    difficulty?: Difficulty;
    icon?: string;
    iconColor?: string;
    authorTuning?: string;
    authorScale?: string;
    authorTineCount?: number;
  }
): Song => {
  const notes = parseSongNotation(notation, {
    bpm: metadata.bpm,
    timeSignature: metadata.timeSignature,
    authorTuning: metadata.authorTuning,
    authorScale: metadata.authorScale,
    authorTineCount: metadata.authorTineCount
  });

  const duration = notes.length > 0
    ? Math.max(...notes.map(n => n.time + (n.duration || 0))) + 2
    : 0;

  return {
    id: generateId(),
    title: metadata.title,
    artist: metadata.artist || 'Unknown',
    bpm: metadata.bpm,
    timeSignature: metadata.timeSignature || '4/4',
    difficulty: metadata.difficulty || 'medium',
    icon: metadata.icon,
    iconColor: metadata.iconColor,
    notes,
    duration,
    notation,
    authorTuning: metadata.authorTuning,
    authorScale: metadata.authorScale,
    authorTineCount: metadata.authorTineCount,
    createdAt: Date.now(),
  };
};

export const notesToNotation = (
  notes: SongNote[],
  bpm: number,
  timeSignature: TimeSignature = '4/4',
  authorTuning: string = 'C',
  authorScale: string = 'Major',
  authorTineCount: number = 17
): string => {
  if (notes.length === 0) return '';
  const beatDuration = 60 / bpm;
  const subBeatDuration = beatDuration; // 1 beat (Space = 1 beat)
  const kalimbaKeys = generateKalimbaLayout(authorTineCount, authorTuning, authorScale);

  // Group notes by time
  const sortedNotes = [...notes].sort((a, b) => a.time - b.time);
  const grouped: { time: number; notes: SongNote[] }[] = [];

  sortedNotes.forEach(note => {
    const lastGroup = grouped[grouped.length - 1];
    if (lastGroup && Math.abs(note.time - lastGroup.time) < 0.05) { // Tolerance
      lastGroup.notes.push(note);
    } else {
      grouped.push({ time: note.time, notes: [note] });
    }
  });

  let notation = '';
  let lastTimeEnd = 0;
  let currentBlock = ''; // Accumulates fast notes (e.g. "467")
  let currentChain = 0;  // Count notes in current block to prevent "walls of text"
  let currentMeasure = 0;
  const beatsPerMeasure = parseInt(timeSignature.split('/')[0]);
  const measureDuration = beatsPerMeasure * beatDuration;

  grouped.forEach((group) => {
    // 1. Calculate Gap
    const startTimeResult = group.time;
    let gap = startTimeResult - lastTimeEnd;
    if (gap < 0) gap = 0;

    // 2. Check Hierarchy: Newline > Space > Glue
    const measureIndex = Math.floor(group.time / measureDuration);
    let forceNewline = measureIndex > currentMeasure || gap >= (subBeatDuration * 2.0);
    let forceSpace = gap >= (subBeatDuration * 0.5);
    let canGlue = gap < (subBeatDuration * 0.25) && currentChain < 8;

    // 3. Apply Structure
    if (forceNewline) {
      if (currentBlock) notation += currentBlock;
      notation += '\n'; // Double newline or single? User says "Un Salto de Línea"
      currentBlock = '';
      currentChain = 0;
      currentMeasure = measureIndex;
    } else if (forceSpace || !canGlue) {
      // Standard spacing
      if (currentBlock) {
        notation += currentBlock;
        currentBlock = '';
        currentChain = 0;
      }

      // Add spaces based on gap resolution (0.25 units)
      const resolution = subBeatDuration / 4;
      const unitsSkipped = Math.round(gap / resolution);

      if (notation.length > 0 && !notation.endsWith('\n')) {
        // Add at least one space if not gluing, up to unitsSkipped
        for (let i = 0; i < Math.max(1, unitsSkipped); i++) {
          notation += ' ';
        }
      }
    }

    // 4. Generate Token for current group
    let token = '';
    if (group.notes.length > 1) {
      const chord = group.notes.map(n => {
        const key = kalimbaKeys.find(k => k.index === n.keyIndex);
        return key ? key.displayDegree : '?';
      }).filter(Boolean);
      token = `(${chord.join(' ')})`;
    } else {
      const key = kalimbaKeys.find(k => k.index === group.notes[0].keyIndex);
      token = key ? key.displayDegree : '?';
    }

    currentBlock += token;
    currentChain++;

    // Advance lastTimeEnd
    // A token takes 0.25 by convention in our resolution
    lastTimeEnd = group.time + (subBeatDuration / 4);
  });

  if (currentBlock) notation += currentBlock;

  // Cleanup cleanup: trim and normalize
  return notation.trim().replace(/[ \t]+\n/g, '\n').replace(/\n\n+/g, '\n\n');
};

export const exportSongToJSON = (song: Song): string => JSON.stringify(song, null, 2);

export const importSongFromJSON = (json: string): Song | null => {
  try {
    const parsed = JSON.parse(json);
    if (!parsed.id || !parsed.title || !parsed.bpm || !Array.isArray(parsed.notes)) return null;
    return parsed as Song;
  } catch { return null; }
};
