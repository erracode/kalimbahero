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

import type { Song, SongNote } from '@/types/game';
import { NOTATION_TO_KEY_INDEX, parseScaleNotation, findKeyByScaleNotation } from './frequencyMap';

// Generate unique ID
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};

interface ParseOptions {
  bpm: number;
  beatDuration?: number;  // Duration per beat in beats (default 1)
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

// Parse a line of tablature - supports both parentheses chords and compact chords (e.g., "135")
const parseLine = (line: string): string[] => {
  const tokens: string[] = [];
  let current = '';
  let inChord = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '(') {
      if (current.trim()) {
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
        // Before pushing, check if current token is a compact chord (multiple numbers like "135")
        const compactChord = detectCompactChord(current.trim());
        if (compactChord) {
          tokens.push(compactChord);
        } else {
          tokens.push(current.trim());
        }
        current = '';
      }
    } else {
      current += char;
    }
  }
  
  // Handle remaining token
  if (current.trim()) {
    const compactChord = detectCompactChord(current.trim());
    if (compactChord) {
      tokens.push(compactChord);
    } else {
      tokens.push(current.trim());
    }
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

// Main parser function for kalimba tablature
export const parseSongNotation = (
  notation: string,
  options: ParseOptions
): SongNote[] => {
  const { bpm, beatDuration = 1 } = options;
  const notes: SongNote[] = [];
  let currentTime = 0;
  
  // Split by lines first
  const lines = notation.split(/\n/);
  
  for (const line of lines) {
    // Skip empty lines (but they act as a small pause)
    if (!line.trim()) {
      currentTime += beatsToSeconds(0.5, bpm); // Small pause between lines
      continue;
    }
    
    // Parse tokens from the line
    const tokens = parseLine(line);
    
    for (const token of tokens) {
      // Check for chord (simultaneous notes)
      if (token.startsWith('(') && token.endsWith(')')) {
        const chordContent = token.slice(1, -1);
        const chordNotes = chordContent.split(/\s+/).filter(Boolean);
        
        // All chord notes happen at the same time
        for (const noteStr of chordNotes) {
          const keyIndex = parseNoteToken(noteStr);
          if (keyIndex !== null && keyIndex >= 0) {
            notes.push({
              id: generateId(),
              keyIndex,
              time: currentTime,
              duration: beatsToSeconds(beatDuration, bpm),
            });
          }
        }
        currentTime += beatsToSeconds(beatDuration, bpm);
      } else {
        // Single note or rest
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
    
    // Small gap between lines (phrases)
    currentTime += beatsToSeconds(0.25, bpm);
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
    difficulty?: Song['difficulty'];
    icon?: string;
    iconColor?: string;
  }
): Song => {
  const notes = parseSongNotation(notation, { bpm: metadata.bpm });
  const duration = notes.length > 0 
    ? Math.max(...notes.map(n => n.time + n.duration)) + 2
    : 0;
  
  return {
    id: generateId(),
    title: metadata.title,
    artist: metadata.artist || 'Unknown',
    bpm: metadata.bpm,
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
export const notesToNotation = (notes: SongNote[], bpm: number): string => {
  if (notes.length === 0) return '';
  
  const beatDuration = 60 / bpm;
  const sortedNotes = [...notes].sort((a, b) => a.time - b.time);
  
  // Group notes by time (for chords)
  const grouped = new Map<number, SongNote[]>();
  sortedNotes.forEach(note => {
    const timeKey = Math.round(note.time / (beatDuration / 4)) * (beatDuration / 4);
    if (!grouped.has(timeKey)) {
      grouped.set(timeKey, []);
    }
    grouped.get(timeKey)!.push(note);
  });
  
  // Convert to notation lines
  const sortedTimes = Array.from(grouped.keys()).sort((a, b) => a - b);
  const notationParts: string[] = [];
  let currentLine: string[] = [];
  let lastTime = 0;
  
  sortedTimes.forEach((time, index) => {
    const notes = grouped.get(time)!;
    
    // Check if we should start a new line (every 4 beats or so)
    const beatsSinceStart = time / beatDuration;
    if (beatsSinceStart > 0 && beatsSinceStart % 4 < 0.1 && currentLine.length > 0) {
      notationParts.push(currentLine.join(' '));
      currentLine = [];
    }
    
    // Add rest if there's a significant gap
    const gap = time - lastTime;
    if (gap > beatDuration * 1.5 && index > 0) {
      const restCount = Math.round(gap / beatDuration);
      for (let i = 0; i < restCount - 1; i++) {
        currentLine.push('-');
      }
    }
    
    // Convert notes to notation
    if (notes.length === 1) {
      const notation = KEY_INDEX_TO_NOTATION.get(notes[0].keyIndex);
      if (notation) {
        currentLine.push(notation);
      }
    } else {
      // Chord
      const chordNotes = notes
        .map(n => KEY_INDEX_TO_NOTATION.get(n.keyIndex))
        .filter(Boolean);
      if (chordNotes.length > 0) {
        currentLine.push(`(${chordNotes.join(' ')})`);
      }
    }
    
    lastTime = time;
  });
  
  // Add remaining notes
  if (currentLine.length > 0) {
    notationParts.push(currentLine.join(' '));
  }
  
  return notationParts.join('\n');
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

// Example songs using standard kalimba notation
export const EXAMPLE_SONGS: Song[] = [
  createSongFromNotation(
    `1 1 5 5 6 6 5
4 4 3 3 2 2 1
5 5 4 4 3 3 2
5 5 4 4 3 3 2
1 1 5 5 6 6 5
4 4 3 3 2 2 1`,
    {
      title: 'Twinkle Twinkle',
      artist: 'Traditional',
      bpm: 90,
      difficulty: 'easy',
      icon: 'star',
      iconColor: '#FFD93D',
    }
  ),
  createSongFromNotation(
    `1 2 3 1
1 2 3 1
3 4 5
3 4 5
5 6 5 4 3 1
5 6 5 4 3 1
1 5 1
1 5 1`,
    {
      title: 'Frère Jacques',
      artist: 'Traditional',
      bpm: 100,
      difficulty: 'easy',
      icon: 'bell',
      iconColor: '#6BCB77',
    }
  ),
  createSongFromNotation(
    `3 2 1 2 3 3 3
2 2 2
3 5 5
3 2 1 2 3 3 3
3 2 2 3 2 1`,
    {
      title: 'Mary Had a Little Lamb',
      artist: 'Traditional',
      bpm: 100,
      difficulty: 'easy',
      icon: 'heart',
      iconColor: '#FF6B6B',
    }
  ),
  createSongFromNotation(
    `1° 7 6 5 4
5 6 1°
7 6 5 4 3
6 5 4 3 2
3 4 6
5 4 3 2 1
2 6 6
1° 7 5 1`,
    {
      title: 'Fly Me to the Moon',
      artist: 'Frank Sinatra',
      bpm: 85,
      difficulty: 'medium',
      icon: 'star',
      iconColor: '#9B59B6',
    }
  ),
];

// Create test song
export const createTestSong = (): Song => {
  return createSongFromNotation(
    `1 2 3 4 5 6 7
1° 2° 3° 4° 5° 6° 7°
7° 6° 5° 4° 3° 2° 1°
7 6 5 4 3 2 1`,
    {
      title: 'Scale Practice',
      artist: 'Kalimba Hero',
      bpm: 100,
      difficulty: 'easy',
      icon: 'music',
      iconColor: '#00E5FF',
    }
  );
};
