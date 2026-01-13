import {
    BasicPitch,
    noteFramesToTime,
    addPitchBendsToNoteEvents,
    outputToNotesPoly
} from '@spotify/basic-pitch';
import { OfflineAudioContext } from 'standardized-audio-context';
import { generateKalimbaLayout } from './frequencyMap';
import type { SongNote } from '@/types/game';

export interface TranscriptionOptions {
    bpm?: number;
    onsetThreshold?: number; // 0.0 to 1.0
    frameThreshold?: number; // 0.0 to 1.0
    minNoteLen?: number;     // En frames (Recomendado: 5)
    transpose?: number;      // Semitonos
    tinesCount?: number;
    tuning?: string;
    scale?: string;
}

export interface TranscriptionResult {
    notes: SongNote[];
    stats: {
        rawNotesCount: number;
        averageConfidence: number;
        needsTuning: boolean;
    };
}

const generateTransId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `trans_${timestamp}_${random}`;
};

export const transcribeAudioFile = async (
    file: File,
    gridStep: number,
    options: TranscriptionOptions = {},
    onProgress?: (percent: number) => void
): Promise<TranscriptionResult> => {
    const bpm = options.bpm || 120;

    // Valores de la demo oficial que funcionaron con tu archivo
    const onsetThreshold = options.onsetThreshold ?? 0.50;
    const frameThreshold = options.frameThreshold ?? 0.30;
    const minNoteLen = options.minNoteLen ?? 5; // 5 frames es el estándar de la doc
    const transpose = options.transpose || 0;

    const kalimbaKeys = generateKalimbaLayout(
        options.tinesCount || 17,
        options.tuning || 'C',
        options.scale || 'Major',
        4 // Default root octave
    );

    console.log('[Transcription] Kalimba config:', {
        tinesCount: options.tinesCount || 17,
        tuning: options.tuning || 'C',
        scale: options.scale || 'Major',
        keysGenerated: kalimbaKeys.length,
        frequencyRange: kalimbaKeys.length > 0
            ? `${kalimbaKeys[0]?.frequency?.toFixed(1)}Hz - ${kalimbaKeys[kalimbaKeys.length - 1]?.frequency?.toFixed(1)}Hz`
            : 'N/A'
    });

    // 1. Decodificación inicial (esto nos da el audio a 44.1k o 48k)
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const originalBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // 2. RESAMPLEADO FORZADO A 22050 Hz (Solución al error de Sample Rate)
    // El modelo de Spotify requiere estrictamente 22050
    const targetSampleRate = 22050;
    const offlineCtx = new OfflineAudioContext(
        1,
        Math.ceil(originalBuffer.duration * targetSampleRate),
        targetSampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = originalBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    // Este buffer estará garantizado a 22050 Hz
    const resampledBuffer = await offlineCtx.startRendering();

    // Extract raw Float32Array - this bypasses AudioBuffer type compatibility issues
    // between standardized-audio-context and Basic Pitch's expected types
    const monoAudioData = resampledBuffer.getChannelData(0);

    console.log('[Transcription] Audio prepared:', {
        originalSampleRate: originalBuffer.sampleRate,
        originalDuration: originalBuffer.duration,
        resampledLength: monoAudioData.length,
        resampledDuration: monoAudioData.length / targetSampleRate,
        maxAmplitude: Math.max(...Array.from(monoAudioData.slice(0, 10000)).map(Math.abs))
    });

    // 3. Inferencia con Basic Pitch
    const basicPitch = new BasicPitch('https://unpkg.com/@spotify/basic-pitch@1.0.1/model/model.json');
    const frames: number[][] = [];
    const onsets: number[][] = [];
    const contours: number[][] = [];

    // Pass Float32Array directly instead of AudioBuffer for better compatibility
    await basicPitch.evaluateModel(
        monoAudioData,
        (f, o, c) => {
            frames.push(...f);
            onsets.push(...o);
            contours.push(...c);
        },
        (p) => { if (onProgress) onProgress(p * 100); }
    );

    console.log('[Transcription] Model output:', {
        framesCount: frames.length,
        onsetsCount: onsets.length,
        contoursCount: contours.length,
        sampleFrameValues: frames.length > 0 ? Math.max(...frames[0]) : 'N/A'
    });

    // 4. Post-procesamiento (With Auto-Retry Logic)
    let rawNotes = outputToNotesPoly(frames, onsets, onsetThreshold, frameThreshold, minNoteLen);

    console.log('[Transcription] Initial note extraction:', {
        onsetThreshold,
        frameThreshold,
        minNoteLen,
        notesFound: rawNotes.length
    });

    // Auto-Retry: Si no se detectan notas, intentar con parámetros de captura de armónicos débiles
    if (rawNotes.length === 0) {
        console.warn("[Transcription] No notes detected. Retrying with fallback sensitivity (0.15/0.15/3)...");
        rawNotes = outputToNotesPoly(frames, onsets, 0.15, 0.15, 3);
        console.log('[Transcription] Fallback extraction result:', rawNotes.length, 'notes');
    }

    const notes = noteFramesToTime(addPitchBendsToNoteEvents(contours, rawNotes));

    console.log('[Transcription] Final notes after time conversion:', notes.length);

    if (notes.length === 0) {
        throw new Error("No notes detected by AI. Try increasing sensitivity (Model Confidence) or check if the instrument is tuned.");
    }

    // 5. Mapeo a Kalimba
    const songNotes: SongNote[] = [];
    let totalDev = 0;

    notes.forEach(note => {
        const pitchMidi = note.pitchMidi + transpose;
        const detectedFreq = 440 * Math.pow(2, (pitchMidi - 69) / 12);
        let minDiff = Infinity;
        let closestIdx = -1;

        kalimbaKeys.forEach(key => {
            const diff = Math.abs(1200 * Math.log2(detectedFreq / key.frequency));
            if (diff < minDiff) {
                minDiff = diff;
                closestIdx = key.index;
            }
        });

        if (closestIdx !== -1) {
            totalDev += minDiff;

            // ChartEditor expects time in SECONDS, not beats!
            // We need to quantize to grid intervals but keep output in seconds.
            // gridStep is fraction of a beat (e.g., 0.25 = quarter note)
            // Convert gridStep to seconds: gridStep * (60 / bpm)
            const gridStepInSeconds = gridStep * (60 / bpm);

            // Quantize the original seconds to the grid (in seconds)
            const qStartSeconds = Math.round(note.startTimeSeconds / gridStepInSeconds) * gridStepInSeconds;
            const qDurSeconds = Math.max(gridStepInSeconds, Math.round(note.durationSeconds / gridStepInSeconds) * gridStepInSeconds);

            songNotes.push({
                keyIndex: closestIdx,
                time: qStartSeconds,
                duration: qDurSeconds,
                id: generateTransId()
            });
        }
    });

    return {
        notes: songNotes.sort((a, b) => a.time - b.time),
        stats: {
            rawNotesCount: notes.length,
            averageConfidence: Math.max(0, Math.round(100 - (totalDev / (notes.length || 1)))),
            needsTuning: (totalDev / (notes.length || 1)) > 50
        }
    };
};
