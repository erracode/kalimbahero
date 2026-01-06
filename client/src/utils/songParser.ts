// ============================================
// Kalimba Hero - Song Parser
// ============================================
// Parses standard kalimba tablature notation
// 
// Notation format (standard kalimba tabs):
// - Numbers 1-7 represent scale degrees (Do Re Mi Fa Sol La Si)
// - ° or * or ' after number = one octave up (e.g., 1° or 1*)
// - °° or ** or '' = two octaves up
// - Spaces separate sequential notes
// - Newlines separate measures/phrases
// - Notes on same line without spaces = quick succession
// - Parentheses group simultaneous notes (chords): (1 3 5)

import type { Song, SongNote, Difficulty, TimeSignature } from '@/types/game';
import { NOTATION_TO_KEY_INDEX, parseScaleNotation, findKeyByScaleNotation } from './frequencyMap';

// Generate unique ID
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};

interface ParseOptions {
  bpm: number;
  timeSignature?: TimeSignature; // Used to determine grid division
  beatDuration?: number;  // Duration per beat in beats (default: 1/gridDivision)
  restSymbol?: string;    // Symbol for rests (default '-' or '_')
}

// Convert beats to seconds
const beatsToSeconds = (beats: number, bpm: number): number => {
  return (beats * 60) / bpm;
};

// Parse a single note token (e.g., "1", "1°", "1*", "5°°")
const parseNoteToken = (token: string): number | null => {
  const trimmed = token.trim();
  if (!trimmed) return null;

  // Check for rest symbols
  if (trimmed === '-' || trimmed === '_' || trimmed === 'r' || trimmed === 'R') {
    return -1; // -1 indicates rest
  }

  // Normalize octave markers: convert * to °, ' to °
  let normalized = trimmed
    .replace(/\*\*/g, '°°')
    .replace(/\*/g, '°')
    .replace(/''/g, '°°')
    .replace(/'/g, '°');

  // Try to find in our lookup map
  const keyIndex = NOTATION_TO_KEY_INDEX.get(normalized);
  if (keyIndex !== undefined) {
    return keyIndex;
  }

  // Try parsing as scale notation
  const notation = parseScaleNotation(normalized);
  if (notation) {
    const index = findKeyByScaleNotation(notation);
    if (index !== null) {
      return index;
    }
  }

  // Fallback: try parsing as simple number (1-7 with no octave marker)
  const simpleMatch = normalized.match(/^(\d)$/);
  if (simpleMatch) {
    const degree = parseInt(simpleMatch[1]);
    if (degree >= 1 && degree <= 7) {
      // Find the base octave version (center of kalimba)
      const baseIndex = NOTATION_TO_KEY_INDEX.get(`${degree}`);
      if (baseIndex !== undefined) {
        return baseIndex;
      }
    }
  }

  return null;
};

// Parse a line of tablature - only supports explicit parentheses chords
// Numbers without parentheses are treated as individual notes, not compact chords
const parseLine = (line: string): string[] => {
  const tokens: string[] = [];
  let current = '';
  let inChord = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '(') {
      if (current.trim()) {
        // Push any accumulated token before starting chord
        tokens.push(current.trim());
        current = '';
      }
      inChord = true;
      current = '(';
    } else if (char === ')') {
      current += ')';
      tokens.push(current);
      current = '';
      inChord = false;
    } else if (char === ' ' || char === '\t') {
      if (inChord) {
        current += ' ';
      } else if (current.trim()) {
        // Push token as-is (no compact chord detection)
        tokens.push(current.trim());
        current = '';
      }
    } else {
      current += char;
    }
  }

  // Handle remaining token
  if (current.trim()) {
    tokens.push(current.trim());
  }

  return tokens;
};

