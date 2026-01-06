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
import { NeonButton } from './NeonButton';
import { Input } from './input';
import { transcribeAudioFile } from '@/utils/audioProcessing';
import type { SongNote } from '@/types/game';

interface AutoTranscribeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTranscribeComplete: (notes: SongNote[], bpm: number) => void;
}

export const AutoTranscribeModal: React.FC<AutoTranscribeModalProps> = ({
    isOpen,
    onClose,
    onTranscribeComplete,
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [bpm, setBpm] = useState(120);
    // Defaults based on Basic Pitch Demo
    const [onsetThreshold, setOnsetThreshold] = useState(0.5);
    const [frameThreshold, setFrameThreshold] = useState(0.3);
    const [minNoteLen, setMinNoteLen] = useState(11); // ms
    const [transpose, setTranspose] = useState(0);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };

    const handleTranscribe = async () => {
        if (!file) return;

        setIsProcessing(true);
        setProgress(0);
        setError(null);

        try {
            // Convert ms to approx frames (1 frame ~ 11ms @ 22050Hz)
            const minNoteFrames = Math.max(1, Math.round(minNoteLen / 11));

            const notes = await transcribeAudioFile(
                file,
                {
                    bpm: bpm,
                    onsetThreshold: onsetThreshold,
                    frameThreshold: frameThreshold,
                    minNoteLen: minNoteFrames,
                    transpose: transpose
                },
                (p) => setProgress(Math.round(p))
            );

            if (notes.length === 0) {
                setError("No notes detected. Try a clearer audio file.");
            } else {
                onTranscribeComplete(notes, bpm);
                onClose();
            }
        } catch (err) {
            console.error(err);
            setError("Failed to transcribe audio. Check console for details.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!open && !isProcessing) {
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl font-black">
                        <Wand2 className="w-6 h-6 text-purple-400" />
                        AUTO-TRANSCRIBE
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* File Upload Area */}
                    <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center bg-white/5 hover:bg-white/10 transition-colors relative">
                        <input
                            type="file"
                            accept="audio/mp3,audio/wav,audio/mpeg"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={isProcessing}
                        />

                        {file ? (
                            <div className="text-cyan-400 font-bold flex flex-col items-center">
                                <Music className="w-10 h-10 mb-2" />
                                {file.name}
                            </div>
                        ) : (
                            <div className="text-white/50 flex flex-col items-center">
                                <Upload className="w-10 h-10 mb-2" />
                                <p>Drop MP3/WAV here or click to upload</p>
                            </div>
                        )}
                    </div>

                    {/* Settings */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-white/60 mb-1">Target BPM</label>
                            <Input
                                type="number"
                                value={bpm}
                                onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
                                className="bg-white/10 border-white/20 text-white"
                                min={40}
                                max={300}
                                disabled={isProcessing}
                            />
                            <p className="text-xs text-white/40 mt-1">
                                Helps align notes to the grid. Use the song's actual BPM for best results.
                            </p>
                        </div>

                        {/* Transpose */}
                        <div>
                            <div className="flex justify-between text-sm text-white/60 mb-1">
                                <label>Transpose (Semitones)</label>
                                <span>{transpose > 0 ? '+' : ''}{transpose}</span>
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
                                    className="text-xs text-white/40 hover:text-white px-2 py-1 bg-white/5 rounded"
                                >
                                    Reset
                                </button>
                            </div>
                            <p className="text-xs text-white/40 mt-1">
                                Adjust pitch if notes are consistently off (e.g. 7 instead of 1).
                            </p>
                        </div>

                        {/* Advanced Controls */}
                        <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                            <h4 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                Fine Tuning
                            </h4>

                            <div className="space-y-4">
                                {/* Note Segmentation (Onset) */}
                                <div>
                                    <div className="flex justify-between text-xs text-white/60 mb-1">
                                        <label>Note Segmentation</label>
                                        <span>{Math.round(onsetThreshold * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="10"
                                        max="90"
                                        value={onsetThreshold * 100}
                                        onChange={(e) => setOnsetThreshold(parseInt(e.target.value) / 100)}
                                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                        disabled={isProcessing}
                                    />
                                    <div className="flex justify-between text-[10px] text-white/30 px-1">
                                        <span>Split Notes</span>
                                        <span>Merge Notes</span>
                                    </div>
                                </div>

                                {/* Model Confidence (Frame) */}
                                <div>
                                    <div className="flex justify-between text-xs text-white/60 mb-1">
                                        <label>Model Confidence</label>
                                        <span>{Math.round(frameThreshold * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="10"
                                        max="90"
                                        value={frameThreshold * 100}
                                        onChange={(e) => setFrameThreshold(parseInt(e.target.value) / 100)}
                                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                        disabled={isProcessing}
                                    />
                                    <div className="flex justify-between text-[10px] text-white/30 px-1">
                                        <span>More Notes</span>
                                        <span>Fewer Notes</span>
                                    </div>
                                </div>

                                {/* Min Note Length */}
                                <div>
                                    <div className="flex justify-between text-xs text-white/60 mb-1">
                                        <label>Min Note Length</label>
                                        <span>{minNoteLen}ms</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="5"
                                        max="50"
                                        value={minNoteLen}
                                        onChange={(e) => setMinNoteLen(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pink-500"
                                        disabled={isProcessing}
                                    />
                                    <div className="flex justify-between text-[10px] text-white/30 px-1">
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
                            <div className="flex justify-between text-xs text-white/60">
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
                </div>

                <DialogFooter className="sm:justify-end gap-2">
                    <NeonButton
                        variant="ghost"
                        onClick={onClose}
                        disabled={isProcessing}
                    >
                        Cancel
                    </NeonButton>
                    <NeonButton
                        variant={file ? "purple" : "default"}
                        onClick={handleTranscribe}
                        disabled={!file || isProcessing}
                        icon={<Wand2 className="w-4 h-4" />}
                    >
                        {isProcessing ? "Transcribing..." : "Transcribe"}
                    </NeonButton>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
