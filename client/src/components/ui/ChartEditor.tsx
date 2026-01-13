// ============================================
// Kalimba Hero - Chart Editor (Clone Hero Style)
// ============================================
// Visual timeline-based note editor for creating songs

import React, { useState, useRef, useCallback, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import {
  Play, Pause, ZoomIn, ZoomOut, Trash2,
  SkipBack, Music, Plus, Minus
} from 'lucide-react';
import { generateKalimbaLayout, getKeyColor, getKeyDisplayLabel } from '@/utils/frequencyMap';
import { initKalimbaAudio, playNote } from '@/utils/kalimbaAudio';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SongNote, TimeSignature } from '@/types/game';

interface ChartEditorProps {
  notes: SongNote[];
  bpm: number;
  timeSignature?: TimeSignature;
  duration: number;
  onNotesChange: (notes: SongNote[]) => void;
  onDurationChange: (duration: number) => void;
  onBpmChange?: (bpm: number) => void;
  onTimeSignatureChange?: (ts: TimeSignature) => void;
  authorTuning?: string;
  authorScale?: string;
  authorTineCount?: number;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  gridResolution?: number;
}

// Note grid constants
// Note grid constants
// Lane widths are dynamic now
const BEAT_HEIGHT = 80;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

// Generate unique ID
const BASE_LANE_WIDTH = 36;
const COMPACT_LANE_WIDTH = 26;

