// ============================================
// Kalimba Hero - Audio Playback Utility
// ============================================
// Plays kalimba note sounds using Tone.js

import * as Tone from 'tone';
import { KALIMBA_KEYS } from './frequencyMap';

let synth: Tone.PolySynth<Tone.FMSynth> | null = null;
let isInitialized = false;

// Initialize the audio context and synth
export const initKalimbaAudio = async (): Promise<void> => {
  if (isInitialized && synth) return;
  
  try {
    // Start Tone.js audio context (requires user interaction)
    await Tone.start();
    
    // Create a polyphonic synth with FM synthesis to mimic kalimba timbre
    synth = new Tone.PolySynth(Tone.FMSynth, {
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.3,
        release: 0.8,
      },
      modulationIndex: 2,
      modulation: {
        type: 'sine',
      },
      modulationEnvelope: {
        attack: 0.1,
        decay: 0.3,
        sustain: 0.2,
        release: 0.4,
      },
    }).toDestination();
    
    // Set volume (increased for better audibility)
    synth.volume.value = 3;
    
    isInitialized = true;
  } catch (error) {
    console.error('Failed to initialize kalimba audio:', error);
    throw error;
  }
};

// Play a single note by key index
export const playNote = async (keyIndex: number, duration: number = 0.7): Promise<void> => {
  if (!isInitialized) {
    await initKalimbaAudio();
  }
  
  if (!synth) {
    console.warn('Synth not initialized');
    return;
  }
  
  const key = KALIMBA_KEYS[keyIndex];
  if (!key) {
    console.warn(`No key found for index ${keyIndex}`);
    return;
  }
  
  try {
    // Convert frequency to note name (e.g., "C4", "D5")
    const noteName = Tone.Frequency(key.frequency).toNote();
    synth.triggerAttackRelease(noteName, duration);
  } catch (error) {
    console.error(`Failed to play note at index ${keyIndex}:`, error);
  }
};

// Play multiple notes simultaneously (chord)
export const playChord = async (keyIndices: number[], duration: number = 0.7): Promise<void> => {
  if (!isInitialized) {
    await initKalimbaAudio();
  }
  
  if (!synth) {
    console.warn('Synth not initialized');
    return;
  }
  
  try {
    const noteNames = keyIndices
      .map(index => {
        const key = KALIMBA_KEYS[index];
        if (!key) return null;
        return Tone.Frequency(key.frequency).toNote();
      })
      .filter((note): note is string => note !== null);
    
    if (noteNames.length > 0) {
      synth.triggerAttackRelease(noteNames, duration);
    }
  } catch (error) {
    console.error('Failed to play chord:', error);
  }
};

// Parse notation string and play it
export const playNotation = async (notation: string): Promise<void> => {
  // This is a simple parser for single note or chord notation
  // For full parsing, use the songParser utility
  
  // Try to parse as a single note first (e.g., "1", "1°", "5*")
  // For now, we'll just extract the first valid note and play it
  // Full chord parsing would require the full parser
  
  console.warn('playNotation is not fully implemented - use playNote or playChord directly');
};

// Cleanup
export const disposeKalimbaAudio = (): void => {
  if (synth) {
    synth.dispose();
    synth = null;
    isInitialized = false;
  }
};


