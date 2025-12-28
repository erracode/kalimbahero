// ============================================
// Kalimba Hero - Chart Editor (Clone Hero Style)
// ============================================
// Visual timeline-based note editor for creating songs

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, Pause, ZoomIn, ZoomOut, Trash2, 
  SkipBack, Grid, Music, Plus, Minus
} from 'lucide-react';
import { KALIMBA_KEYS, getKeyColor, getKeyDisplayLabel } from '@/utils/frequencyMap';
import { initKalimbaAudio, playNote } from '@/utils/kalimbaAudio';
import type { SongNote } from '@/types/game';

interface ChartEditorProps {
  notes: SongNote[];
  bpm: number;
  duration: number;
  onNotesChange: (notes: SongNote[]) => void;
  onDurationChange: (duration: number) => void;
}

// Note grid constants
const LANE_WIDTH = 36;
const BEAT_HEIGHT = 80;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const TOTAL_LANES = 21;
const GRID_WIDTH = TOTAL_LANES * LANE_WIDTH;

// Generate unique ID
const generateId = () => `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const ChartEditor: React.FC<ChartEditorProps> = ({
  notes,
  bpm,
  duration,
  onNotesChange,
  onDurationChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridDivision, setGridDivision] = useState(4);
  const [totalBeats, setTotalBeats] = useState(Math.ceil(duration * bpm / 60));
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollTop: 0 });
  const [draggingNote, setDraggingNote] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false); // Track if we actually dragged
  const playIntervalRef = useRef<number | null>(null);
  const isInternalChangeRef = useRef(false); // Track internal vs external duration changes
  const audioInitializedRef = useRef(false);
  const previousDragKeyRef = useRef<number | null>(null); // Track previous key during drag for audio
  
  // Initialize audio on mount
  useEffect(() => {
    if (!audioInitializedRef.current) {
      initKalimbaAudio().catch(console.error);
      audioInitializedRef.current = true;
    }
  }, []);
  
  // Calculate dimensions
  const beatDuration = 60 / bpm;
  const gridHeight = totalBeats * BEAT_HEIGHT * zoom;
  
  // Sync totalBeats when duration prop changes from outside (SongBuilder slider)
  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }
    const beatsFromDuration = Math.ceil(duration * bpm / 60);
    if (beatsFromDuration !== totalBeats) {
      setTotalBeats(beatsFromDuration);
    }
  }, [duration, bpm]);
  
  // Update duration when beats change internally (via +/- buttons)
  const updateBeats = useCallback((newBeats: number) => {
    const clampedBeats = Math.max(4, newBeats);
    setTotalBeats(clampedBeats);
    isInternalChangeRef.current = true;
    const newDuration = (clampedBeats * 60) / bpm;
    onDurationChange(newDuration);
  }, [bpm, onDurationChange]);
  
  // Snap time to grid
  const snapTime = useCallback((time: number): number => {
    if (!snapToGrid) return time;
    const gridSize = beatDuration / gridDivision;
    return Math.round(time / gridSize) * gridSize;
  }, [snapToGrid, beatDuration, gridDivision]);
  
  // Convert Y position to time (inverted - 0 is at bottom)
  const yToTime = useCallback((y: number): number => {
    const invertedY = gridHeight - y;
    const time = (invertedY / (BEAT_HEIGHT * zoom)) * beatDuration;
    return snapTime(Math.max(0, time));
  }, [zoom, beatDuration, snapTime, gridHeight]);
  
  // Convert time to Y position (inverted - 0 is at bottom)
  const timeToY = useCallback((time: number): number => {
    const y = (time / beatDuration) * BEAT_HEIGHT * zoom;
    return gridHeight - y;
  }, [zoom, beatDuration, gridHeight]);
  
  // Handle click on grid to add note
  const handleGridClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Don't add note if we were dragging or just finished dragging
    if (isDragging || draggingNote || hasDragged) {
      setHasDragged(false);
      return;
    }
    
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Determine which lane (key) was clicked
    const keyIndex = Math.floor(x / LANE_WIDTH);
    if (keyIndex < 0 || keyIndex >= TOTAL_LANES) return;
    
    // Determine time from Y position
    const time = yToTime(y);
    
    // Check if clicking near existing note (don't add if too close)
    const existingNote = notes.find(n => 
      n.keyIndex === keyIndex && 
      Math.abs(n.time - time) < beatDuration / gridDivision / 2
    );
    
    if (!existingNote) {
      // Add new note - duration based on grid division
      const key = KALIMBA_KEYS[keyIndex];
      const noteDuration = beatDuration / gridDivision; // Note spans one grid cell
      const newNote: SongNote = {
        id: generateId(),
        time,
        duration: noteDuration,
        keyIndex,
        note: key.note,
        frequency: key.frequency,
      };
      onNotesChange([...notes, newNote].sort((a, b) => a.time - b.time));
      
      // Play the note sound
      playNote(keyIndex).catch(console.error);
    }
  }, [notes, yToTime, beatDuration, gridDivision, onNotesChange, isDragging, draggingNote, hasDragged]);
  
  // Handle note double-click to delete
  const handleNoteDoubleClick = useCallback((noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onNotesChange(notes.filter(n => n.id !== noteId));
    setSelectedNotes(prev => {
      const next = new Set(prev);
      next.delete(noteId);
      return next;
    });
  }, [notes, onNotesChange]);
  
  // Handle note drag start
  const handleNoteDragStart = useCallback((noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    setDraggingNote(noteId);
    previousDragKeyRef.current = note.keyIndex; // Initialize with current key
    setDragOffset({
      x: e.clientX - rect.left - (note.keyIndex * LANE_WIDTH),
      y: e.clientY - rect.top - timeToY(note.time),
    });
  }, [notes, timeToY]);
  
  // Handle note dragging
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingNote) {
      setHasDragged(true); // Mark that we actually dragged
      
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const x = e.clientX - rect.left - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;
      
      const keyIndex = Math.max(0, Math.min(TOTAL_LANES - 1, Math.floor(x / LANE_WIDTH)));
      const time = yToTime(y + BEAT_HEIGHT * zoom / 2);
      
      // Play sound when key changes during drag
      if (previousDragKeyRef.current !== keyIndex) {
        playNote(keyIndex).catch(console.error);
        previousDragKeyRef.current = keyIndex;
      }
      
      onNotesChange(notes.map(n => {
        if (n.id === draggingNote) {
          const key = KALIMBA_KEYS[keyIndex];
          return {
            ...n,
            keyIndex,
            time: Math.max(0, time),
            note: key.note,
            frequency: key.frequency,
          };
        }
        return n;
      }));
    } else if (isDragging && containerRef.current) {
      // Drag to scroll
      const deltaY = e.clientY - dragStart.y;
      containerRef.current.scrollTop = dragStart.scrollTop - deltaY;
    }
  }, [draggingNote, isDragging, dragOffset, dragStart, notes, onNotesChange, yToTime, zoom]);
  
  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setDraggingNote(null);
    setIsDragging(false);
    previousDragKeyRef.current = null; // Reset drag key tracking
  }, []);
  
  // Handle grid drag start (for scrolling)
  const handleGridDragStart = useCallback((e: React.MouseEvent) => {
    if (e.target === gridRef.current && !draggingNote) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        scrollTop: containerRef.current?.scrollTop || 0,
      });
    }
  }, [draggingNote]);
  
  // Handle playback
  useEffect(() => {
    if (isPlaying) {
      const startTime = Date.now();
      const startPlayhead = playhead;
      
      playIntervalRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const newTime = startPlayhead + elapsed;
        
        if (newTime >= duration) {
          setPlayhead(0);
          setIsPlaying(false);
        } else {
          setPlayhead(newTime);
          
          // Auto-scroll to keep playhead visible
          if (containerRef.current) {
            const playheadY = timeToY(newTime);
            const containerHeight = containerRef.current.clientHeight;
            const scrollTop = containerRef.current.scrollTop;
            
            if (playheadY < scrollTop + 50 || playheadY > scrollTop + containerHeight - 50) {
              containerRef.current.scrollTop = playheadY - containerHeight / 2;
            }
          }
        }
      }, 16);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, playhead, duration, timeToY]);
  
  // Delete selected notes
  const deleteSelectedNotes = useCallback(() => {
    onNotesChange(notes.filter(n => !selectedNotes.has(n.id)));
    setSelectedNotes(new Set());
  }, [notes, selectedNotes, onNotesChange]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(p => !p);
      }
      if (e.code === 'Delete' || e.code === 'Backspace') {
        e.preventDefault();
        deleteSelectedNotes();
      }
      if (e.code === 'Home') {
        setPlayhead(0);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelectedNotes]);
  
  // Scroll to bottom on mount (so we start at beat 1)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);
  
  // Render beat grid lines
  const gridLines = useMemo(() => {
    const lines: JSX.Element[] = [];
    
    for (let beat = 0; beat <= totalBeats; beat++) {
      const y = gridHeight - (beat * BEAT_HEIGHT * zoom);
      const isMeasure = beat % 4 === 0;
      
      lines.push(
        <div
          key={`beat-${beat}`}
          className={`absolute left-0 pointer-events-none ${
            isMeasure ? 'border-t-2 border-white/40' : 'border-t border-white/15'
          }`}
          style={{ top: y, width: GRID_WIDTH }}
        >
          <span className="absolute -left-10 -top-3 text-xs text-white/50 font-mono select-none">
            {beat + 1}
          </span>
        </div>
      );
      
      // Sub-beat divisions
      if (gridDivision > 1) {
        for (let sub = 1; sub < gridDivision; sub++) {
          const subY = y - (sub * BEAT_HEIGHT * zoom / gridDivision);
          lines.push(
            <div
              key={`sub-${beat}-${sub}`}
              className="absolute left-0 border-t border-white/5 pointer-events-none"
              style={{ top: subY, width: GRID_WIDTH }}
            />
          );
        }
      }
    }
    
    return lines;
  }, [totalBeats, zoom, gridDivision, gridHeight]);
  
  return (
    <div 
      className="flex flex-col h-full select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-3 p-3 bg-black/40 border-b border-white/10 flex-wrap">
        {/* Playback controls */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setPlayhead(0)}
            className="p-2 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Go to start (Home)"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded transition-colors ${
              isPlaying 
                ? 'bg-orange-500 text-white hover:bg-orange-600' 
                : 'bg-cyan-500 text-white hover:bg-cyan-600'
            }`}
            title="Play/Pause (Space)"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>
        
        {/* Time display */}
        <div className="px-3 py-1.5 bg-black/40 rounded-lg font-mono text-sm text-cyan-400 min-w-[90px] text-center">
          {Math.floor(playhead / 60)}:{String(Math.floor(playhead % 60)).padStart(2, '0')}.
          {String(Math.floor((playhead % 1) * 100)).padStart(2, '0')}
        </div>
        
        {/* Beats control */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          <span className="px-2 text-xs text-white/50">Beats:</span>
          <button
            onClick={() => updateBeats(totalBeats - 4)}
            className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Remove 4 beats"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="number"
            min="4"
            max="999"
            value={totalBeats}
            onChange={(e) => updateBeats(Number(e.target.value) || 4)}
            className="w-14 px-2 py-0.5 text-sm text-white font-mono text-center bg-white/10 rounded border border-white/20 focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={() => updateBeats(totalBeats + 4)}
            className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Add 4 beats"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
        
        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - 0.25))}
            className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Zoom out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="px-2 text-xs text-white/60 min-w-[45px] text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 0.25))}
            className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Zoom in (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
        
        {/* Grid settings */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`p-1.5 rounded transition-colors ${
              snapToGrid 
                ? 'bg-purple-500 text-white' 
                : 'hover:bg-white/10 text-white/50'
            }`}
            title="Snap to grid"
          >
            <Grid className="w-4 h-4" />
          </button>
          <select
            value={gridDivision}
            onChange={(e) => setGridDivision(Number(e.target.value))}
            className="px-2 py-1 bg-transparent border-none text-white text-sm focus:outline-none cursor-pointer"
          >
            <option value="1" className="bg-slate-800">1/1</option>
            <option value="2" className="bg-slate-800">1/2</option>
            <option value="4" className="bg-slate-800">1/4</option>
            <option value="8" className="bg-slate-800">1/8</option>
            <option value="16" className="bg-slate-800">1/16</option>
          </select>
        </div>
        
        <div className="flex-1" />
        
        {/* Note count */}
        <div className="flex items-center gap-2 text-sm text-white/50 px-2">
          <Music className="w-4 h-4" />
          <span>{notes.length} notes</span>
        </div>
        
        {/* Delete selected */}
        {selectedNotes.size > 0 && (
          <button
            onClick={deleteSelectedNotes}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors text-sm"
            title="Delete selected (Del)"
          >
            <Trash2 className="w-4 h-4" />
            <span>{selectedNotes.size}</span>
          </button>
        )}
      </div>
      
      {/* Main editor area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Beat numbers gutter */}
        <div className="w-10 flex-shrink-0 bg-black/20" />
        
        {/* Scrollable grid area */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-auto relative"
          style={{ cursor: isDragging ? 'grabbing' : 'default' }}
        >
          {/* Grid container */}
          <div 
            ref={gridRef}
            className="relative"
            style={{ 
              width: GRID_WIDTH, 
              height: gridHeight,
              minHeight: '100%',
            }}
            onClick={handleGridClick}
            onMouseDown={handleGridDragStart}
          >
            {/* Lane backgrounds */}
            {KALIMBA_KEYS.map((_, index) => {
              const color = getKeyColor(index);
              return (
                <div
                  key={`lane-${index}`}
                  className="absolute top-0 bottom-0 border-r border-white/10"
                  style={{ 
                    left: index * LANE_WIDTH, 
                    width: LANE_WIDTH,
                    backgroundColor: `${color}08`,
                  }}
                />
              );
            })}
            
            {/* Grid lines */}
            {gridLines}
            
            {/* Notes */}
            {notes.map((note) => {
              const color = getKeyColor(note.keyIndex);
              // Calculate note size based on its duration relative to beat
              const gridCellHeight = (BEAT_HEIGHT * zoom) / gridDivision;
              const noteHeight = Math.max(8, Math.min(gridCellHeight - 4, (note.duration / beatDuration) * BEAT_HEIGHT * zoom));
              const y = timeToY(note.time) - noteHeight / 2;
              const x = note.keyIndex * LANE_WIDTH;
              const isSelected = selectedNotes.has(note.id);
              const isBeingDragged = draggingNote === note.id;
              
              return (
                <motion.div
                  key={note.id}
                  className={`absolute rounded cursor-grab active:cursor-grabbing transition-shadow ${
                    isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent' : ''
                  } ${isBeingDragged ? 'opacity-70 scale-110' : ''}`}
                  style={{
                    left: x + 4,
                    top: y,
                    width: LANE_WIDTH - 8,
                    height: noteHeight,
                    backgroundColor: color,
                    boxShadow: `0 0 10px ${color}90, inset 0 1px 0 rgba(255,255,255,0.4)`,
                    zIndex: isBeingDragged ? 100 : 10,
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onMouseDown={(e) => handleNoteDragStart(note.id, e)}
                  onDoubleClick={(e) => handleNoteDoubleClick(note.id, e)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (e.shiftKey) {
                      setSelectedNotes(prev => {
                        const next = new Set(prev);
                        if (next.has(note.id)) {
                          next.delete(note.id);
                        } else {
                          next.add(note.id);
                        }
                        return next;
                      });
                    } else {
                      setSelectedNotes(new Set([note.id]));
                    }
                  }}
                />
              );
            })}
            
            {/* Playhead */}
            <div
              className="absolute left-0 h-1 bg-cyan-400 pointer-events-none z-50 rounded-full"
              style={{ 
                top: timeToY(playhead) - 2,
                width: GRID_WIDTH,
                boxShadow: '0 0 15px #00E5FF, 0 0 30px #00E5FF50',
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Key lanes at bottom */}
      <div className="flex bg-black/40 border-t border-white/20">
        <div className="w-10 flex-shrink-0" />
        <div className="flex">
          {KALIMBA_KEYS.map((_, index) => {
            const label = getKeyDisplayLabel(index);
            const color = getKeyColor(index);
            const isCenterKey = index === 10;
            
            return (
              <div
                key={index}
                className={`flex flex-col items-center justify-center py-2 border-r border-white/10 ${
                  isCenterKey ? 'bg-white/10' : ''
                }`}
                style={{ 
                  width: LANE_WIDTH,
                  borderBottom: `3px solid ${color}`,
                }}
              >
                <span 
                  className="text-xs font-bold"
                  style={{ color }}
                >
                  {label.degree}
                </span>
                <span 
                  className="text-[9px] opacity-60"
                  style={{ color }}
                >
                  {label.note.replace(/[°]/g, '')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/30 border-t border-white/10 text-xs text-white/40">
        <div className="flex items-center gap-4">
          <span>BPM: {bpm}</span>
          <span>Duration: {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Click to add • Double-click to delete • Drag to move</span>
          <span>Shift+Click to multi-select • Space to play</span>
        </div>
      </div>
    </div>
  );
};

export default ChartEditor;