// Generate unique ID
const generateId = () => `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const ChartEditor = forwardRef<HTMLDivElement, ChartEditorProps>((props, ref) => {
  const {
    notes,
    bpm,
    timeSignature = '4/4',
    duration,
    onNotesChange,
    onDurationChange,
    onBpmChange: _onBpmChange,
    onTimeSignatureChange,
    authorTuning = 'C',
    authorScale = 'Major',
    authorTineCount = 17,
    onScroll,
    gridResolution = 16,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Expose the container ref to parent
  useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

  // Dynamic Kalimba Config
  const kalimbaKeys = useMemo(() => {
    return generateKalimbaLayout(authorTineCount, authorTuning, authorScale);
  }, [authorTineCount, authorTuning, authorScale]);

  const totalLanes = kalimbaKeys.length;
  // Use compact width for high key counts (e.g. 34)
  const laneWidth = totalLanes >= 30 ? COMPACT_LANE_WIDTH : BASE_LANE_WIDTH;
  const gridWidth = totalLanes * laneWidth;

  const [zoom, setZoom] = useState(1);
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [autoScroll, setAutoScroll] = useState(true); // Auto-scroll during playback
  const [isLeftMouseDown, setIsLeftMouseDown] = useState(false); // Track left mouse button for continuous adding
  const [isRightMouseDown, setIsRightMouseDown] = useState(false); // Track right mouse button for continuous deleting
  const [hoveredCell, setHoveredCell] = useState<{ time: number; keyIndex: number } | null>(null); // Track hovered grid cell

  // Grid division is automatically determined by grid resolution and time signature
  const gridDivision = useMemo(() => {
    const denominator = parseInt(timeSignature.split('/')[1]) || 4;
    // divisions per beat (if resolution is 16, and measure is 4 beats, division is 4)
    return Math.max(1, (gridResolution || 16) / denominator);
  }, [timeSignature, gridResolution]);
  const [totalBeats, setTotalBeats] = useState(Math.ceil(duration * bpm / 60));
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollTop: 0 });
  const [draggingNote, setDraggingNote] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false); // Track if we actually dragged
  const [clickedNoteId, setClickedNoteId] = useState<string | null>(null); // Track which note was clicked (for deletion on release)
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null); // Track mouse down position
  const [tempo, setTempo] = useState(bpm); // Tempo in BPM for playback (starts at song BPM)
  const [hoveredCellPos, setHoveredCellPos] = useState<{ time: number; keyIndex: number; x: number; y: number } | null>(null); // Track hovered cell position for highlight
  const [containerHeight, setContainerHeight] = useState(0); // Track container height for min grid height


  // Update tempo when bpm changes
  useEffect(() => {
    setTempo(bpm);
  }, [bpm]);
  const playIntervalRef = useRef<number | null>(null);
  const isInternalChangeRef = useRef(false); // Track internal vs external duration changes
  const audioInitializedRef = useRef(false);
  const previousDragKeyRef = useRef<number | null>(null); // Track previous key during drag for audio
  const playedNotesRef = useRef<Set<string>>(new Set()); // Track notes played during playback
  const previousPlayheadRef = useRef<number>(0); // Track previous playhead position
  const justFinishedDragRef = useRef<boolean>(false); // Track if we just finished dragging (to prevent accidental clicks)

  // Initialize audio on mount
  useEffect(() => {
    if (!audioInitializedRef.current) {
      initKalimbaAudio().catch(console.error);
      audioInitializedRef.current = true;
    }
  }, []);

  // Track container height
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate dimensions
  // Parse time signature (e.g., '4/4' -> beatsPerMeasure = 4)
  const beatsPerMeasure = parseInt(timeSignature.split('/')[0]);
  const beatDuration = 60 / bpm;
  // Ensure grid is at least as tall as the container so beat 0 is at the bottom
  const calculatedGridHeight = totalBeats * BEAT_HEIGHT * zoom;
  const gridHeight = Math.max(calculatedGridHeight, containerHeight);

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
  }, [duration, bpm, totalBeats]);

  // Update duration when beats change internally (via +/- buttons)
  const updateBeats = useCallback((newBeats: number) => {
    const clampedBeats = Math.max(4, newBeats);
    setTotalBeats(clampedBeats);
    isInternalChangeRef.current = true;
    const newDuration = (clampedBeats * 60) / bpm;
    onDurationChange(newDuration);
  }, [bpm, onDurationChange]);

  // Snap time to grid (always enabled)
  const snapTime = useCallback((time: number): number => {
    const gridSize = beatDuration / gridDivision;
    return Math.round(time / gridSize) * gridSize;
  }, [beatDuration, gridDivision]);

  // Convert Y position to time (inverted - 0 is at bottom)
  const yToTime = useCallback((y: number): number => {
    const invertedY = gridHeight - y;
    const time = (invertedY / (BEAT_HEIGHT * zoom)) * beatDuration;
    return snapTime(Math.max(0, time));
  }, [zoom, beatDuration, snapTime, gridHeight]);

  // Convert time to Y position (inverted - 0 is at bottom)
  // Always centers the note in the grid cell
  const timeToY = useCallback((time: number, centerInCell: boolean = true): number => {
    let y = (time / beatDuration) * BEAT_HEIGHT * zoom;

    // If centerInCell is true, snap to center of grid cell (always enabled)
    if (centerInCell) {
      const gridSize = beatDuration / gridDivision;
      const cellHeight = (gridSize / beatDuration) * BEAT_HEIGHT * zoom;
      // Snap time to grid cell
      const snappedTime = Math.round(time / gridSize) * gridSize;
      y = (snappedTime / beatDuration) * BEAT_HEIGHT * zoom;
      // Center in the cell by adding half cell height
      y += cellHeight / 2;
    }

    return gridHeight - y;
  }, [zoom, beatDuration, gridHeight, gridDivision]);

  // Handle mouse move over grid for hover feedback and continuous add/delete
  const handleGridMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!gridRef.current) return;

    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate hovered cell
    const keyIndex = Math.floor(x / laneWidth);

    // Calculate which cell the mouse is over based on Y position directly (more accurate)
    const cellHeight = (BEAT_HEIGHT * zoom) / gridDivision;
    const invertedY = gridHeight - y;
    const cellIndex = Math.floor(invertedY / cellHeight);

    // Validate cell index bounds
    const totalCells = totalBeats * gridDivision;
    if (cellIndex < 0 || cellIndex >= totalCells) {
      setHoveredCell(null);
      setHoveredCellPos(null);
      return;
    }

    // Calculate the top of the cell in normal coordinates (from top of grid)
    const cellTopY = gridHeight - ((cellIndex + 1) * cellHeight);

    // Calculate time for this cell
    const time = (cellIndex / gridDivision) * beatDuration;
    const snappedTime = snapTime(time);

    if (keyIndex >= 0 && keyIndex < totalLanes) {
      setHoveredCell({ time: snappedTime, keyIndex });

      // Set highlight position directly from cell calculation (no double conversion)
      setHoveredCellPos({
        time: snappedTime,
        keyIndex,
        x: keyIndex * laneWidth,
        y: cellTopY, // Top of the cell
      });

      // Handle continuous adding with left mouse button
      if (isLeftMouseDown && !draggingNote) {
        const threshold = beatDuration / gridDivision / 2;
        const existingNote = notes.find(n =>
          n.keyIndex === keyIndex &&
          Math.abs(n.time - snappedTime) < threshold
        );

        if (!existingNote) {
          const key = kalimbaKeys[keyIndex];
          const noteDuration = beatDuration / gridDivision;
          const newNote: SongNote = {
            id: generateId(),
            time: snappedTime,
            duration: noteDuration,
            keyIndex,
            note: key.noteName, // Using noteName as 'note'
            frequency: key.frequency,
          };
          onNotesChange([...notes, newNote].sort((a, b) => a.time - b.time));
          playNote(keyIndex, kalimbaKeys).catch(console.error);
        }
      }

      // Handle continuous deleting with right mouse button
      if (isRightMouseDown) {
        const threshold = beatDuration / gridDivision / 2;
        const noteToDelete = notes.find(n =>
          n.keyIndex === keyIndex &&
          Math.abs(n.time - snappedTime) < threshold
        );

        if (noteToDelete) {
          onNotesChange(notes.filter(n => n.id !== noteToDelete.id));
        }
      }
    }
  }, [yToTime, isLeftMouseDown, isRightMouseDown, draggingNote, notes, snapTime, beatDuration, gridDivision, zoom, onNotesChange, gridHeight, totalLanes, kalimbaKeys, totalBeats]);

  const handleGridMouseLeave = useCallback(() => {
    setHoveredCell(null);
    setHoveredCellPos(null);
  }, []);

  // Handle grid drag start (for scrolling) - must be defined before handleGridMouseDown
  const handleGridDragStart = useCallback((e: React.MouseEvent) => {
    // Don't start scrolling if clicking on a note or play button
    const target = e.target as HTMLElement;
    if (target.closest('[data-note-id]') || target.closest('[data-play-button]')) {
      return;
    }

    // Only scroll when dragging on empty grid (middle mouse button)
    if (gridRef.current && (e.target === gridRef.current || gridRef.current.contains(target))) {
      if (!draggingNote && e.button === 1) { // Middle mouse button for scrolling
        setIsDragging(true);
        setDragStart({
          x: e.clientX,
          y: e.clientY,
          scrollTop: containerRef.current?.scrollTop || 0,
        });
      }
    }
  }, [draggingNote]);

  // Handle left click on grid to add note (single click, continuous handled in mouse move)
  const handleGridClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only handle left click
    if (e.button !== 0) return;

    // Don't add note if we just finished dragging
    if (justFinishedDragRef.current) {
      justFinishedDragRef.current = false;
      return;
    }

    // Don't add note if we were dragging a note or clicking on a note
    const target = e.target as HTMLElement;
    if (target.closest('[data-note-id]') || target.closest('[data-play-button]')) {
      return;
    }

    if (isDragging || draggingNote) {
      return;
    }

    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const keyIndex = Math.floor(x / laneWidth);
    if (keyIndex < 0 || keyIndex >= totalLanes) return;

    // Use the same calculation as hover to ensure precision
    const cellHeight = (BEAT_HEIGHT * zoom) / gridDivision;
    const invertedY = gridHeight - y;
    const cellIndex = Math.floor(invertedY / cellHeight);

    // Validate cell index bounds
    const totalCells = totalBeats * gridDivision;
    if (cellIndex < 0 || cellIndex >= totalCells) return;

    const time = (cellIndex / gridDivision) * beatDuration;
    const snappedTime = snapTime(time);

    // Check if clicking near existing note (don't add if too close)
    const existingNote = notes.find(n =>
      n.keyIndex === keyIndex &&
      Math.abs(n.time - snappedTime) < beatDuration / gridDivision / 2
    );

    if (!existingNote) {
      const key = kalimbaKeys[keyIndex];
      const noteDuration = beatDuration / gridDivision;
      const newNote: SongNote = {
        id: generateId(),
        time: snappedTime,
        duration: noteDuration,
        keyIndex,
        note: key.noteName, // Using noteName as 'note'
        frequency: key.frequency,
      };
      onNotesChange([...notes, newNote].sort((a, b) => a.time - b.time));
      playNote(keyIndex, kalimbaKeys).catch(console.error);
    }
  }, [notes, snapTime, beatDuration, gridDivision, zoom, gridHeight, onNotesChange, isDragging, draggingNote, totalLanes, kalimbaKeys, totalBeats]);

  // Handle right click on grid to delete note
  const handleGridContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevent context menu

    const target = e.target as HTMLElement;
    if (target.closest('[data-note-id]') || target.closest('[data-play-button]')) {
      return;
    }

    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const keyIndex = Math.floor(x / laneWidth);
    if (keyIndex < 0 || keyIndex >= totalLanes) return;

    const time = snapTime(yToTime(y));
    const noteToDelete = notes.find(n =>
      n.keyIndex === keyIndex &&
      Math.abs(n.time - time) < beatDuration / gridDivision / 2
    );

    if (noteToDelete) {
      onNotesChange(notes.filter(n => n.id !== noteToDelete.id));
    }
  }, [notes, yToTime, snapTime, beatDuration, gridDivision, onNotesChange, totalLanes]);

  // Handle mouse down on grid
  const handleGridMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Track mouse button state
    if (e.button === 0) {
      setIsLeftMouseDown(true);
    } else if (e.button === 2) {
      setIsRightMouseDown(true);
    }

    // Also handle drag start for scrolling
    handleGridDragStart(e);
  }, [handleGridDragStart]);

  // Handle mouse up on grid
  const handleGridMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) {
      setIsLeftMouseDown(false);
    } else if (e.button === 2) {
      setIsRightMouseDown(false);
    }
  }, []);

  // Handle note drag start (or click for deletion)
  const handleNoteDragStart = useCallback((noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Only allow drag and drop with left mouse button
    if (e.button !== 0) return;

    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;

    // If note is not selected, select only this note
    if (!selectedNotes.has(noteId)) {
      setSelectedNotes(new Set([noteId]));
    }

    // Mark this note as clicked - will be deleted on release if no drag occurred
    setClickedNoteId(noteId);
    setHasDragged(false); // Reset drag flag
    setMouseDownPos({ x: e.clientX, y: e.clientY }); // Store initial mouse position
    setDraggingNote(noteId);
    previousDragKeyRef.current = note.keyIndex; // Initialize with current key
    const initialKeyY = timeToY(note.time, true);
    setDragOffset({
      x: e.clientX - rect.left - (note.keyIndex * laneWidth),
      y: e.clientY - rect.top - initialKeyY,
    });
  }, [notes, selectedNotes, timeToY]);

  // Handle note dragging
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingNote && mouseDownPos) {
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Check if we've moved a significant distance (more than 5px) from initial click
      const distance = Math.sqrt(
        Math.pow(e.clientX - mouseDownPos.x, 2) + Math.pow(e.clientY - mouseDownPos.y, 2)
      );
      if (distance > 5) {
        setHasDragged(true); // Mark that we actually dragged
      }

      const x = e.clientX - rect.left - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;

      const keyIndex = Math.max(0, Math.min(totalLanes - 1, Math.floor(x / laneWidth)));
      // Calculate time from Y position - account for note centering
      const time = yToTime(y);

      // Play sound when key changes during drag
      if (previousDragKeyRef.current !== keyIndex) {
        playNote(keyIndex, kalimbaKeys).catch(console.error);
        previousDragKeyRef.current = keyIndex;
      }

      // Move single note or all selected notes if dragging from selection
      const notesToMove = selectedNotes.has(draggingNote) && selectedNotes.size > 1
        ? Array.from(selectedNotes)
        : [draggingNote];

      if (notesToMove.length > 1) {
        // Move multiple notes - calculate offset from dragging note
        const draggedNote = notes.find(n => n.id === draggingNote);
        if (draggedNote) {
          // Get new position of dragged note
          const newKeyIndex = Math.max(0, Math.min(totalLanes - 1, Math.floor(x / laneWidth)));
          const newTime = yToTime(y);

          // Calculate deltas
          const deltaKey = newKeyIndex - draggedNote.keyIndex;
          const deltaTime = newTime - draggedNote.time;

          // Play sound when key changes during drag
          if (previousDragKeyRef.current !== newKeyIndex) {
            playNote(newKeyIndex, kalimbaKeys).catch(console.error);
            previousDragKeyRef.current = newKeyIndex;
          }

          // Move all selected notes by the same delta
          onNotesChange(notes.map(n => {
            if (n.id && notesToMove.includes(n.id)) {
              const finalKeyIndex = Math.max(0, Math.min(totalLanes - 1, n.keyIndex + deltaKey));
              const finalTime = Math.max(0, n.time + deltaTime);
              const key = kalimbaKeys[finalKeyIndex];
              // Safety check if key is out of bounds
              if (!key) return n;
              return {
                ...n,
                keyIndex: finalKeyIndex,
                time: finalTime,
                note: key.noteName,
                frequency: key.frequency,
              };
            }
            return n;
          }));
        }
      } else {
        // Move single note
        onNotesChange(notes.map(n => {
          if (n.id === draggingNote) {
            const key = kalimbaKeys[keyIndex];
            // Safety check
            if (!key) return n;
            return {
              ...n,
              keyIndex,
              time: Math.max(0, time),
              note: key.noteName,
              frequency: key.frequency,
            };
          }
          return n;
        }));
      }
    } else if (isDragging && containerRef.current) {
      // Drag to scroll
      const deltaY = e.clientY - dragStart.y;
      containerRef.current.scrollTop = dragStart.scrollTop - deltaY;
    }
  }, [draggingNote, isDragging, dragOffset, dragStart, mouseDownPos, notes, selectedNotes, onNotesChange, yToTime, zoom, totalLanes, kalimbaKeys]);

  // Handle mouse up
  const handleMouseUp = useCallback((_e?: React.MouseEvent) => {
    // If we clicked on a note but didn't drag it, delete the note
    // Only delete if it was a simple click (not a drag)
    const wasDragging = hasDragged && draggingNote !== null;
    const shouldDelete = clickedNoteId && !hasDragged && draggingNote === clickedNoteId;

    // If we were dragging, mark that we just finished to prevent accidental clicks
    if (wasDragging) {
      justFinishedDragRef.current = true;
      // Clear the flag after a short delay to allow normal clicks again
      setTimeout(() => {
        justFinishedDragRef.current = false;
      }, 100);
    }

    // Always reset drag state first
    const noteToDelete = shouldDelete ? clickedNoteId : null;
    setDraggingNote(null);
    setIsDragging(false);
    setClickedNoteId(null);
    setHasDragged(false);
    setMouseDownPos(null);
    previousDragKeyRef.current = null;

    // Delete after state reset to avoid race conditions
    if (noteToDelete) {
      onNotesChange(notes.filter(n => n.id !== noteToDelete));
      setSelectedNotes(prev => {
        const next = new Set(prev);
        next.delete(noteToDelete);
        return next;
      });
    }
  }, [clickedNoteId, hasDragged, draggingNote, notes, onNotesChange]);

  // Handle playback - uses playbackSpeed multiplier
  useEffect(() => {
    if (isPlaying) {
      // Clear any existing interval first
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }

      const startTime = Date.now();
      const startPlayhead = playhead;

      // Reset played notes when starting playback from a new position
      // Only clear if playhead changed significantly (more than 0.1 seconds)
      if (Math.abs(previousPlayheadRef.current - startPlayhead) > 0.1) {
        playedNotesRef.current.clear();
      }
      previousPlayheadRef.current = startPlayhead;

      playIntervalRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        // Apply tempo (speed multiplier based on tempo vs bpm)
        const tempoMultiplier = tempo / bpm;
        const newTime = startPlayhead + (elapsed * tempoMultiplier);
        const prevTime = previousPlayheadRef.current;

        if (newTime >= duration) {
          setPlayhead(0);
          setIsPlaying(false);
          playedNotesRef.current.clear();
          previousPlayheadRef.current = 0;
        } else {
          setPlayhead(newTime);

          // Check for notes that should play (playhead crossed their start time)
          notes.forEach(note => {
            // Only play if we haven't played this note yet and playhead just crossed its start time
            // Handle notes at time 0 by checking if we're starting playback or if time crossed
            const noteId = note.id;
            const shouldPlay = noteId && !playedNotesRef.current.has(noteId) &&
              newTime >= note.time &&
              (prevTime < note.time || (note.time === startPlayhead && newTime >= startPlayhead));

            if (shouldPlay && noteId) {
              playedNotesRef.current.add(noteId);
              playNote(note.keyIndex, kalimbaKeys).catch(console.error);
            }
          });

          previousPlayheadRef.current = newTime;

          // Auto-scroll to keep playhead visible if enabled
          if (autoScroll && containerRef.current && gridRef.current) {
            const playheadY = timeToY(newTime, false);
            const containerHeight = containerRef.current.clientHeight;
            const scrollTop = containerRef.current.scrollTop;
            const playheadViewportY = playheadY - scrollTop;

            // Scroll if playhead is near edges (within 20% of viewport)
            if (playheadViewportY < containerHeight * 0.2) {
              containerRef.current.scrollTop = Math.max(0, playheadY - containerHeight * 0.2);
            } else if (playheadViewportY > containerHeight * 0.8) {
              containerRef.current.scrollTop = playheadY - containerHeight * 0.8;
            }
          }
        }
      }, 16);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
      // Reset played notes when stopping
      playedNotesRef.current.clear();
      previousPlayheadRef.current = playhead;
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, playhead, duration, timeToY, notes, tempo, bpm, autoScroll, kalimbaKeys]);

  // Delete selected notes
  const deleteSelectedNotes = useCallback(() => {
    onNotesChange(notes.filter(n => n.id ? !selectedNotes.has(n.id) : true));
    setSelectedNotes(new Set());
  }, [notes, selectedNotes, onNotesChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if using an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(p => !p);
      }
      // Delete/Backspace removed as requested by user
      if (e.code === 'Home') {
        setPlayhead(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelectedNotes]);

  // Scroll to bottom on mount and when grid height changes (so we start at beat 1)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [gridHeight]);

  // Global mouse up listener to handle mouse button release outside grid
  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        setIsLeftMouseDown(false);
      } else if (e.button === 2) {
        setIsRightMouseDown(false);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      // Only prevent if clicking on grid area
      const target = e.target as HTMLElement;
      if (gridRef.current?.contains(target)) {
        e.preventDefault();
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // Render beat grid lines - number every cell, not just beats
  const gridLines = useMemo(() => {
    const lines: React.ReactNode[] = [];
    const cellHeight = (BEAT_HEIGHT * zoom) / gridDivision;
    const totalCells = totalBeats * gridDivision;

    for (let cell = 0; cell <= totalCells; cell++) {
      const y = gridHeight - (cell * cellHeight);
      const beat = Math.floor(cell / gridDivision);
      const subBeat = cell % gridDivision;
      const isMeasure = beat % beatsPerMeasure === 0 && subBeat === 0;
      const isBeatLine = subBeat === 0;

      lines.push(
        <div
          key={`cell-${cell}`}
          className={`absolute left-0 pointer-events-none ${isMeasure ? 'border-t-2 border-white/40' : isBeatLine ? 'border-t border-white/15' : 'border-t border-white/5'
            }`}
          style={{ top: y, width: gridWidth }}
        >
          {/* Number every cell - centered vertically in the cell */}
          {cell < totalCells && (
            <span
              className="absolute -left-10 text-xs text-white/50 font-mono select-none flex items-center"
              style={{
                top: `-${cellHeight / 2}px`,
                height: `${cellHeight}px`,
                transform: 'translateY(-50%)',
                lineHeight: '1',
              }}
            >
              {cell + 1}
            </span>
          )}
        </div>
      );
    }

    return lines;
  }, [totalBeats, zoom, gridDivision, gridHeight, beatsPerMeasure, gridWidth]);

  // Generate play buttons for each grid row (cell) - in the left gutter area
  const playButtons = useMemo(() => {
    const buttons: React.ReactNode[] = [];
    const cellHeight = (BEAT_HEIGHT * zoom) / gridDivision;
    const totalCells = totalBeats * gridDivision;

    for (let cell = 0; cell < totalCells; cell++) {
      const y = gridHeight - (cell * cellHeight);
      const time = (cell / gridDivision) * beatDuration;

      buttons.push(
        <button
          key={`play-${cell}`}
          data-play-button
          onClick={(e) => {
            e.stopPropagation();
            if (isPlaying && playIntervalRef.current) {
              clearInterval(playIntervalRef.current);
              playIntervalRef.current = null;
            }
            playedNotesRef.current.clear();
            previousPlayheadRef.current = time;
            setPlayhead(time);
            setIsPlaying(true);
          }}
          className="absolute left-0 top-0 w-10 h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer z-40 group pointer-events-auto"
          style={{
            top: `${y - cellHeight / 2}px`,
            height: `${cellHeight}px`,
          }}
          title={`Play from cell ${cell + 1}`}
        >
          <Play className="w-3 h-3 text-cyan-400 group-hover:text-cyan-300 transition-colors" fill="currentColor" />
        </button>
      );
    }

    return buttons;
  }, [totalBeats, zoom, gridDivision, gridHeight, beatDuration, isPlaying]);

  return (
    <div
      className="flex flex-col h-full select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-3 p-3 bg-black/60 border-b border-white/10 flex-wrap backdrop-blur-sm">
        {/* Playback controls */}
        <div className="flex items-center gap-1 bg-white/10 border border-white/10 rounded-lg p-1">
          <button
            onClick={() => setPlayhead(0)}
            className="p-2 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Go to start (Home)"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded transition-colors cursor-pointer ${isPlaying
              ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20'
              : 'bg-cyan-500 text-white hover:bg-cyan-600 shadow-lg shadow-cyan-500/20'
              }`}
            title="Play/Pause (Space)"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>

        {/* Time display */}
        <div className="px-3 py-1.5 bg-black/60 border border-white/10 rounded-lg font-mono text-sm text-cyan-400 min-w-[90px] text-center shadow-inner">
          {Math.floor(playhead / 60)}:{String(Math.floor(playhead % 60)).padStart(2, '0')}.
          {String(Math.floor((playhead % 1) * 100)).padStart(2, '0')}
        </div>

        {/* Time Signature control (determines grid divisions) */}
        {onTimeSignatureChange && (
          <div className="flex items-center gap-1 bg-white/10 border border-white/10 rounded-lg p-1">
            <span className="px-2 text-xs text-white/70 font-bold uppercase">Time Sig</span>
            <Select
              value={timeSignature}
              onValueChange={(value) => onTimeSignatureChange(value as TimeSignature)}
            >
              <SelectTrigger className="w-[80px] h-8 bg-black/40 border-white/20 text-white font-mono text-sm hover:bg-white/10 focus:ring-cyan-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#111] border-white/20">
                <SelectItem value="4/4" className="text-white hover:bg-white/10 cursor-pointer">4/4</SelectItem>
                <SelectItem value="3/4" className="text-white hover:bg-white/10 cursor-pointer">3/4</SelectItem>
                <SelectItem value="2/4" className="text-white hover:bg-white/10 cursor-pointer">2/4</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Playback speed control (multiplier based on BPM) */}
        <div className="flex items-center gap-1 bg-white/10 border border-white/10 rounded-lg p-1">
          <span className="px-2 text-xs text-white/70 font-bold uppercase">Speed</span>
          <button
            onClick={() => setTempo(Math.max(30, tempo - 10))}
            className="p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Decrease playback speed by 10 BPM"
          >
            <Minus className="w-3 h-3" />
          </button>
          <Input
            type="number"
            min="30"
            max="200"
            value={tempo}
            onChange={(e) => setTempo(Math.max(30, Math.min(200, Number(e.target.value) || 120)))}
            className="w-16 px-2 py-0.5 text-sm text-white font-mono text-center bg-black/40 border-white/20 focus:border-cyan-500 h-8"
          />
          <button
            onClick={() => setTempo(Math.min(200, tempo + 10))}
            className="p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Increase playback speed by 10 BPM"
          >
            <Plus className="w-3 h-3" />
          </button>
          <span className="px-2 text-xs text-white/50">BPM</span>
        </div>

        {/* Beats control */}
        <div className="flex items-center gap-1 bg-white/10 border border-white/10 rounded-lg p-1">
          <span className="px-2 text-xs text-white/70 font-bold uppercase">Beats</span>
          <button
            onClick={() => updateBeats(Math.max(4, totalBeats - 1))}
            className="p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Remove 1 beat"
          >
            <Minus className="w-3 h-3" />
          </button>
          <Input
            type="number"
            min="4"
            max="999"
            value={totalBeats}
            onChange={(e) => updateBeats(Number(e.target.value) || 4)}
            className="w-14 px-2 py-0.5 text-sm text-white font-mono text-center bg-black/40 border-white/20 focus:border-cyan-500 h-8"
          />
          <button
            onClick={() => updateBeats(totalBeats + 1)}
            className="p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Add 1 beat"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={() => updateBeats(totalBeats + 8)}
            className="px-2 py-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors text-xs font-semibold cursor-pointer"
            title="Add 8 beats"
          >
            +8
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-white/10 border border-white/10 rounded-lg p-1">
          <button
            onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - 0.25))}
            className="p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Zoom out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="px-2 text-xs text-white/80 min-w-[45px] text-center font-mono">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 0.25))}
            className="p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Zoom in (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Auto-scroll checkbox */}
        <div className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 h-10">
          <Checkbox
            id="auto-scroll"
            checked={autoScroll}
            onCheckedChange={(checked) => setAutoScroll(checked === true)}
            className="border-white/30 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
          />
          <label htmlFor="auto-scroll" className="text-xs text-white/80 cursor-pointer select-none font-bold uppercase tracking-wide">
            Auto-scroll
          </label>
        </div>

        <div className="flex-1" />

        {/* Note count */}
        <div className="flex items-center gap-2 text-sm text-white/60 px-2 font-mono">
          <Music className="w-4 h-4" />
          <span>{notes.length} notes</span>
        </div>

        {/* Delete selected */}
        {selectedNotes.size > 0 && (
          <button
            onClick={deleteSelectedNotes}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors text-sm cursor-pointer"
            title="Delete selected (Del)"
          >
            <Trash2 className="w-4 h-4" />
            <span>{selectedNotes.size}</span>
          </button>
        )}
      </div>

      {/* Main editor area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left gutter with play buttons and beat numbers */}
        <div className="w-10 flex-shrink-0 bg-black/20 relative" />

        {/* Scrollable grid area */}
        <div
          ref={containerRef}
          onScroll={onScroll}
          className="flex-1 overflow-auto relative"
          style={{ cursor: isDragging ? 'grabbing' : 'default' }}
        >
          {/* Play buttons for each row - positioned in left gutter */}
          <div className="absolute left-0 top-0 w-10 h-full z-30 pointer-events-none">
            {playButtons}
          </div>

          {/* Grid container */}
          <div
            ref={gridRef}
            className="relative"
            style={{
              width: gridWidth,
              height: gridHeight,
              minHeight: '100%',
              marginLeft: '40px',
              marginRight: '40px',
              cursor: hoveredCell ? 'pointer' : (isDragging ? 'grabbing' : 'default'),
            }}
            onClick={handleGridClick}
            onContextMenu={handleGridContextMenu}
            onMouseDown={handleGridMouseDown}
            onMouseUp={handleGridMouseUp}
            onMouseMove={handleGridMouseMove}
            onMouseLeave={handleGridMouseLeave}
          >
            {/* Lane backgrounds */}
            {kalimbaKeys.map((_, index) => {
              const color = getKeyColor(index, totalLanes);
              return (
                <div
                  key={`lane-${index}`}
                  className="absolute top-0 bottom-0 border-r border-white/10"
                  style={{
                    left: index * laneWidth,
                    width: laneWidth,
                    backgroundColor: `${color}08`,
                  }}
                />
              );
            })}

            {/* Grid lines */}
            {gridLines}

            {/* Hover highlight for cell */}
            {hoveredCellPos && !draggingNote && (
              (() => {
                const existingNote = notes.find(n =>
                  n.keyIndex === hoveredCellPos.keyIndex &&
                  Math.abs(n.time - hoveredCellPos.time) < beatDuration / gridDivision / 2
                );

                // Only show highlight if there's no existing note
                if (!existingNote) {
                  const color = getKeyColor(hoveredCellPos.keyIndex, totalLanes);
                  const cellHeight = (BEAT_HEIGHT * zoom) / gridDivision;
                  return (
                    <div
                      className="absolute rounded pointer-events-none transition-opacity"
                      style={{
                        left: hoveredCellPos.x + 2,
                        top: hoveredCellPos.y,
                        width: laneWidth - 4,
                        height: cellHeight - 2,
                        backgroundColor: `${color}30`,
                        border: `2px solid ${color}`,
                        zIndex: 5,
                      }}
                    />
                  );
                }
                return null;
              })()
            )}

            {/* Notes */}
            {notes.map((note) => {
              // Safety check for keys out of bounds when switching layouts
              if (note.keyIndex >= totalLanes) return null;

              const color = getKeyColor(note.keyIndex, totalLanes);
              const key = kalimbaKeys[note.keyIndex];
              const notation = key ? getKeyDisplayLabel(key) : { degree: '?', note: '?' };

              // Calculate note size based on its duration relative to beat
              const gridCellHeight = (BEAT_HEIGHT * zoom) / gridDivision;
              const noteHeight = Math.max(18, Math.min(gridCellHeight - 1, ((note.duration || 0) / beatDuration) * BEAT_HEIGHT * zoom));

              // Align note perfectly with grid cell (same calculation as highlight)
              // Calculate which cell this note belongs to based on time
              const cellIndex = Math.floor((note.time / beatDuration) * gridDivision);
              // Calculate the top of the cell in normal coordinates (from top of grid)
              const cellTopY = gridHeight - ((cellIndex + 1) * gridCellHeight);
              // Center note vertically in the cell
              const y = cellTopY + (gridCellHeight / 2) - (noteHeight / 2);
              const x = note.keyIndex * laneWidth;
              const isSelected = note.id ? selectedNotes.has(note.id) : false;
              const isBeingDragged = note.id && draggingNote === note.id;

              return (
                <motion.div
                  key={note.id}
                  className={`absolute rounded cursor-grab active:cursor-grabbing transition-shadow ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent' : ''
                    } ${isBeingDragged ? 'opacity-70 scale-110' : ''}`}
                  style={{
                    left: x + 1,
                    top: y,
                    width: laneWidth - 2,
                    height: noteHeight,
                    backgroundColor: color,
                    boxShadow: `0 0 10px ${color}90, inset 0 1px 0 rgba(255,255,255,0.4)`,
                    zIndex: isBeingDragged ? 100 : 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  data-note-id={note.id}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    const noteId = note.id;
                    if (!noteId) return;

                    // Handle right click to delete immediately
                    if (e.button === 2) {
                      setIsRightMouseDown(true);
                      onNotesChange(notes.filter(n => n.id !== noteId));
                      return;
                    }
                    handleNoteDragStart(noteId, e);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Delete note on right click
                    onNotesChange(notes.filter(n => n.id !== note.id));
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle selection only after drag completes
                    // Click without drag will delete in mouseUp (left click only)
                    if (hasDragged && note.id) {
                      // Select this note (toggle if already selected)
                      const noteId = note.id;
                      setSelectedNotes(prev => {
                        const next = new Set(prev);
                        if (next.has(noteId)) {
                          next.delete(noteId);
                        } else {
                          next.add(noteId);
                        }
                        return next;
                      });
                    }
                  }}
                >
                  {/* Notation label inside note */}
                  <span
                    style={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '10px',
                      fontWeight: 600,
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                      pointerEvents: 'none',
                      userSelect: 'none',
                    }}
                  >
                    {notation.degree}
                  </span>
                </motion.div>
              );
            })}

            {/* Playhead */}
            <div
              className="absolute left-0 h-1 bg-cyan-400 pointer-events-none z-50 rounded-full"
              style={{
                top: timeToY(playhead, false) - 2,
                width: gridWidth,
                boxShadow: '0 0 15px #00E5FF, 0 0 30px #00E5FF50',
              }}
            />
          </div>
        </div>
      </div>

      {/* Key lanes at bottom */}
      <div className="flex bg-black/40 border-t border-white/20">
        <div className="w-10 flex-shrink-0" />
        <div className="flex" style={{ marginLeft: '40px' }}>
          {kalimbaKeys.map((key, index) => {
            const label = getKeyDisplayLabel(key);
            const color = getKeyColor(index, totalLanes);
            const isCenterKey = index === Math.floor(totalLanes / 2);
            const isChromatic = key.isChromatic;
            const isHighCount = totalLanes >= 34;

            return (
              <div
                key={index}
                className={`flex flex-col items-center justify-center border-r border-white/10 ${isCenterKey ? 'bg-white/10' : ''
                  } ${isChromatic ? 'bg-black/40' : ''}`}
                style={{
                  width: laneWidth,
                  borderBottom: `3px solid ${color}`,
                  paddingTop: isHighCount ? '4px' : '8px',
                  paddingBottom: isHighCount ? '4px' : '8px',
                }}
              >
                <div className={`flex flex-col items-center gap-0.5 ${isHighCount ? 'rotate-[-90deg] origin-center translate-y-2' : ''}`}>
                  <span
                    className={`${isHighCount ? 'text-[10px]' : 'text-xs'} font-bold whitespace-nowrap`}
                    style={{ color }}
                  >
                    {label.degree}
                  </span>
                  <span
                    className={`${isHighCount ? 'text-[8px]' : 'text-[9px]'} opacity-60 whitespace-nowrap`}
                    style={{ color }}
                  >
                    {label.note.replace(/[°]/g, '')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-6 py-2 bg-black/60 border-t border-white/10 text-xs text-white/60 font-medium backdrop-blur-sm">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2"><span className="text-cyan-400">BPM:</span> {bpm}</span>
          <span className="flex items-center gap-2"><span className="text-cyan-400">Duration:</span> {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</span>
        </div>
        <div className="flex items-center gap-6 opacity-60 hover:opacity-100 transition-opacity">
          <span><span className="text-white">L-Click</span> Add</span>
          <span><span className="text-white">R-Click</span> Delete</span>
          <span><span className="text-white">Hold</span> Continuous</span>
          <span><span className="text-white">Space</span> Play/Pause</span>
        </div>
      </div>
    </div>
  );
});

export default ChartEditor;
