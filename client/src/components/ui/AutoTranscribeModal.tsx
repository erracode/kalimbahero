import { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Music, AlertCircle, Wand2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from './input';
import { transcribeAudioFile } from '@/utils/audioProcessing';
import { cn } from '@/lib/utils';
import type { SongNote } from '@/types/game';

interface AutoTranscribeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTranscribeComplete: (notes: SongNote[], bpm: number, mode: 'overwrite' | 'merge') => void;
    gridStep: number;
    // Current builder config
    config: {
        tinesCount: number;
        tuning: string;
        scale: string;
    };
}

export const AutoTranscribeModal: React.FC<AutoTranscribeModalProps> = ({
    isOpen,
    onClose,
    onTranscribeComplete,
    gridStep,
    config,
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [bpm, setBpm] = useState(120);
    const [insertionMode, setInsertionMode] = useState<'overwrite' | 'merge'>('merge');

    // Defaults based on Official Demo & Spotify Optimal Settings
    const [onsetThreshold, setOnsetThreshold] = useState(0.50);
    const [frameThreshold, setFrameThreshold] = useState(0.30);
    const [minNoteLen, setMinNoteLen] = useState(58); // ms (5 frames * ~11.6ms)
    const [transpose, setTranspose] = useState(0);

    const [transcriptionResult, setTranscriptionResult] = useState<{
        notes: SongNote[];
        stats: { rawNotesCount: number; averageConfidence: number; needsTuning: boolean };
    } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setTranscriptionResult(null);
        }
    };

    const handleTranscribe = async () => {
        if (!file) return;

        setIsProcessing(true);
        setProgress(0);
        setError(null);
        setTranscriptionResult(null);

        try {
            // Convert ms to approx frames (1 frame ~ 11ms @ 22050Hz)
            const minNoteFrames = Math.max(1, Math.round(minNoteLen / 11));

            const result = await transcribeAudioFile(
                file,
                gridStep,
                {
                    bpm: bpm,
                    onsetThreshold: onsetThreshold,
                    frameThreshold: frameThreshold,
                    minNoteLen: minNoteFrames,
                    transpose: transpose,
                    // Pass dynamic config from builder
                    tinesCount: config.tinesCount,
                    tuning: config.tuning,
                    scale: config.scale,
                },
                (p: number) => setProgress(Math.round(p))
            );

            if (result.notes.length === 0) {
                setError("No notes detected by AI. Try increasing sensitivity (Model Confidence) or check if the instrument is tuned.");
            } else {
                setTranscriptionResult(result);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to transcribe audio. Check console for details.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleApply = () => {
        if (transcriptionResult) {
            onTranscribeComplete(transcriptionResult.notes, bpm, insertionMode);
            onClose();
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!open && !isProcessing) {
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md bg-black/80 backdrop-blur-xl border-white/10 text-white shadow-2xl skew-x-0 rounded-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl font-black italic uppercase tracking-tighter">
                        <Wand2 className="w-6 h-6 text-purple-400" />
                        AUTO-TRANSCRIBE
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {transcriptionResult ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-6"
                        >
                            {/* Result Summary */}
                            <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-cyan-400">Transcription Result</h3>
                                    <span className="text-xs font-mono bg-cyan-500/20 px-2 py-0.5 rounded text-cyan-400">Score: {transcriptionResult.stats.averageConfidence}%</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-medium">
                                    <span className="text-cyan-50/90 italic">
                                        Transcription complete: {transcriptionResult.notes.length} notes added.
                                    </span>
                                    <span className="text-[10px] text-white/40">Raw detected: {transcriptionResult.stats.rawNotesCount}</span>
                                </div>
                            </div>

                            {/* Accuracy Warning */}
                            {transcriptionResult.stats.needsTuning && (
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                                    <div className="text-[11px] text-amber-200/80 leading-relaxed">
                                        <p className="font-bold text-amber-400 mb-1 uppercase tracking-tighter italic flex items-center gap-1">
                                            ⚠️ Notes adjusted:
                                        </p>
                                        The audio tuning doesn't fully match your Kalimba. If it sounds off, try adjusting the Transpose or changing the Scale.
                                    </div>
                                </div>
                            )}

                            {/* Recommendations */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 px-1">Next Steps</h4>
                                <ul className="space-y-2">
                                    <li className="flex items-start gap-2 text-[11px] text-white/60 bg-white/5 p-2 rounded-lg border border-white/5 italic font-medium">
                                        <span className="text-cyan-400 mt-0.5">•</span>
                                        1. Verify the BPM (current: {bpm}).
                                    </li>
                                    <li className="flex items-start gap-2 text-[11px] text-white/60 bg-white/5 p-2 rounded-lg border border-white/5 italic font-medium">
                                        <span className="text-purple-400 mt-0.5">•</span>
                                        2. Try Transpose if notes are shifted.
                                    </li>
                                    <li className="flex items-start gap-2 text-[11px] text-white/60 bg-white/5 p-2 rounded-lg border border-white/5 italic font-medium">
                                        <span className="text-pink-400 mt-0.5">•</span>
                                        3. Use 1/32 Grid for fast passages.
                                    </li>
                                </ul>
                            </div>

                            <button
                                onClick={() => setTranscriptionResult(null)}
                                className="w-full text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors py-2"
                            >
                                ← Upload another file
                            </button>
                        </motion.div>
                    ) : (
                        <>
                            {/* File Upload Area */}
                            <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center bg-white/5 hover:bg-white/10 transition-colors relative group">
                                <input
                                    type="file"
                                    accept="audio/mp3,audio/wav,audio/mpeg"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    disabled={isProcessing}
                                />

                                {file ? (
                                    <div className="text-cyan-400 font-bold flex flex-col items-center group-hover:scale-105 transition-transform">
                                        <Music className="w-10 h-10 mb-2" />
                                        {file.name}
                                    </div>
                                ) : (
                                    <div className="text-white/50 flex flex-col items-center group-hover:text-white/80 transition-colors">
                                        <Upload className="w-10 h-10 mb-2" />
                                        <p>Drop MP3/WAV here or click to upload</p>
                                    </div>
                                )}
                            </div>

                            {/* Insertion Mode Toggle */}
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                                <div className="space-y-0.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-pink-400">Insertion Mode</label>
                                    <p className="text-[10px] text-white/40">Overwrite grid or merge with existing notes</p>
                                </div>
                                <div className="flex p-1 bg-black/40 rounded-lg border border-white/5">
                                    <button
                                        onClick={() => setInsertionMode('overwrite')}
                                        className={cn(
                                            "px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all",
                                            insertionMode === 'overwrite' ? "bg-pink-600 text-white shadow-lg" : "text-white/40 hover:text-white"
                                        )}
                                    >
                                        Overwrite
                                    </button>
                                    <button
                                        onClick={() => setInsertionMode('merge')}
                                        className={cn(
                                            "px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all",
                                            insertionMode === 'merge' ? "bg-cyan-600 text-white shadow-lg" : "text-white/40 hover:text-white"
                                        )}
                                    >
                                        Merge
                                    </button>
                                </div>
                            </div>

                            {/* Settings */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1">Target BPM</label>
                                    <Input
                                        type="number"
                                        value={bpm}
                                        onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
                                        className="bg-white/5 border-white/10 text-white focus:border-purple-500/50"
                                        min={40}
                                        max={300}
                                        disabled={isProcessing}
                                    />
                                    <p className="text-[10px] text-white/40 mt-1">
                                        Helps align notes to the grid. Use the song's actual BPM for best results.
                                    </p>
                                </div>

                                {/* Transpose */}
                                <div>
                                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-white/60 mb-1">
                                        <label>Transpose (Semitones)</label>
                                        <span className="text-cyan-400">{transpose > 0 ? '+' : ''}{transpose}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="-12"
                                            max="12"
                                            step="1"
                                            value={transpose}
                                            onChange={(e) => setTranspose(parseInt(e.target.value))}
                                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                            disabled={isProcessing}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setTranspose(0)}
                                            className="text-[10px] uppercase font-bold text-white/40 hover:text-white px-2 py-1 bg-white/5 hover:bg-white/10 rounded transition-colors"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                </div>

                                {/* Advanced Controls */}
                                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-white/80 mb-4 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                        Fine Tuning
                                    </h4>

                                    <div className="space-y-6">
                                        {/* Note Segmentation (Onset Threshold) */}
                                        <div>
                                            <div className="flex justify-between text-xs text-white/60 mb-2">
                                                <label>Note Segmentation (Onset Threshold)</label>
                                                <span className="font-mono text-purple-400">{Math.round(onsetThreshold * 100)}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="10"
                                                max="90"
                                                value={onsetThreshold * 100}
                                                onChange={(e) => setOnsetThreshold(parseInt(e.target.value) / 100)}
                                                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                                disabled={isProcessing}
                                            />
                                            <div className="flex justify-between text-[10px] uppercase font-bold text-white/30 px-1 mt-1">
                                                <span>Split Notes (0.1)</span>
                                                <span>Merge Notes (0.9)</span>
                                            </div>
                                        </div>

                                        {/* Model Confidence (Frame Threshold) */}
                                        <div>
                                            <div className="flex justify-between text-xs text-white/60 mb-2">
                                                <label>Model Confidence (Frame Threshold)</label>
                                                <span className="font-mono text-pink-400">{Math.round(frameThreshold * 100)}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="10"
                                                max="90"
                                                value={frameThreshold * 100}
                                                onChange={(e) => setFrameThreshold(parseInt(e.target.value) / 100)}
                                                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pink-500"
                                                disabled={isProcessing}
                                            />
                                            <div className="flex justify-between text-[10px] uppercase font-bold text-white/30 px-1 mt-1">
                                                <span>More Notes (0.1)</span>
                                                <span>Fewer Notes (0.9)</span>
                                            </div>
                                        </div>

                                        {/* Min Note Length */}
                                        <div>
                                            <div className="flex justify-between text-xs text-white/60 mb-2">
                                                <label>Min Note Length</label>
                                                <span className="font-mono text-cyan-400">{minNoteLen}ms</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="11"
                                                max="500"
                                                value={minNoteLen}
                                                onChange={(e) => setMinNoteLen(parseInt(e.target.value))}
                                                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                                disabled={isProcessing}
                                            />
                                            <div className="flex justify-between text-[10px] uppercase font-bold text-white/30 px-1 mt-1">
                                                <span>Short Notes</span>
                                                <span>Long Notes</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            {isProcessing && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-white/60">
                                        <span>Processing AI Model...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <DialogFooter className="sm:justify-end gap-2">
                    <button
                        onClick={onClose}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    {transcriptionResult ? (
                        <button
                            onClick={handleApply}
                            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition-all border border-cyan-400/30"
                        >
                            <Music className="w-4 h-4" />
                            Apply Notes
                        </button>
                    ) : (
                        <button
                            onClick={handleTranscribe}
                            disabled={!file || isProcessing}
                            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-sm font-bold uppercase tracking-wider shadow-lg hover:shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Wand2 className="w-4 h-4" />
                            {isProcessing ? "Transcribing..." : "Transcribe"}
                        </button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
