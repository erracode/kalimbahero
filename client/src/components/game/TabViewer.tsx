import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, ArrowLeft, Clock, Zap, Info } from 'lucide-react';
import type { Song, SongNote } from '@/types/game';
import { getKeyColor, getKeyDisplayLabel } from '@/utils/frequencyMap';
import { NeonButton } from '@/components/ui/NeonButton';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Checkbox } from '@/components/ui/checkbox';
import { AuroraBackground } from '@/components/ui/AuroraBackground';
import { cn } from '@/lib/utils';

interface TabViewerProps {
  song: Song;
  onBack: () => void;
}

// Single note display component
const TabNote = ({
  note,
  isHighlighted,
}: {
  note: SongNote;
  isHighlighted: boolean;
}) => {
  const label = getKeyDisplayLabel(note.keyIndex);
  const color = getKeyColor(note.keyIndex);

  const degreeMatch = label.degree.match(/^(\d)([°*']*)$/);
  const number = degreeMatch ? degreeMatch[1] : label.degree;
  const markers = degreeMatch ? degreeMatch[2] : '';
  const dotCount = (markers.match(/[°*']/g) || []).length;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center min-w-[52px] h-[64px] rounded-xl transition-all duration-300",
        isHighlighted ? 'scale-110 z-10' : 'hover:scale-105 opacity-80'
      )}
      style={{
        backgroundColor: isHighlighted ? color : `${color}15`,
        boxShadow: isHighlighted ? `0 0 30px ${color}` : `0 4px 12px ${color}10`,
        border: `2px solid ${isHighlighted ? '#fff' : color}30`,
      }}
    >
      {dotCount > 0 && (
        <div className="absolute -top-2 flex gap-1">
          {Array(dotCount).fill(0).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: isHighlighted ? '#fff' : color, boxShadow: `0 0 8px ${color}` }} />
          ))}
        </div>
      )}

      <span className="text-2xl font-black" style={{ color: isHighlighted ? '#fff' : color }}>
        {number}
      </span>
      <span className="text-[10px] font-bold" style={{ color: isHighlighted ? 'rgba(255,255,255,0.9)' : `${color}60` }}>
        {label.note.replace(/[°*']/g, '')}
      </span>
    </div>
  );
};

// Chord display
const ChordDisplay = ({
  notes,
  isHighlighted,
}: {
  notes: SongNote[];
  isHighlighted: boolean;
}) => (
  <div className={cn(
    "flex gap-1 items-center px-2 py-1.5 rounded-2xl transition-all duration-300",
    isHighlighted ? "bg-white/10" : "bg-white/5"
  )}>
    <span className="text-white/20 text-2xl font-light">(</span>
    {notes.map((note, i) => (
      <TabNote key={note.id || i} note={note} isHighlighted={isHighlighted} />
    ))}
    <span className="text-white/20 text-2xl font-light">)</span>
  </div>
);

// Rest display
const RestDisplay = ({ beats }: { beats: number }) => (
  <div className="flex items-center justify-center min-w-[40px] h-[64px] text-white/10 italic font-mono text-xl">
    {Array(Math.max(1, Math.round(beats))).fill('–').join('')}
  </div>
);

export const TabViewer: React.FC<TabViewerProps> = ({
  song,
  onBack,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(40);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollSpeedRef = useRef(scrollSpeed);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accumulatedScrollRef = useRef<number>(0);

  useEffect(() => {
    scrollSpeedRef.current = scrollSpeed;
  }, [scrollSpeed]);

  const { lines } = useMemo(() => {
    const grouped = new Map<number, SongNote[]>();
    song.notes.forEach(note => {
      const timeKey = Math.round(note.time * 100) / 100;
      if (!grouped.has(timeKey)) grouped.set(timeKey, []);
      grouped.get(timeKey)!.push(note);
    });

    const sortedTimes = Array.from(grouped.keys()).sort((a, b) => a - b);
    const items = sortedTimes.map((time, index) => ({
      time, notes: grouped.get(time)!, index,
    }));

    const notesPerLine = 8;
    const lines: typeof items[] = [];
    for (let i = 0; i < items.length; i += notesPerLine) {
      lines.push(items.slice(i, i + notesPerLine));
    }

    return { items, lines };
  }, [song.notes]);

  const beatDuration = 60 / song.bpm;

  const animate = useCallback((currentTime: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = currentTime;
    const deltaTime = (currentTime - lastTimeRef.current) / 1000;
    lastTimeRef.current = currentTime;

    if (containerRef.current && isPlaying && autoScroll) {
      accumulatedScrollRef.current += scrollSpeedRef.current * deltaTime;
      if (accumulatedScrollRef.current >= 1) {
        const pixelsToScroll = Math.floor(accumulatedScrollRef.current);
        containerRef.current.scrollTop += pixelsToScroll;
        accumulatedScrollRef.current -= pixelsToScroll;
      }
    }
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [isPlaying, autoScroll]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [animate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); setIsPlaying(p => !p); }
      if (e.code === 'ArrowUp') { e.preventDefault(); setScrollSpeed(s => Math.min(250, s + 5)); }
      if (e.code === 'ArrowDown') { e.preventDefault(); setScrollSpeed(s => Math.max(10, s - 5)); }
      if (e.code === 'Escape') onBack();
      if (e.code === 'KeyR') handleReset();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  const handleReset = () => {
    if (containerRef.current) containerRef.current.scrollTop = 0;
    setIsPlaying(false);
    accumulatedScrollRef.current = 0;
    lastTimeRef.current = 0;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <AuroraBackground />
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 bg-black/60 backdrop-blur-xl z-20 border-b border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <button
              onClick={onBack}
              className="w-12 h-12 rounded-none skew-x-[-12deg] bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all cursor-pointer group"
            >
              <ArrowLeft className="w-5 h-5 text-white/40 group-hover:text-white skew-x-[12deg]" />
            </button>

            <div className="flex flex-col">
              <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">{song.title}</h1>
              <div className="flex items-center gap-3 mt-1 underline decoration-cyan-500/30">
                <span className="text-cyan-400 font-bold uppercase tracking-widest text-xs">{song.artist}</span>
                <span className="text-white/20 text-xs">•</span>
                <span className="text-white/40 font-mono text-xs italic">{song.bpm} BPM</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <GlassPanel padding="sm" className="hidden lg:flex items-center gap-4 bg-white/[0.03] border-white/10">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <Checkbox
                  checked={autoScroll}
                  onCheckedChange={(checked) => setAutoScroll(checked === true)}
                  className="w-4 h-4 border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Auto Scroll</span>
              </label>
              <div className="h-4 w-[1px] bg-white/10" />
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Speed</span>
                <input
                  type="range" min="10" max="250" step="5"
                  value={scrollSpeed}
                  onChange={(e) => setScrollSpeed(Number(e.target.value))}
                  className="w-32 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-cyan-500"
                />
                <span className="text-cyan-400 font-mono font-bold text-xs w-10">{scrollSpeed}P</span>
              </div>
            </GlassPanel>

            <div className="flex items-center gap-2">
              <NeonButton
                variant={isPlaying ? 'orange' : 'cyan'}
                onClick={() => setIsPlaying(!isPlaying)}
                className="h-12 px-8 skew-x-[-12deg]"
              >
                <div className="skew-x-[12deg] flex items-center gap-2">
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  <span className="font-black italic tracking-widest uppercase">{isPlaying ? 'Pause' : 'Play'}</span>
                </div>
              </NeonButton>

              <button
                onClick={handleReset}
                className="h-12 px-5 bg-white/5 border border-white/10 hover:bg-white/10 skew-x-[-12deg] transition-all cursor-pointer group"
              >
                <RotateCcw className="w-5 h-5 text-white/30 group-hover:text-white skew-x-[12deg] transition-transform group-hover:rotate-[-45deg]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div
        ref={containerRef}
        className="h-full pt-44 pb-60 px-8 overflow-y-auto scroll-smooth custom-scrollbar relative z-10"
      >
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Song notation title */}
          <div className="text-center py-12 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 blur-[120px] rounded-full" />
            <div className="relative z-10 space-y-4">
              <div className="text-cyan-500/40 text-[10px] font-black uppercase tracking-[0.6em] mb-4">Performance Score</div>
              <h2 className="text-7xl font-black text-white italic uppercase tracking-tighter shadow-2xl">{song.title}</h2>
              <div className="px-6 py-2 bg-white/5 border border-white/10 inline-block skew-x-[-12deg]">
                <p className="text-white/60 skew-x-[12deg] font-bold uppercase tracking-widest">{song.artist}</p>
              </div>

              <div className="flex items-center justify-center gap-8 mt-8">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Tempo</span>
                  <span className="text-lg font-black text-cyan-400 italic">{song.bpm} BPM</span>
                </div>
                <div className="w-[1px] h-8 bg-white/10" />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Duration</span>
                  <span className="text-lg font-black text-cyan-400 italic">{Math.floor(song.duration / 60)}:{String(Math.floor(song.duration % 60)).padStart(2, '0')}</span>
                </div>
                <div className="w-[1px] h-8 bg-white/10" />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Notes</span>
                  <span className="text-lg font-black text-cyan-400 italic">{song.notes.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Lines of notation */}
          <div className="grid grid-cols-1 gap-6">
            {lines.map((line, lineIndex) => (
              <motion.div
                key={lineIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: lineIndex * 0.02 }}
                className="p-10 bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500 group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500/20 group-hover:bg-cyan-500 transition-colors" />

                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] font-mono">Sequence</span>
                    <span className="px-3 py-1 bg-white/5 border border-white/10 text-[10px] font-bold text-white/40">{String(lineIndex + 1).padStart(3, '0')}</span>
                  </div>
                  <div className="h-[1px] flex-1 mx-12 bg-white/5" />
                </div>

                <div className="flex flex-wrap gap-6 items-center pl-4">
                  {line.map((item, itemIndex) => {
                    const prevTime = itemIndex > 0 ? line[itemIndex - 1].time : (lineIndex > 0 ? lines[lineIndex - 1][lines[lineIndex - 1].length - 1]?.time : 0);
                    const gap = item.time - prevTime;
                    const showRest = gap > beatDuration * 1.5 && itemIndex > 0;
                    const restBeats = Math.round(gap / beatDuration);

                    return (
                      <div key={item.time} className="flex items-center gap-6">
                        {showRest && <RestDisplay beats={restBeats} />}
                        <div className="group-hover:scale-105 transition-transform duration-500">
                          {item.notes.length > 1 ? (
                            <ChordDisplay notes={item.notes} isHighlighted={false} />
                          ) : (
                            <TabNote note={item.notes[0]} isHighlighted={false} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>

          {/* End marker */}
          <div className="text-center py-32 flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center bg-white/5">
              <Info className="w-8 h-8 text-white/20" />
            </div>
            <div>
              <div className="text-white/10 text-[10px] font-black uppercase tracking-[0.8em] mb-2">Completion</div>
              <div className="text-white/30 text-2xl font-black italic uppercase">Track Finished</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-black/80 backdrop-blur-2xl z-20 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
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

      {/* Playing indicator */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-30"
          >
            <div className="px-6 py-3 bg-cyan-500 border border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.4)] skew-x-[-12deg]">
              <div className="skew-x-[12deg] flex items-center gap-3">
                <RotateCcw className="w-4 h-4 text-black animate-spin-slow" />
                <span className="text-black font-black italic uppercase tracking-widest text-xs">Active Scrolling: {scrollSpeed} PX/S</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TabViewer;