// Detect and convert compact chords like "135" or "461'" to "(1 3 5)" or "(4 6 1')"
const detectCompactChord = (token: string): string | null => {
  // Must start with a number 1-7
  if (!/^[1-7]/.test(token)) return null;

  // Find all numbers in the token
  const numbers = token.match(/[1-7]/g);
  if (!numbers || numbers.length < 2) return null; // Must have at least 2 numbers

  // Split the token into individual notes with their octave markers
  const notes: string[] = [];
  let i = 0;

  while (i < token.length) {
    if (/[1-7]/.test(token[i])) {
      let note = token[i];
      i++;
      // Collect octave markers (*, °, ') that follow
      while (i < token.length && /[*°']/.test(token[i])) {
        note += token[i];
        i++;
      }
      notes.push(note);
    } else {
      i++;
    }
  }

  // Only treat as chord if we found multiple distinct notes
  if (notes.length >= 2) {
    return `(${notes.join(' ')})`;
  }

  return null;
};

export const parseSongNotation = (
  notation: string,
  options: ParseOptions
): SongNote[] => {
  const { bpm, timeSignature = '4/4' } = options;
  // Use sub-beat grid based on time signature denominator (matching ChartEditor)
  const gridDivision = parseInt(timeSignature.split('/')[1]);
  const subBeatDuration = 1 / gridDivision; // Duration per grid cell in beats
  const beatDuration = options.beatDuration ?? subBeatDuration;
  const notes: SongNote[] = [];
  let currentTime = 0;

  // Split by lines first
  const lines = notation.split(/\n/);

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) {
      continue;
    }

    // Parse tokens from the line
    // In kalimbatabs.net style: each token separated by space = one beat
    // Tokens without spaces like "467" = multiple notes in consecutive beats (one per beat)
    const tokens = parseLine(line);

    for (const token of tokens) {
      // Check for chord (simultaneous notes in parentheses)
      if (token.startsWith('(') && token.endsWith(')')) {
        // Chord: all notes at the same time (same beat)
        const chordContent = token.slice(1, -1);
        // Support both "(2 4)" spaced and "(24)" compact formats
        let chordNotes: string[];
        if (chordContent.includes(' ')) {
          // Spaced format: "(2 4)" or "(3° 1°)"
          chordNotes = chordContent.split(/\s+/).filter(Boolean);
        } else {
          // Compact format: "(24)" or "(24°)" - split into individual notes
          chordNotes = [];
          let i = 0;
          while (i < chordContent.length) {
            if (/[1-7]/.test(chordContent[i])) {
              let note = chordContent[i];
              i++;
              // Collect octave markers (*, °, ') that follow
              while (i < chordContent.length && /[°*']/.test(chordContent[i])) {
                note += chordContent[i];
                i++;
              }
              chordNotes.push(note);
            } else {
              i++;
            }
          }
        }

        for (const noteStr of chordNotes) {
          const keyIndex = parseNoteToken(noteStr);
          if (keyIndex !== null && keyIndex >= 0) {
            notes.push({
              id: generateId(),
              keyIndex,
              time: currentTime, // All notes at same time
              duration: beatsToSeconds(beatDuration, bpm),
            });
          }
        }
        // Advance one beat after chord
        currentTime += beatsToSeconds(beatDuration, bpm);
      } else {
        // Sequential notes: check if token has multiple numbers (like "467")
        const multiNumberMatch = token.match(/^([1-7][°*']*)+$/);

        if (multiNumberMatch && token.length > 1) {
          // Token like "467" or "4673°2" - split into individual notes
          // Each note goes to its own beat (consecutive beats)
          const noteTokens: string[] = [];
          let i = 0;
          while (i < token.length) {
            if (/[1-7]/.test(token[i])) {
              let note = token[i];
              i++;
              // Collect octave markers
              while (i < token.length && /[°*']/.test(token[i])) {
                note += token[i];
                i++;
              }
              noteTokens.push(note);
            } else {
              i++;
            }
          }

          // Each note gets its own beat (sequential)
          for (const noteToken of noteTokens) {
            const keyIndex = parseNoteToken(noteToken);
            if (keyIndex !== null && keyIndex >= 0) {
              notes.push({
                id: generateId(),
                keyIndex,
                time: currentTime, // Each note in its own beat
                duration: beatsToSeconds(beatDuration, bpm),
              });
              currentTime += beatsToSeconds(beatDuration, bpm);
            }
          }
        } else {
          // Single note token (from "4 6 7" format) - one beat
          const keyIndex = parseNoteToken(token);

          if (keyIndex === -1) {
            // Rest - just advance time
            currentTime += beatsToSeconds(beatDuration, bpm);
          } else if (keyIndex !== null && keyIndex >= 0) {
            notes.push({
              id: generateId(),
              keyIndex,
              time: currentTime,
              duration: beatsToSeconds(beatDuration, bpm),
            });
            currentTime += beatsToSeconds(beatDuration, bpm);
          }
        }
      }
    }
  }

  return notes;
};

// Create a Song object from notation
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
  }
): Song => {
  const notes = parseSongNotation(notation, { bpm: metadata.bpm, timeSignature: metadata.timeSignature });
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
    createdAt: Date.now(),
  };
};

// Reverse mapping: keyIndex to notation string
const KEY_INDEX_TO_NOTATION = new Map<number, string>();
KEY_INDEX_TO_NOTATION.set(12, '1');   // C
KEY_INDEX_TO_NOTATION.set(7, '2');    // D
KEY_INDEX_TO_NOTATION.set(13, '3');   // E
KEY_INDEX_TO_NOTATION.set(6, '4');    // F
KEY_INDEX_TO_NOTATION.set(14, '5');   // G
KEY_INDEX_TO_NOTATION.set(5, '6');    // A
KEY_INDEX_TO_NOTATION.set(15, '7');   // B
KEY_INDEX_TO_NOTATION.set(4, '1°');   // C°
KEY_INDEX_TO_NOTATION.set(16, '2°');  // D°
KEY_INDEX_TO_NOTATION.set(3, '3°');   // E°
KEY_INDEX_TO_NOTATION.set(10, '4°');  // F° (center)
KEY_INDEX_TO_NOTATION.set(9, '5°');   // G°
KEY_INDEX_TO_NOTATION.set(11, '6°');  // A°
KEY_INDEX_TO_NOTATION.set(1, '7°');   // B°
KEY_INDEX_TO_NOTATION.set(19, '1°°'); // C°°
KEY_INDEX_TO_NOTATION.set(0, '2°');   // D° (left outer)
KEY_INDEX_TO_NOTATION.set(20, '3°°'); // E°°
KEY_INDEX_TO_NOTATION.set(17, '4°');  // F°
KEY_INDEX_TO_NOTATION.set(2, '5°');   // G°
KEY_INDEX_TO_NOTATION.set(18, '6°');  // A°
KEY_INDEX_TO_NOTATION.set(8, '7°');   // B

// Convert notes array back to tab notation string
// Follows kalimbatabs.net format: notes separated by spaces on same line, new lines based on time signature
export const notesToNotation = (notes: SongNote[], bpm: number, timeSignature: TimeSignature = '4/4'): string => {
  if (notes.length === 0) return '';

  const beatDuration = 60 / bpm;
  // Use sub-beat grid based on time signature denominator (matching ChartEditor)
  const gridDivision = parseInt(timeSignature.split('/')[1]);
  const subBeatDuration = beatDuration / gridDivision;

  // Sort by time, but preserve original order for notes at same time
  const sortedNotes = [...notes].sort((a, b) => {
    const timeDiff = a.time - b.time;
    if (Math.abs(timeDiff) < 0.001) {
      // Same time - preserve original order by using chordGroup or index
      return (a.chordGroup || 0) - (b.chordGroup || 0);
    }
    return timeDiff;
  });

  // Group notes by sub-beat (matching ChartEditor grid)
  // Notes at the same sub-beat (within a small threshold) are chords
  const beatThreshold = subBeatDuration * 0.1; // 10% of a sub-beat
  const grouped: { time: number; notes: SongNote[] }[] = [];

  sortedNotes.forEach(note => {
    const lastGroup = grouped[grouped.length - 1];
    // Group notes that are in the same sub-beat (chords)
    if (lastGroup && Math.abs(note.time - lastGroup.time) < beatThreshold) {
      // Add to existing sub-beat group (chord)
      lastGroup.notes.push(note);
    } else {
      // New sub-beat (sequential note or new chord starting)
      grouped.push({ time: note.time, notes: [note] });
    }
  });

  // Convert to notation - each sub-beat = one notation element
  // Group into lines based on time signature (measures)
  const beatsPerMeasure = parseInt(timeSignature.split('/')[0]);
  const measureDuration = beatsPerMeasure * beatDuration;

  const lines: string[] = [];
  let currentLine: string[] = [];
  let currentNoteGroup: string[] = []; // Group consecutive single notes
  let lastBeatIndex = -1;
  let lastMeasureNumber = -1;

  grouped.forEach((group) => {
    const { time, notes: groupNotes } = group;

    // Calculate which sub-beat this is (0, 1, 2, ...) using sub-beat grid
    const beatIndex = Math.round(time / subBeatDuration);
    const measureNumber = Math.floor(time / measureDuration);

    // Start new line for new measure
    if (measureNumber !== lastMeasureNumber && lastMeasureNumber >= 0 && currentLine.length > 0) {
      // Close any pending note group
      if (currentNoteGroup.length > 0) {
        currentLine.push(currentNoteGroup.join(''));
        currentNoteGroup = [];
      }
      lines.push(currentLine.join(' '));
      currentLine = [];
    }

    // Check if this is a consecutive beat (for grouping single notes)
    const isConsecutiveBeat = lastBeatIndex >= 0 && beatIndex === lastBeatIndex + 1;
    const isChord = groupNotes.length > 1;

    // Convert notes in this beat to notation
    if (isChord) {
      // Close current note group if exists, add chord
      if (currentNoteGroup.length > 0) {
        currentLine.push(currentNoteGroup.join(''));
        currentNoteGroup = [];
      }
      // Chord: multiple notes at same beat (in parentheses)
      const sortedChordNotes = [...groupNotes].sort((a, b) => a.keyIndex - b.keyIndex);
      const chordNotes = sortedChordNotes
        .map(n => KEY_INDEX_TO_NOTATION.get(n.keyIndex))
        .filter(Boolean);
      if (chordNotes.length > 0) {
        currentLine.push(`(${chordNotes.join(' ')})`);
      }
    } else if (groupNotes.length === 1) {
      // Single note - always separate with spaces (no compact grouping)
      const noteNotation = KEY_INDEX_TO_NOTATION.get(groupNotes[0].keyIndex);
      if (noteNotation) {
        // Close previous group if exists
        if (currentNoteGroup.length > 0) {
          currentLine.push(currentNoteGroup.join(''));
          currentNoteGroup = [];
        }
        // Add as individual note (with space separation)
        currentLine.push(noteNotation);
      }
    }

    lastBeatIndex = beatIndex;
    lastMeasureNumber = measureNumber;
  });

  // Close any remaining note group
  if (currentNoteGroup.length > 0) {
    currentLine.push(currentNoteGroup.join(''));
  }

  // Add remaining line
  if (currentLine.length > 0) {
    lines.push(currentLine.join(' '));
  }

  // Return with line breaks (like kalimbatabs.net format)
  return lines.join('\n');
};

// Export song to JSON
export const exportSongToJSON = (song: Song): string => {
  return JSON.stringify(song, null, 2);
};

// Import song from JSON
export const importSongFromJSON = (json: string): Song | null => {
  try {
    const parsed = JSON.parse(json);
    if (!parsed.id || !parsed.title || !parsed.bpm || !Array.isArray(parsed.notes)) {
      throw new Error('Invalid song format');
    }
    return parsed as Song;
  } catch (error) {
    console.error('Failed to parse song JSON:', error);
    return null;
  }
};
