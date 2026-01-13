// ============================================
// Kalimba Hero - Song Builder Component
// ============================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Save, Upload, Download, RefreshCw, Edit3, Grid, FileText, Wand2, Cloud, Globe, Zap } from 'lucide-react';
import { AuroraBackground } from '@/components/ui/AuroraBackground';
import { AutoTranscribeModal } from './AutoTranscribeModal';
import { cn } from '@/lib/utils';
import type { SongNote } from '@/types/game';
import { Input } from './input';
import { useUIStore } from '@/stores/uiStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { ChartEditor } from './ChartEditor';
import {
  createSongFromNotation,
  exportSongToJSON,
  importSongFromJSON,
  notesToNotation,
} from '@/utils/songParser';
import { SCALES } from '@/utils/frequencyMap';
import type { Song, Difficulty, TimeSignature } from '@/types/game';
interface SongBuilderProps {
  onBack: () => void;
  onTestPlay: (song: Song) => void;
  onSave: (song: Song, options?: { cloud?: boolean; publish?: boolean }) => void;
  onChange?: (song: Partial<Song>) => void;
  initialSong?: Song;
  isAuthenticated?: boolean;
}

type EditorMode = 'text' | 'chart';

const ICONS = [
  { id: 'music', emoji: '🎵' },
  { id: 'star', emoji: '⭐' },
  { id: 'heart', emoji: '❤️' },
  { id: 'snowflake', emoji: '❄️' },
  { id: 'sword', emoji: '⚔️' },
  { id: 'bell', emoji: '🔔' },
  { id: 'zap', emoji: '⚡' },
];

const SONG_CATEGORIES = [
  'Pop', 'Anime', 'Rock', 'OST', 'Classical', 'Game',
  'Valentine', 'Christmas', 'Halloween', 'Meme', 'Disney',
  'TV', 'K-pop', 'Movies', 'Nursery rhymes', 'Traditional', 'Worship'
];

const COLORS = [
  '#00E5FF', '#FF6B6B', '#6BCB77', '#FFD93D',
  '#9B59B6', '#FF8E53', '#E91E63', '#4D96FF',
];

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

