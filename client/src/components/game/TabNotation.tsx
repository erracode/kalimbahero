import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Zap, Info } from 'lucide-react';
import type { Song, SongNote } from '@/types/game';
import { getKeyColor, getKeyDisplayLabel } from '@/utils/frequencyMap';
import { cn } from '@/lib/utils';
import { NeonButton } from '@/components/ui/NeonButton';
import { initKalimbaAudio, playChord, disposeKalimbaAudio } from '@/utils/kalimbaAudio';
import * as Tone from 'tone';

interface TabNotationProps {
    song: Song;
    className?: string;
}

// Single note display component
const TabNote = ({ note, isHighlighted }: { note: SongNote; isHighlighted: boolean }) => {
    const label = getKeyDisplayLabel(note.keyIndex);
    const color = getKeyColor(note.keyIndex);

    const degreeMatch = label.degree.match(/^(\d)([°*']*)$/);
    const number = degreeMatch ? degreeMatch[1] : label.degree;
    const markers = degreeMatch ? degreeMatch[2] : '';
    const dotCount = (markers.match(/[°*']/g) || []).length;

    return (
        <div
            className={cn(
                "relative flex flex-col items-center justify-center min-w-[44px] h-[52px] rounded-lg transition-all duration-300",
                isHighlighted ? 'scale-110 z-10' : 'hover:scale-105 opacity-80'
            )}
            style={{
                backgroundColor: isHighlighted ? color : `${color}15`,
                boxShadow: isHighlighted ? `0 0 25px ${color}` : `0 2px 8px ${color}10`,
                border: `2px solid ${isHighlighted ? '#fff' : color}30`,
            }}
        >
            {dotCount > 0 && (
                <div className="absolute -top-2 flex gap-0.5">
                    {Array(dotCount).fill(0).map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isHighlighted ? '#fff' : color }} />
                    ))}
                </div>
            )}
            <span className="text-xl font-black" style={{ color: isHighlighted ? '#fff' : color }}>
                {number}
            </span>
            <span className="text-[8px] font-bold" style={{ color: isHighlighted ? 'rgba(255,255,255,0.9)' : `${color}60` }}>
                {label.note.replace(/[°*']/g, '')}
            </span>
        </div>
    );
};

// Chord display
const ChordDisplay = ({ notes, isHighlighted, activeNoteIds }: { notes: SongNote[]; isHighlighted: boolean; activeNoteIds?: Set<string> }) => (
    <div className={cn(
        "flex gap-1 items-center px-1.5 py-1 rounded-xl transition-all duration-300",
        isHighlighted ? "bg-white/10" : "bg-white/5"
    )}>
        <span className="text-white/20 text-xl font-light">(</span>
        {notes.map((note, i) => (
            <TabNote
                key={note.id || i}
                note={note}
                isHighlighted={isHighlighted || (note.id ? activeNoteIds?.has(note.id) ?? false : false)}
            />
        ))}
        <span className="text-white/20 text-xl font-light">)</span>
    </div>
);

// Rest display
const RestDisplay = ({ beats }: { beats: number }) => (
    <div className="flex items-center justify-center min-w-[32px] h-[52px] text-white/10 italic font-mono text-sm">
        {Array(Math.max(1, Math.round(beats))).fill('–').join('')}
    </div>
);

export const TabNotation: React.FC<TabNotationProps> = ({ song, className }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [scrollSpeed, setScrollSpeed] = useState(40); // pixels per second
    const [autoScroll] = useState(true);
    const [activeNoteIds, setActiveNoteIds] = useState<Set<string>>(new Set());

    const animationFrameRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);
    const accumulatedScrollRef = useRef<number>(0);
    const speedRef = useRef(scrollSpeed);

    // Playback Refs
    const startTimeRef = useRef<number>(0);
    const pausedTimeRef = useRef<number>(0);
    const nextNoteIndexRef = useRef<number>(0);

    useEffect(() => { speedRef.current = scrollSpeed; }, [scrollSpeed]);

    // Initialize Audio on Mount
    useEffect(() => {
        return () => {
            disposeKalimbaAudio();
            setIsPlaying(false);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            Tone.Transport.stop();
            Tone.Transport.cancel();
        };
    }, []);

    const { lines } = useMemo(() => {
        const grouped = new Map<number, SongNote[]>();

        song.notes.forEach(note => {
            const timeKey = Math.round(note.time * 100) / 100;
            if (!grouped.has(timeKey)) grouped.set(timeKey, []);
            grouped.get(timeKey)!.push(note);
        });

        const sortedTimes = Array.from(grouped.keys()).sort((a, b) => a - b);
        const items = sortedTimes.map((time, index) => ({
            time,
            notes: grouped.get(time)!,
            index,
        }));

        const notesPerLine = 7;
        const lines: typeof items[] = [];
        for (let i = 0; i < items.length; i += notesPerLine) {
            lines.push(items.slice(i, i + notesPerLine));
        }
        return { items, lines };
    }, [song.notes]);

    const beatDuration = 60 / song.bpm;

    // Flatten notes for playback scheduling
    const sortedNotes = useMemo(() => {
        return [...song.notes].sort((a, b) => a.time - b.time);
    }, [song.notes]);

    const handleTogglePlay = async () => {
        if (!isPlaying) {
            await initKalimbaAudio();
            await Tone.start();

            // Start Playback
            startTimeRef.current = Tone.now() - pausedTimeRef.current;
            setIsPlaying(true);
            lastTimeRef.current = performance.now();
        } else {
            // Pause
            pausedTimeRef.current = Tone.now() - startTimeRef.current;
            setIsPlaying(false);
            setActiveNoteIds(new Set()); // Clear highlights
        }
    };

    const handleReset = () => {
        if (containerRef.current) containerRef.current.scrollTop = 0;
        setIsPlaying(false);
        lastTimeRef.current = 0;
        accumulatedScrollRef.current = 0;
        pausedTimeRef.current = 0;
        nextNoteIndexRef.current = 0;
        setActiveNoteIds(new Set());
        // setPlaybackTime(0);
    };

    // Main Loop
    const animate = useCallback((time: number) => {
        if (!isPlaying) return;

        // 1. Calculate Time
        const now = Tone.now();
        const trackTime = now - startTimeRef.current;
        // setPlaybackTime(trackTime);

        // 2. Play Audio & Highlight
        // Look ahead a bit for audio scheduling if needed, but for simple visualization check current time
        // We'll process all notes that should have played by now
        let newActiveIds = new Set(activeNoteIds);
        let hasUpdates = false;

        while (true) {
            const index = nextNoteIndexRef.current;
            if (index >= sortedNotes.length) break;

            const note = sortedNotes[index];
            if (note.time <= trackTime) {
                // Play Note if we just reached it (approx)
                // Actually with RAF this might trigger multiple times or late. 
                // Better logic: Schedule ahead?
                // For this simple implementation: Just trigger if we haven't processed this index

                // Play Sound
                // Check if this time matches a group to play chord?
                // Or just play individual notes. Tone PolySynth handles polyphony.
                // We prevent double playing by incrementing index immediately

                // If it's *too* old (skipped), maybe don't play? < 0.1s lag is fine.
                if (trackTime - note.time < 0.2) {
                    playChord([note.keyIndex], 0.5);
                }

                // Add to active for highlighting
                if (note.id) newActiveIds.add(note.id);
                hasUpdates = true;

                // Schedule removal of highlight
                setTimeout(() => {
                    setActiveNoteIds(prev => {
                        const next = new Set(prev);
                        if (note.id) next.delete(note.id);
                        return next;
                    });
                }, 400); // Highlight duration

                nextNoteIndexRef.current++;
            } else {
                break; // Next note is in future
            }
        }

        if (hasUpdates) {
            setActiveNoteIds(newActiveIds);
        }

        // 3. Auto Scroll (Visual)
        // Optionally sync scroll to time instead of generic speed
        // For now keep manual speed as user requested "Scroll Speed" control usually implies manual override
        if (containerRef.current && autoScroll) {
            const deltaTime = (time - lastTimeRef.current) / 1000;
            accumulatedScrollRef.current += speedRef.current * deltaTime;
            if (accumulatedScrollRef.current >= 1) {
                const px = Math.floor(accumulatedScrollRef.current);
                containerRef.current.scrollTop += px;
                accumulatedScrollRef.current -= px;
            }
        }

        lastTimeRef.current = time;
        animationFrameRef.current = requestAnimationFrame(animate);
    }, [isPlaying, autoScroll, sortedNotes, activeNoteIds]);

    useEffect(() => {
        if (isPlaying) {
            animationFrameRef.current = requestAnimationFrame(animate);
        } else if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
    }, [isPlaying, animate]);

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Header Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-white/5 border border-white/10 mb-6 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10 flex items-center gap-6">
                    <div className="flex flex-col">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">Navigation</h3>
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-white/60">{lines.length} LINES</span>
                            <span className="text-white/20">•</span>
                            <span className="text-sm font-bold text-white/60">{song.notes.length} NOTES</span>
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">Performance</h3>
                        <div className="flex items-center gap-2">
                            <NeonButton
                                variant={isPlaying ? "orange" : "cyan"}
                                size="sm"
                                onClick={handleTogglePlay}
                                className="h-10 px-6 skew-x-[-12deg]"
                            >
                                <div className="skew-x-[12deg] flex items-center gap-2">
                                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                    <span className="text-[10px] font-black uppercase tracking-widest">{isPlaying ? 'Pause' : 'Play'}</span>
                                </div>
                            </NeonButton>
                            <button onClick={handleReset} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group">
                                <RotateCcw className="w-4 h-4 text-white/40 group-hover:text-white group-hover:rotate-[-45deg] transition-all" />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">Flow Speed</h3>
                        <div className="flex items-center gap-3 bg-black/40 px-3 py-2 border border-white/5">
                            <input
                                type="range" min="10" max="150" step="1"
                                value={scrollSpeed}
                                onChange={(e) => setScrollSpeed(Number(e.target.value))}
                                className="w-24 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-cyan-500"
                            />
                            <span className="text-[10px] font-mono font-bold text-cyan-400 w-8">{scrollSpeed}P</span>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 border border-white/5">
                        <Zap className="w-3 h-3 text-cyan-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Practice Sync</span>
                    </div>
                </div>
            </div>

            {/* Notation Lines Container */}
            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto space-y-4 pr-4 custom-scrollbar"
            >
                {lines.map((line, lineIndex) => (
                    <motion.div
                        key={lineIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 font-mono">
                                Sequence {String(lineIndex + 1).padStart(2, '0')}
                            </div>
                            <div className="h-[1px] flex-1 mx-6 bg-white/5" />
                        </div>

                        <div className="flex flex-wrap gap-4 items-center pl-2">
                            {line.map((item, itemIndex) => {
                                const prevTime = itemIndex > 0 ? line[itemIndex - 1].time : (lineIndex > 0 ? lines[lineIndex - 1][lines[lineIndex - 1].length - 1]?.time : 0);
                                const gap = item.time - prevTime;
                                const showRest = gap > beatDuration * 1.5 && itemIndex > 0;
                                const restBeats = Math.round(gap / beatDuration);

                                return (
                                    <div key={item.time} className="flex items-center gap-4">
                                        {showRest && <RestDisplay beats={restBeats} />}
                                        <div className="transition-transform duration-500">
                                            {item.notes.length > 1 ? (
                                                <ChordDisplay notes={item.notes} isHighlighted={false} activeNoteIds={activeNoteIds} />
                                            ) : (
                                                <TabNote
                                                    note={item.notes[0]}
                                                    isHighlighted={item.notes[0].id ? activeNoteIds.has(item.notes[0].id) : false}
                                                />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                ))}

                {/* End Marker */}
                <div className="py-20 text-center flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center">
                        <Info className="w-6 h-6 text-white/10" />
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">End of Track</div>
                </div>
            </div>

            {/* Legend Footer */}
            <div className="mt-6 flex items-center justify-between p-6 border-t border-white/10 bg-black/40 backdrop-blur-xl">
                <div className="flex items-center gap-10">
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-sm bg-cyan-500/30 border border-cyan-500/50" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Root Notes</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-sm bg-purple-500/30 border border-purple-500/50" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Octaves</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-white/20 font-black tracking-tighter">( )</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Chords</span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <kbd className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-none skew-x-[-12deg] text-[10px] font-black text-white/30 font-mono">SPACE</kbd>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Play/Pause</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <kbd className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-none skew-x-[-12deg] text-[10px] font-black text-white/30 font-mono">↑↓</kbd>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Speed</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <kbd className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-none skew-x-[-12deg] text-[10px] font-black text-white/30 font-mono">R</kbd>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Reset</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TabNotation;
