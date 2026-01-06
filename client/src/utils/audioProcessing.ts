import {
    BasicPitch,
    noteFramesToTime,
    addPitchBendsToNoteEvents,
    outputToNotesPoly
} from '@spotify/basic-pitch';
import { AudioContext } from 'standardized-audio-context';
import { KALIMBA_KEYS } from './frequencyMap';
import type { SongNote } from '@/types/game';

// Map Kalimba Keys to MIDI Note Numbers for fast lookup
const KEY_MIDI_MAP = new Map<number, number>(); // MIDI Note -> Key Index

KALIMBA_KEYS.forEach(key => {
    // Calculate MIDI note from frequency
    const semitones = 12 * Math.log2(key.frequency / 440);
    const midiNote = Math.round(69 + semitones);
    KEY_MIDI_MAP.set(midiNote, key.index);
});

export interface TranscriptionOptions {
    bpm?: number;
    onsetThreshold?: number; // 0.0 to 1.0 (default 0.5)
    frameThreshold?: number; // 0.0 to 1.0 (default 0.3)
    minNoteLen?: number; // in frames (default 1)
    transpose?: number; // semitones (default 0)
}

export const transcribeAudioFile = async (
    file: File,
    options: TranscriptionOptions = {},
    onProgress?: (percent: number) => void
): Promise<SongNote[]> => {
    const bpm = options.bpm || 120;
    const onsetThreshold = options.onsetThreshold || 0.5;
    const frameThreshold = options.frameThreshold || 0.3;
    const minNoteLen = options.minNoteLen || 2; // Default to ~2 frames (~23ms) to avoid single-frame blips
    const transpose = options.transpose || 0;

    // 1. Create AudioContext and Decode Audio
    const audioContext = new AudioContext();
    const arrayBuffer = await file.arrayBuffer();
    const originalBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // 2. Resample to 22050Hz AND Downmix to Mono (Required by Basic Pitch)
    let audioBuffer = originalBuffer;
    if (originalBuffer.sampleRate !== 22050 || originalBuffer.numberOfChannels > 1) {
        const targetSampleRate = 22050;
        // Calculate new length based on ratio
        const ratio = targetSampleRate / originalBuffer.sampleRate;
        const newLength = Math.ceil(originalBuffer.length * ratio);

        // Create 1-channel (Mono) OfflineAudioContext
        const offlineCtx = new OfflineAudioContext(
            1,
            newLength,
            targetSampleRate
        );

        const source = offlineCtx.createBufferSource();
        source.buffer = originalBuffer;
        source.connect(offlineCtx.destination);
        source.start();

        audioBuffer = await offlineCtx.startRendering();
    }

    // 3. Initialize Model
    // Using unpkg CDN for the model file to avoid local path resolution issues in client
    const basicPitch = new BasicPitch('https://unpkg.com/@spotify/basic-pitch@1.0.1/model/model.json');

    // 4. Run Inference
    const frames: number[][] = [];
    const onsets: number[][] = [];
    const contours: number[][] = [];

    await basicPitch.evaluateModel(
        audioBuffer as unknown as AudioBuffer,
        (f: number[][], o: number[][], c: number[][]) => {
            frames.push(...f);
            onsets.push(...o);
            contours.push(...c);
        },
        (percent: number) => {
            if (onProgress) onProgress(percent * 100);
        }
    );

    // 5. Post-processing to get Notes
    // basic-pitch provided utilities
    const notes = noteFramesToTime(
        addPitchBendsToNoteEvents(
            contours,
            outputToNotesPoly(frames, onsets, onsetThreshold, frameThreshold, minNoteLen),
        )
    );

    // 5. Convert to Kalimba SongNotes
    const songNotes: SongNote[] = [];
    const beatsPerSecond = bpm / 60;

    // Grid for quantization (1/16th note = 0.25 beats)
    const grid = 0.25;

    notes.forEach(note => {
        const midiNote = Math.round(note.pitchMidi) + transpose;
        let keyIndex = KEY_MIDI_MAP.get(midiNote);

        // Fallback: Find closest key ONLY if very close (tuning handling)
        // We won't force-map random notes.
        if (keyIndex === undefined) {
            let closestDist = Infinity;
            let closestIndex = -1;

            KALIMBA_KEYS.forEach(k => {
                const kMidi = Math.round(69 + 12 * Math.log2(k.frequency / 440));
                const dist = Math.abs(kMidi - midiNote);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestIndex = k.index;
                }
            });

            // Strict tolerance: Only map if within 0.7 semitone
            // This avoids mapping widely wrong notes to the Kalimba
            if (closestDist <= 0.7) {
                keyIndex = closestIndex;
            }
        }

        if (keyIndex !== undefined) {
            const startBeat = note.startTimeSeconds * beatsPerSecond;
            const durationBeats = note.durationSeconds * beatsPerSecond;

            // Quantize
            const quantizedStart = Math.round(startBeat / grid) * grid;
            const quantizedDuration = Math.max(grid, Math.round(durationBeats / grid) * grid);

            songNotes.push({
                keyIndex: keyIndex,
                time: quantizedStart,
                duration: quantizedDuration,
                id: `auto_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
            });
        }
    });

    // Sort by time
    songNotes.sort((a, b) => a.time - b.time);

    return songNotes;
}
