// ============================================
// Kalimba Hero - Tab Viewer (Practice Mode)
// ============================================
// A simple 2D scrolling tab viewer for practicing
// No game mechanics - just readable notation with auto-scroll

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, ArrowLeft } from 'lucide-react';
import type { Song, SongNote } from '@/types/game';
import { getKeyColor, getKeyDisplayLabel } from '@/utils/frequencyMap';
import { NeonButton } from '@/components/ui/NeonButton';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Checkbox } from '@/components/ui/checkbox';

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

  // Parse the degree to get number and markers
  const degreeMatch = label.degree.match(/^(\d)([°*']*)$/);
  const number = degreeMatch ? degreeMatch[1] : label.degree;
  const markers = degreeMatch ? degreeMatch[2] : '';

  // Count octave markers
  const dotCount = (markers.match(/[°*']/g) || []).length;

  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        min-w-[48px] h-[56px] rounded-xl
        transition-all duration-200
        ${isHighlighted ? 'scale-110 z-10' : 'hover:scale-105'}
      `}
      style={{
        backgroundColor: isHighlighted ? color : `${color}30`,
        boxShadow: isHighlighted
          ? `0 0 25px ${color}, 0 0 50px ${color}60`
          : `0 4px 15px ${color}20`,
        border: `2px solid ${isHighlighted ? '#fff' : color}50`,
      }}
    >
      {/* Dots above the number (for octave markers) */}
      {dotCount > 0 && (
        <div className="absolute -top-2 flex gap-1">
          {Array(dotCount).fill(0).map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: isHighlighted ? '#fff' : color,
                boxShadow: `0 0 6px ${color}`,
              }}
            />
          ))}
        </div>
      )}

      {/* The number */}
      <span
        className="text-2xl font-black"
        style={{
          color: isHighlighted ? '#fff' : color,
          textShadow: isHighlighted ? '0 2px 4px rgba(0,0,0,0.5)' : 'none',
        }}
      >
        {number}
      </span>

      {/* Note letter small below */}
      <span
        className="text-[10px] font-medium"
        style={{ color: isHighlighted ? 'rgba(255,255,255,0.8)' : `${color}99` }}
      >
        {label.note.replace(/[°*']/g, '')}
      </span>
    </div>
  );
};

// Chord display (multiple notes at once)
const ChordDisplay = ({
  notes,
  isHighlighted,
}: {
  notes: SongNote[];
  isHighlighted: boolean;
}) => {
  return (
    <div className="flex gap-1 items-center px-2 py-1 rounded-lg bg-white/5">
      <span className="text-white/40 text-2xl font-light">(</span>
      {notes.map((note, i) => (
        <TabNote
          key={note.id || i}
          note={note}
          isHighlighted={isHighlighted}
        />
      ))}
      <span className="text-white/40 text-2xl font-light">)</span>
    </div>
  );
};

// Rest/pause display
const RestDisplay = ({ beats }: { beats: number }) => {
  return (
    <div className="flex items-center justify-center min-w-[40px] h-[56px] text-white/30">
      <span className="text-2xl">
        {Array(Math.max(1, Math.round(beats))).fill('–').join(' ')}
      </span>
    </div>
  );
};

export const TabViewer: React.FC<TabViewerProps> = ({
  song,
  onBack,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(30); // pixels per second
  const [autoScroll, setAutoScroll] = useState(true); // Auto scroll enabled by default
  const scrollSpeedRef = useRef(scrollSpeed); // Ref to track current speed
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const accumulatedScrollRef = useRef<number>(0); // Accumulate fractional pixels

  // Keep ref in sync with state
  useEffect(() => {
    scrollSpeedRef.current = scrollSpeed;
  }, [scrollSpeed]);

  // Group notes by time (for chords) and organize into items
  const { items, lines } = useMemo(() => {
    const grouped = new Map<number, SongNote[]>();

    song.notes.forEach(note => {
      const timeKey = Math.round(note.time * 100) / 100; // Round to 10ms
      if (!grouped.has(timeKey)) {
        grouped.set(timeKey, []);
      }
      grouped.get(timeKey)!.push(note);
    });

    // Sort by time and create items
    const sortedTimes = Array.from(grouped.keys()).sort((a, b) => a - b);
    const items = sortedTimes.map((time, index) => ({
      time,
      notes: grouped.get(time)!,
      index,
    }));

    // Create lines (about 6-8 notes per line)
    const notesPerLine = 7;
    const lines: typeof items[] = [];

    for (let i = 0; i < items.length; i += notesPerLine) {
      lines.push(items.slice(i, i + notesPerLine));
    }

    return { items, lines };
  }, [song.notes]);

  // Calculate beat duration from BPM
  const beatDuration = 60 / song.bpm;

  // Animation frame based scroll (uses ref for always-current speed)
  const animate = useCallback((currentTime: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = currentTime;
    }

    const deltaTime = (currentTime - lastTimeRef.current) / 1000; // Convert to seconds
    lastTimeRef.current = currentTime;

    if (containerRef.current) {
      // Accumulate fractional pixels to handle low speeds properly
      accumulatedScrollRef.current += scrollSpeedRef.current * deltaTime;

      // Only scroll when we have at least 1 pixel accumulated
      if (accumulatedScrollRef.current >= 1) {
        const pixelsToScroll = Math.floor(accumulatedScrollRef.current);
        containerRef.current.scrollTop += pixelsToScroll;
        accumulatedScrollRef.current -= pixelsToScroll;
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);

  // Start/stop animation based on isPlaying and autoScroll
  useEffect(() => {
    if (isPlaying && autoScroll) {
      lastTimeRef.current = 0;
      accumulatedScrollRef.current = 0; // Reset accumulator
      animationFrameRef.current = requestAnimationFrame(animate);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, autoScroll, animate]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(p => !p);
      }
      if (e.code === 'ArrowUp' || e.code === 'ArrowRight') {
        e.preventDefault();
        setScrollSpeed(s => Math.min(200, s + 10));
      }
      if (e.code === 'ArrowDown' || e.code === 'ArrowLeft') {
        e.preventDefault();
        setScrollSpeed(s => Math.max(10, s - 10));
      }
      if (e.code === 'Escape') {
        onBack();
      }
      if (e.code === 'KeyR') {
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
        setIsPlaying(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  const handleReset = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    setIsPlaying(false);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-black/40 backdrop-blur-md z-20 border-b border-white/10">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-shrink-0">
            <NeonButton
              variant="purple"
              size="sm"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={onBack}
            >
              Back
            </NeonButton>

            <div className="hidden sm:block">
              <h1 className="text-xl font-black text-white truncate">{song.title}</h1>
              <p className="text-white/50 text-sm">{song.artist} • {song.bpm} BPM</p>
            </div>
          </div>

          {/* Controls - Flex row */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            {/* Auto Scroll Toggle */}
            <GlassPanel padding="sm" className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={autoScroll}
                  onCheckedChange={(checked) => setAutoScroll(checked === true)}
                  className="border-white/30 bg-white/10 text-cyan-500 data-[state=checked]:bg-cyan-500 data-[state=checked]:text-black"
                />
                <span className="text-white/60 text-sm">Auto Scroll</span>
              </label>
            </GlassPanel>

            {/* Speed Slider */}
            <GlassPanel padding="sm" className={`flex items-center gap-3 ${!autoScroll ? 'opacity-50' : ''}`}>
              <span className="text-white/60 text-sm hidden md:block">Speed:</span>
              <input
                type="range"
                min="10"
                max="200"
                step="10"
                value={scrollSpeed}
                onChange={(e) => setScrollSpeed(Number(e.target.value))}
                disabled={!autoScroll}
                className="w-24 md:w-32 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:cursor-not-allowed"
              />
              <span className="text-white font-mono text-sm w-12">{scrollSpeed}</span>
            </GlassPanel>

            {/* Play/Pause */}
            <NeonButton
              variant={isPlaying ? 'orange' : 'cyan'}
              size="sm"
              icon={isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              onClick={() => setIsPlaying(!isPlaying)}
            >
              <span className="hidden sm:inline">{isPlaying ? 'Pause' : 'Play'}</span>
            </NeonButton>

            {/* Reset */}
            <NeonButton
              variant="red"
              size="sm"
              icon={<RotateCcw className="w-4 h-4" />}
              onClick={handleReset}
            >
              <span className="hidden sm:inline">Reset</span>
            </NeonButton>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div
        ref={containerRef}
        className="h-full pt-28 pb-40 px-4 overflow-y-auto scroll-smooth"
      >
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Song notation title */}
          <div className="text-center py-8">
            <div className="text-white/30 text-sm uppercase tracking-widest mb-2">Kalimba Tab</div>
            <h2 className="text-4xl font-black text-white mb-2">{song.title}</h2>
            <p className="text-white/60">{song.artist}</p>
            <div className="flex items-center justify-center gap-4 mt-4 text-sm text-white/40">
              <span>Tempo: {song.bpm} BPM</span>
              <span>•</span>
              <span>Duration: {Math.floor(song.duration / 60)}:{String(Math.floor(song.duration % 60)).padStart(2, '0')}</span>
              <span>•</span>
              <span>{song.notes.length} notes</span>
            </div>
          </div>

          {/* Lines of notation */}
          {lines.map((line, lineIndex) => (
            <div
              key={lineIndex}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors"
            >
              {/* Line number */}
              <div className="text-xs text-white/30 mb-4 font-mono">
                Line {lineIndex + 1} of {lines.length}
              </div>

              {/* Notes in this line */}
              <div className="flex flex-wrap gap-3 items-center">
                {line.map((item, itemIndex) => {
                  // Check if there's a gap before this note (rest)
                  const prevTime = itemIndex > 0 ? line[itemIndex - 1].time : (lineIndex > 0 ? lines[lineIndex - 1][lines[lineIndex - 1].length - 1]?.time : 0);
                  const gap = item.time - prevTime;
                  const showRest = gap > beatDuration * 1.5 && itemIndex > 0;
                  const restBeats = Math.round(gap / beatDuration);

                  return (
                    <div key={item.time} className="flex items-center gap-3">
                      {showRest && <RestDisplay beats={restBeats} />}

                      {item.notes.length > 1 ? (
                        <ChordDisplay
                          notes={item.notes}
                          isHighlighted={false}
                        />
                      ) : (
                        <TabNote
                          note={item.notes[0]}
                          isHighlighted={false}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* End marker */}
          <div className="text-center py-16">
            <div className="text-white/20 text-6xl mb-4">🎵</div>
            <div className="text-white/40 text-lg">End of Song</div>
          </div>
        </div>
      </div>

      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/40 backdrop-blur-md z-20 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 text-xs text-white/40 flex-wrap">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">Space</kbd>
              <span>Play/Pause</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">↑↓</kbd>
              <span>Speed</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">R</kbd>
              <span>Reset</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">Esc</kbd>
              <span>Back</span>
            </div>
          </div>

          {/* Notation legend */}
          <div className="flex items-center justify-center gap-6 text-xs text-white/30 mt-3 flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded bg-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs">1</div>
              <span>= Do</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="relative">
                <div className="w-5 h-5 rounded bg-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-xs">1</div>
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-400" />
              </div>
              <span>= Higher octave</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-white/40">(</span>
              <div className="w-4 h-4 rounded bg-green-500/20 text-green-400 text-[10px] font-bold flex items-center justify-center">1</div>
              <div className="w-4 h-4 rounded bg-orange-500/20 text-orange-400 text-[10px] font-bold flex items-center justify-center">3</div>
              <span className="text-white/40">)</span>
              <span>= Chord</span>
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
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-30"
          >
            <div className="px-4 py-2 rounded-full bg-cyan-500/20 border border-cyan-500/50 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-cyan-400 font-medium text-sm">Scrolling at {scrollSpeed} px/s</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TabViewer;