// Generate unique ID
const generateId = () => `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const SongBuilder: React.FC<SongBuilderProps> = ({
  onBack,
  onTestPlay,
  onSave,
  onChange,
  initialSong,
  isAuthenticated = false,
}) => {
  const [songId, setSongId] = useState(initialSong?.id || generateId());
  const [editorMode, setEditorMode] = useState<EditorMode>('chart');
  const [title, setTitle] = useState(initialSong?.title || '');
  const [artist, setArtist] = useState(initialSong?.artist || '');
  const [bpm, setBpm] = useState(initialSong?.bpm || 120);
  const [timeSignature, setTimeSignature] = useState<TimeSignature>(
    initialSong?.timeSignature || '4/4'
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(
    (initialSong?.difficulty as Difficulty) || 'medium'
  );
  const [icon, setIcon] = useState(initialSong?.icon || 'music');
  const [iconColor, setIconColor] = useState(initialSong?.iconColor || '#00E5FF');
  const [notation, setNotation] = useState(initialSong?.notation || '');
  const [notes, setNotes] = useState<SongNote[]>(initialSong?.notes || []);
  const [duration, setDuration] = useState(initialSong?.duration || 30);
  const [isPublic, setIsPublic] = useState(false); // Default to private cloud save
  const [syncToCloud, setSyncToCloud] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState(initialSong?.youtubeUrl || '');
  const [category, setCategory] = useState(initialSong?.category || '');
  const [authorTuning, setAuthorTuning] = useState(initialSong?.authorTuning || 'C');
  const [authorScale, setAuthorScale] = useState(initialSong?.authorScale || 'Major');
  const [authorTineCount, setAuthorTineCount] = useState(initialSong?.authorTineCount || 17);
  const [jsonOutput, setJsonOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(true);
  const [gridResolution, setGridResolution] = useState(16); // 1/16, 1/32, etc

  const { openAuth } = useUIStore();

  // Track if initial load happened to avoid double-triggers
  const [isLoaded, setIsLoaded] = useState(false);

  // Sync all state when initialSong changes (e.g., when editing a different song)
  useEffect(() => {
    if (initialSong && !isLoaded) {
      setSongId(initialSong.id);
      setTitle(initialSong.title);
      setArtist(initialSong.artist);
      setBpm(initialSong.bpm);
      setDifficulty(initialSong.difficulty as Difficulty);
      setIcon(initialSong.icon || 'music');
      setIconColor(initialSong.iconColor || '#00E5FF');
      setNotation(initialSong.notation || '');
      setNotes(initialSong.notes || []);
      setDuration(initialSong.duration || 30);
      setTimeSignature(initialSong.timeSignature || '4/4');
      setIsPublic(initialSong.isPublic || false);
      setSyncToCloud(initialSong.isCloud || false);
      setYoutubeUrl(initialSong.youtubeUrl || '');
      setCategory(initialSong.category || '');
      setAuthorTuning(initialSong.authorTuning || 'C');
      setAuthorScale(initialSong.authorScale || 'Major');
      setAuthorTineCount(initialSong.authorTineCount || 17);
      setError(null);
      setJsonOutput('');
      setIsLoaded(true);
    } else if (!initialSong && !isLoaded) {
      // Reset to defaults for new song
      setSongId(generateId());
      setTitle('');
      setArtist('');
      setBpm(120);
      setTimeSignature('4/4');
      setDifficulty('medium');
      setIcon('music');
      setIconColor('#00E5FF');
      setNotation('');
      setNotes([]);
      setDuration(30);
      setYoutubeUrl('');
      setCategory('');
      setError(null);
      setJsonOutput('');
      setIsLoaded(true);
    }
  }, [initialSong, isLoaded]);

  // Generate song from current inputs (memoized for effects)
  const getCurrentSongState = useCallback((): Partial<Song> => {
    return {
      id: songId,
      title: title.trim(),
      artist: artist.trim() || 'Unknown',
      bpm,
      timeSignature,
      difficulty,
      icon,
      iconColor,
      notation: editorMode === 'text' ? notation : notesToNotation(notes, bpm, timeSignature, authorTuning, authorScale, authorTineCount),
      notes,
      duration: editorMode === 'chart' ? Math.max(duration, ...notes.map(n => n.time + (n.duration || 0))) : duration,
      youtubeUrl,
      category,
      authorTuning,
      authorScale,
      authorTineCount,
    };
  }, [songId, title, artist, bpm, timeSignature, difficulty, icon, iconColor, notation, notes, duration, editorMode, youtubeUrl, category, authorTuning, authorScale, authorTineCount]);

  // Auto-trigger onChange when state changes
  useEffect(() => {
    if (isLoaded && onChange) {
      const state = getCurrentSongState();
      onChange(state);
    }
  }, [songId, title, artist, bpm, timeSignature, difficulty, icon, iconColor, notation, notes, duration, isLoaded, onChange, getCurrentSongState, youtubeUrl, authorTuning, authorTineCount]);

  // Track if chart has been modified manually
  const [isDirty, setIsDirty] = useState(false);
  const notationRef = useRef<HTMLTextAreaElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [isSyncingScroll, setIsSyncingScroll] = useState(false);

  const handleNotationScroll = () => {
    if (isSyncingScroll || !notationRef.current || !chartRef.current) return;
    setIsSyncingScroll(true);
    const notationEl = notationRef.current;
    const chartEl = chartRef.current;

    const percentage = notationEl.scrollTop / (notationEl.scrollHeight - notationEl.clientHeight);
    chartEl.scrollTop = percentage * (chartEl.scrollHeight - chartEl.clientHeight);

    // Tiny delay to avoid feedback loops
    setTimeout(() => setIsSyncingScroll(false), 50);
  };

  const handleChartScroll = () => {
    if (isSyncingScroll || !notationRef.current || !chartRef.current) return;
    setIsSyncingScroll(true);
    const notationEl = notationRef.current;
    const chartEl = chartRef.current;

    const percentage = chartEl.scrollTop / (chartEl.scrollHeight - chartEl.clientHeight);
    notationEl.scrollTop = percentage * (notationEl.scrollHeight - notationEl.clientHeight);

    setTimeout(() => setIsSyncingScroll(false), 50);
  };


  // Wrap setNotes to track dirty state
  const handleNotesChange = useCallback((newNotes: SongNote[]) => {
    setNotes(newNotes);
    setIsDirty(true);
  }, []);

  // Manual Sync: Notation -> Grid (Chart)
  const handleSyncToGrid = useCallback(() => {
    if (!notation.trim()) return;
    try {
      const song = createSongFromNotation(notation, {
        title: title.trim() || 'Untitled',
        artist: artist.trim() || 'Unknown',
        bpm,
        timeSignature,
        difficulty,
        icon,
        iconColor,
        authorTuning,
        authorScale,
        authorTineCount,
      });
      setNotes(song.notes);
      setDuration(song.duration);
      setError(null);
      setIsDirty(false); // Grid is now synced with Text
      // setBackupNotation(notation);
    } catch (err) {
      setError('Failed to parse notation');
      console.error(err);
    }
  }, [notation, title, artist, bpm, timeSignature, difficulty, icon, iconColor, authorTuning, authorScale, authorTineCount]);

  // Manual Sync: Grid (Chart) -> Notation (Text)
  const handleSyncToText = useCallback(() => {
    const newNotation = notes.length > 0
      ? notesToNotation(notes, bpm, timeSignature, authorTuning, authorScale, authorTineCount)
      : '';
    setNotation(newNotation);
    setIsDirty(false); // Text is now synced with Grid
    // setBackupNotation(newNotation);
  }, [notes, bpm, timeSignature, authorTuning, authorScale, authorTineCount]);

  // Generate song from current inputs
  const generateSong = useCallback((): Song | null => {
    if (!title.trim()) {
      setError('Please enter a title');
      return null;
    }

    let songNotes: SongNote[] = [];
    let songDuration = duration;
    let songNotation = notation;

    if (editorMode === 'text') {
      if (!notation.trim()) {
        setError('Please enter some notation');
        return null;
      }

      try {
        setError(null);
        const song = createSongFromNotation(notation, {
          title: title.trim(),
          artist: artist.trim() || 'Unknown',
          bpm,
          timeSignature,
          difficulty,
          icon,
          iconColor,
          authorTuning,
          authorScale,
          authorTineCount,
        });
        return song;
      } catch (err) {
        setError('Failed to parse notation. Check your format.');
        return null;
      }
    } else {
      // Chart editor mode
      if (notes.length === 0) {
        setError('Please add some notes to the chart');
        return null;
      }

      songNotes = notes;
      songDuration = Math.max(duration, ...notes.map(n => n.time + (n.duration || 0))) + 2;
      songNotation = notesToNotation(notes, bpm, timeSignature, authorTuning, authorScale, authorTineCount);
    }

    const song: Song = {
      id: songId,
      title: title.trim(),
      artist: artist.trim() || 'Unknown',
      bpm,
      timeSignature,
      difficulty,
      icon,
      iconColor,
      notation: songNotation,
      notes: songNotes,
      duration: songDuration,
      isCloud: syncToCloud,
      isPublic: isPublic,
      cloudId: initialSong?.cloudId,
      youtubeUrl,
      category,
      authorTuning,
      authorTineCount,
    };

    setError(null);
    return song;
  }, [title, artist, bpm, timeSignature, difficulty, icon, iconColor, notation, notes, duration, editorMode, initialSong, syncToCloud, isPublic, youtubeUrl, authorTuning, authorTineCount]);

  // Handle test play
  const handleTestPlay = () => {
    const song = generateSong();
    if (song) {
      onTestPlay(song);
    }
  };

  // Handle save
  const handleSave = () => {
    const song = generateSong();
    if (song) {
      onSave(song, { cloud: syncToCloud, publish: isPublic });
    }
  };

  // Generate JSON preview
  const handleGenerateJSON = () => {
    const song = generateSong();
    if (song) {
      setJsonOutput(exportSongToJSON(song));
    }
  };

  // Load from JSON
  const handleLoadJSON = () => {
    const input = prompt('Paste your song JSON:');
    if (input) {
      const song = importSongFromJSON(input);
      if (song) {
        setTitle(song.title);
        setArtist(song.artist);
        setBpm(song.bpm);
        setDifficulty(song.difficulty as Difficulty);
        setIcon(song.icon || 'music');
        setIconColor(song.iconColor || '#00E5FF');
        setNotation(song.notation || '');
        setNotes(song.notes || []);
        setDuration(song.duration || 30);
        setDuration(song.duration || 30);
        setYoutubeUrl(song.youtubeUrl || '');
        setCategory(song.category || 'Pop');
        setAuthorTuning(song.authorTuning || 'C');
        setAuthorScale(song.authorScale || 'Major');
        setAuthorTineCount(song.authorTineCount || 17);
        setError(null);
      } else {
        setError('Invalid JSON format');
      }
    }
  };

  // Copy JSON to clipboard
  const handleCopyJSON = () => {
    if (jsonOutput) {
      navigator.clipboard.writeText(jsonOutput);
    }
  };

  const [showTranscribeModal, setShowTranscribeModal] = useState(false);

  const handleTranscribeComplete = (newNotes: SongNote[], newBpm: number, mode: 'overwrite' | 'merge') => {
    if (mode === 'overwrite') {
      setNotes(newNotes);
    } else {
      setNotes(prev => {
        // Simple merge: append and sort
        const combined = [...prev, ...newNotes];
        return combined.sort((a, b) => a.time - b.time);
      });
    }

    setBpm(newBpm);

    // Recalculate duration
    const allNotes = mode === 'overwrite' ? newNotes : [...notes, ...newNotes];
    if (allNotes.length > 0) {
      const lastNote = allNotes.reduce((max, n) => (n.time + (n.duration || 1) > max.time + (max.duration || 1) ? n : max), allNotes[0]);
      setDuration(Math.ceil(lastNote.time + (lastNote.duration || 1)) + 4);
    }
    setIsDirty(true);
  };

  return (
    <motion.div
      className="fixed inset-0 z-10 bg-black overflow-hidden flex flex-col font-sans"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-40">
          <AuroraBackground />
        </div>
        <div className="absolute inset-0 bg-black/50 z-10" />
        <div className="absolute inset-0 bg-[url('/grid.png')] opacity-[0.05] z-10" />
      </div>
      <AutoTranscribeModal
        isOpen={showTranscribeModal}
        onClose={() => setShowTranscribeModal(false)}
        onTranscribeComplete={handleTranscribeComplete}
        gridStep={1 / (gridResolution / 4)} // Convert e.g. 16 to 0.25 beats (in 4/4)
        config={{
          tinesCount: authorTineCount,
          tuning: authorTuning,
          scale: authorScale
        }}
      />

      {/* Header */}
      <div className="relative z-20 flex items-center justify-between gap-4 px-6 py-4 bg-black/20 border-b border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <button
            onClick={onBack}
            className="group flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-none skew-x-[-12deg] transition-all border border-white/5 hover:border-white/20 cursor-pointer text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 skew-x-[12deg]" />
            <span className="skew-x-[12deg] text-xs font-black uppercase tracking-widest">Back</span>
          </button>

          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white drop-shadow-md hidden md:block">
            Chart Builder
          </h1>
        </div>

        {/* Sync Controls (Desktop + Mobile) */}
        <div className="flex items-center gap-2">

          {/* Mobile Tab Toggle */}
          <div className="flex md:hidden bg-black/40 p-1 rounded-none skew-x-[-12deg] border border-white/5 mr-2">
            <button
              onClick={() => setEditorMode('chart')}
              className={cn(
                "p-2 rounded-none transition-all cursor-pointer",
                editorMode === 'chart' ? "bg-cyan-600 text-white" : "text-white/40"
              )}
            >
              <Grid className="w-4 h-4 skew-x-[12deg]" />
            </button>
            <button
              onClick={() => setEditorMode('text')}
              className={cn(
                "p-2 rounded-none transition-all cursor-pointer",
                editorMode === 'text' ? "bg-purple-600 text-white" : "text-white/40"
              )}
            >
              <FileText className="w-4 h-4 skew-x-[12deg]" />
            </button>
          </div>

          {/* Manual Sync Buttons */}
          <button
            onClick={handleSyncToGrid}
            className="group flex items-center gap-2 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 rounded-none skew-x-[-12deg] border border-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer"
            title="Overwrite Chart with Notation"
          >
            <span className="skew-x-[12deg] text-[10px] font-black uppercase tracking-widest hidden lg:inline">Sync to Grid</span>
            <span className="skew-x-[12deg] lg:hidden">To Grid</span>
            <Zap className="w-3 h-3 skew-x-[12deg]" />
          </button>

          <button
            onClick={handleSyncToText}
            className="group relative flex items-center gap-2 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 rounded-none skew-x-[-12deg] border border-cyan-500/20 hover:border-cyan-500/40 transition-all cursor-pointer"
            title="Overwrite Notation with Chart"
          >
            {isDirty && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_5px_red] animate-pulse z-10" />
            )}
            <span className="skew-x-[12deg] text-[10px] font-black uppercase tracking-widest hidden lg:inline">Sync to Text</span>
            <span className="skew-x-[12deg] lg:hidden">To Text</span>
            <FileText className="w-3 h-3 skew-x-[12deg]" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTranscribeModal(true)}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 hover:text-pink-300 rounded-none skew-x-[-12deg] border border-pink-500/20 hover:border-pink-500/40 transition-all cursor-pointer"
            title="Auto-Transcribe from Audio"
          >
            <Wand2 className="w-4 h-4 skew-x-[12deg]" />
            <span className="skew-x-[12deg] text-xs font-black uppercase tracking-widest">Magic Import</span>
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "p-2 rounded-none skew-x-[-12deg] border transition-all cursor-pointer",
              showSettings ? "bg-white/20 text-white border-white/30" : "bg-white/5 text-white/40 border-white/10 hover:text-white/60"
            )}
          >
            <Edit3 className="w-4 h-4 skew-x-[12deg]" />
          </button>

          <div className="w-px h-6 bg-white/10 mx-2 skew-x-[-12deg]" />

          <button
            onClick={handleTestPlay}
            className="flex items-center gap-2 px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-none skew-x-[-12deg] transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] cursor-pointer"
          >
            <Play className="w-4 h-4 skew-x-[12deg] fill-white" />
            <span className="skew-x-[12deg] text-xs font-black italic uppercase tracking-widest hidden md:inline">Test</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 bg-green-500 hover:bg-green-400 text-white rounded-none skew-x-[-12deg] transition-all shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:shadow-[0_0_25px_rgba(34,197,94,0.6)] cursor-pointer"
          >
            <Save className="w-4 h-4 skew-x-[12deg]" />
            <span className="skew-x-[12deg] text-xs font-black italic uppercase tracking-widest hidden md:inline">Save</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Settings sidebar */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="relative z-10 flex-shrink-0 border-r border-white/5 overflow-y-auto bg-black/40 backdrop-blur-md hidden xl:block"
            >
              {/* Settings Content (Existing) */}
              <div className="p-6 space-y-6">
                <h2 className="text-xl font-black italic uppercase tracking-tighter text-white/80 border-b border-white/5 pb-4">Song Settings</h2>
                {/* Inputs ... (Truncated for brevity, assuming we keep existing structure or need to re-render it)
                    Actually, I'm replacing the whole block, I need to include the settings UI or it will be lost.
                    Since I don't want to copy-paste 300 lines of settings again if I can avoid it.
                    Can I use replace on just header? No, 'Main content' wrapper changed.
                    I will include the settings markup.
                */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Title</label>
                  <Input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="MY AWESOME SONG" className="w-full bg-white/5 border-white/10 text-white placeholder-white/20 focus:border-cyan-500/50 rounded-none skew-x-[-12deg] text-xs font-bold uppercase tracking-wider h-10 px-4" />
                </div>
                {/* Artist */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Artist</label>
                  <Input
                    type="text"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="ARTIST NAME"
                    className="w-full bg-white/5 border-white/10 text-white placeholder-white/20 focus:border-cyan-500/50 rounded-none skew-x-[-12deg] text-xs font-bold uppercase tracking-wider h-10 px-4"
                  />
                </div>

                {/* Time Signature */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Time Signature</label>
                  <Select
                    value={timeSignature}
                    onValueChange={(value) => setTimeSignature(value as TimeSignature)}
                  >
                    <SelectTrigger className="w-full bg-white/5 border-white/10 text-white focus:border-cyan-500/50 rounded-none skew-x-[-12deg] h-10 px-4">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111] border-white/10 rounded-sm">
                      <SelectItem value="4/4" className="text-white focus:bg-white/10 cursor-pointer">4/4</SelectItem>
                      <SelectItem value="3/4" className="text-white focus:bg-white/10 cursor-pointer">3/4</SelectItem>
                      <SelectItem value="2/4" className="text-white focus:bg-white/10 cursor-pointer">2/4</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-white/30 mt-2 italic px-2">
                    Determines grid divisions ({timeSignature.split('/')[0]} beats per measure)
                  </p>
                </div>

                {/* Grid Resolution */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Editor Grid</label>
                  <Select
                    value={gridResolution.toString()}
                    onValueChange={(value) => setGridResolution(parseInt(value))}
                  >
                    <SelectTrigger className="w-full bg-white/5 border-white/10 text-white focus:border-cyan-500/50 rounded-none skew-x-[-12deg] h-10 px-4">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111] border-white/10 rounded-sm">
                      <SelectItem value="8" className="text-white focus:bg-white/10 cursor-pointer">1/8 (Swing)</SelectItem>
                      <SelectItem value="16" className="text-white focus:bg-white/10 cursor-pointer">1/16 (Standard)</SelectItem>
                      <SelectItem value="32" className="text-white focus:bg-white/10 cursor-pointer">1/32 (Complex)</SelectItem>
                      <SelectItem value="64" className="text-white focus:bg-white/10 cursor-pointer">1/64 (Ultra-fine)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-white/30 mt-2 italic px-2">
                    Quantization for transcription and manual editing
                  </p>
                </div>

                {/* Kalimba Configuration */}
                <div className="pt-4 border-t border-white/10 space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-cyan-400/80">Author Calibration</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Tuning</label>
                      <Select
                        value={authorTuning}
                        onValueChange={setAuthorTuning}
                      >
                        <SelectTrigger className="w-full bg-white/5 border-white/10 text-white focus:border-cyan-500/50 rounded-none skew-x-[-12deg] h-10 px-4">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111] border-white/10">
                          {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(n => (
                            <SelectItem key={n} value={n} className="text-white focus:bg-white/10 cursor-pointer">{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Scale</label>
                      <Select
                        value={authorScale}
                        onValueChange={setAuthorScale}
                      >
                        <SelectTrigger className="w-full bg-white/5 border-white/10 text-white focus:border-cyan-500/50 rounded-none skew-x-[-12deg] h-10 px-4">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111] border-white/10">
                          {Object.keys(SCALES).map(s => (
                            <SelectItem key={s} value={s} className="text-white focus:bg-white/10 cursor-pointer">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Tines</label>
                      <Select
                        value={authorTineCount.toString()}
                        onValueChange={(v) => setAuthorTineCount(parseInt(v))}
                      >
                        <SelectTrigger className="w-full bg-white/5 border-white/10 text-white focus:border-cyan-500/50 rounded-none skew-x-[-12deg] h-10 px-4">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111] border-white/10">
                          {[8, 9, 10, 13, 17, 21, 34].map(t => (
                            <SelectItem key={t} value={t.toString()} className="text-white focus:bg-white/10 cursor-pointer">{t} Tines</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-[10px] text-white/30 italic px-2">
                    Specify the kalimba type you are composing for.
                  </p>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Category</label>
                  <Select
                    value={category || "none"}
                    onValueChange={(val) => setCategory(val === "none" ? "" : val)}
                  >
                    <SelectTrigger className="w-full bg-white/5 border-white/10 text-white focus:border-cyan-500/50 rounded-none skew-x-[-12deg] h-10 px-4">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111] border-white/10 text-white  max-h-[300px]">
                      <SelectItem value="none" className="uppercase font-bold focus:bg-white/10 tracking-wider text-white/40">None</SelectItem>
                      {SONG_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat} className="uppercase font-bold focus:bg-white/10 tracking-wider">{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Difficulty</label>
                  <div className="flex flex-wrap gap-2">
                    {DIFFICULTIES.map((diff) => (
                      <button
                        key={diff}
                        onClick={() => setDifficulty(diff)}
                        className={cn(
                          "px-3 py-1.5 rounded-none skew-x-[-12deg] text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer",
                          difficulty === diff
                            ? "bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.4)]"
                            : "bg-white/5 text-white/40 border-white/10 hover:text-white hover:bg-white/10"
                        )}
                      >
                        <span className="skew-x-[12deg] block">{diff}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icon */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Icon</label>
                  <div className="flex gap-2 flex-wrap">
                    {ICONS.map((i) => (
                      <button
                        key={i.id}
                        onClick={() => setIcon(i.id)}
                        className={cn(
                          "w-10 h-10 rounded-none skew-x-[-12deg] text-lg flex items-center justify-center transition-all cursor-pointer border",
                          icon === i.id
                            ? "bg-cyan-500/20 border-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                            : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                        )}
                      >
                        <span className="skew-x-[12deg]">{i.emoji}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setIconColor(color)}
                        className={cn(
                          "w-8 h-8 rounded-none skew-x-[-12deg] transition-all cursor-pointer border border-white/10",
                          iconColor === color ? "scale-110 shadow-[0_0_15px_rgba(255,255,255,0.5)] border-white" : "opacity-60 hover:opacity-100"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Cloud Sync Settings */}
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cloud className={`w-4 h-4 ${syncToCloud ? 'text-cyan-400' : 'text-white/30'}`} />
                      <span className="text-sm text-white">Cloud Sync</span>
                    </div>
                    <button
                      onClick={() => {
                        if (isAuthenticated) {
                          setSyncToCloud(!syncToCloud);
                        } else {
                          // Trigger Global Auth
                          openAuth();
                          setError('Please login to enable cloud sync');
                          setTimeout(() => setError(null), 3000);
                        }
                      }}
                      className={`w-10 h-5 rounded-full transition-colors relative ${syncToCloud ? 'bg-cyan-500' : 'bg-white/10'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${syncToCloud ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  {syncToCloud && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex items-center justify-between pl-6"
                    >
                      <div className="flex items-center gap-2">
                        <Globe className={`w-4 h-4 ${isPublic ? 'text-purple-400' : 'text-white/30'}`} />
                        <span className="text-xs text-white/70">Public Discovery</span>
                      </div>
                      <button
                        onClick={() => setIsPublic(!isPublic)}
                        className={`w-8 h-4 rounded-full transition-colors relative ${isPublic ? 'bg-purple-500' : 'bg-white/10'}`}
                      >
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${isPublic ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                    </motion.div>
                  )}
                  <p className="text-[10px] text-white/40">
                    {!isAuthenticated
                      ? 'Login to backup your tracks.'
                      : syncToCloud ? 'Your song will be backed up to the cloud when you save.' : 'Only saved locally in this browser.'}
                  </p>
                  <div className="mt-4">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">YouTube Video URL (Optional)</label>
                    <Input
                      type="text"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full bg-white/5 border-white/10 text-white placeholder-white/20 focus:border-cyan-500/50 rounded-none skew-x-[-12deg] text-xs font-bold uppercase tracking-wider h-10 px-4"
                    />
                  </div>

                </div>

                {/* JSON Import/Export */}
                <div className="pt-6 border-t border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Import/Export</span>
                    <div className="flex gap-2">
                      {/* Refactored IconButtons to simple skewed buttons for consistency */}
                      <button onClick={handleGenerateJSON} title="Generate JSON" className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white skew-x-[-12deg] transition-colors"><RefreshCw className="w-3 h-3 skew-x-[12deg]" /></button>
                      <button onClick={handleLoadJSON} title="Load JSON" className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white skew-x-[-12deg] transition-colors"><Upload className="w-3 h-3 skew-x-[12deg]" /></button>
                      {jsonOutput && <button onClick={handleCopyJSON} title="Copy JSON" className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white skew-x-[-12deg] transition-colors"><Download className="w-3 h-3 skew-x-[12deg]" /></button>}
                    </div>
                  </div>

                  {jsonOutput && (
                    <pre className="bg-black/30 rounded p-2 text-[10px] text-white/50 overflow-auto max-h-32 font-mono">
                      {jsonOutput}
                    </pre>
                  )}
                </div>

                {/* Error display */}
                {error && (
                  <div className="px-3 py-2 bg-red-500/20 border border-red-500/40 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Editor Split Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

          {/* Notation Panel (Left) */}
          <div className={cn(
            "flex-1 flex flex-col border-r border-white/5 transition-all text-left",
            // Auto-hide on mobile if mode is chart
            editorMode === 'chart' ? "hidden md:flex" : "flex"
          )}>
            <div className="p-4 bg-black/40 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-sm font-black italic uppercase tracking-widest text-white/50">Notation Editor</h3>
            </div>
            <div className="flex-1 relative bg-black/20">
              <textarea
                ref={notationRef}
                onScroll={handleNotationScroll}
                value={notation}
                onChange={(e) => setNotation(e.target.value)}
                className="absolute inset-0 w-full h-full bg-transparent text-white p-6 font-mono text-sm resize-none focus:outline-none focus:bg-white/5 leading-relaxed"
                placeholder="Enter song notation here...&#10;1 3 5 (135)&#10;Use parentheses for chords."
                spellCheck={false}
              />
            </div>
          </div>

          {/* Chart Panel (Right) */}
          <div className={cn(
            "flex-1 flex flex-col transition-all bg-[#0a0a0a]",
            // Auto-hide on mobile if mode is text
            editorMode === 'text' ? "hidden md:flex" : "flex"
          )}>
            <div className="p-4 bg-black/40 border-b border-white/5 flex justify-between items-center md:hidden">
              <h3 className="text-sm font-black italic uppercase tracking-widest text-white/50">Visual Chart</h3>
            </div>
            <div className="flex-1 relative overflow-hidden">
              <ChartEditor
                ref={chartRef}
                onScroll={handleChartScroll}
                notes={notes}
                bpm={bpm}
                timeSignature={timeSignature}
                duration={duration}
                authorTuning={authorTuning}
                authorScale={authorScale}
                authorTineCount={authorTineCount}
                onNotesChange={handleNotesChange}
                onDurationChange={setDuration}
                gridResolution={gridResolution}
              />
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
};

export default SongBuilder;
