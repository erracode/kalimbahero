// ============================================
// Kalimba Hero - Song Builder Component
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Save, Upload, Download, RefreshCw, Edit3, Grid, FileText, Wand2, Cloud, Globe } from 'lucide-react';
import { AuroraBackground } from '@/components/ui/AuroraBackground';
import { AutoTranscribeModal } from './AutoTranscribeModal';
import { cn } from '@/lib/utils';
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
import type { Song, SongNote, Difficulty, TimeSignature } from '@/types/game';

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
  const [jsonOutput, setJsonOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(true);

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
      notation: editorMode === 'text' ? notation : notesToNotation(notes, bpm, timeSignature),
      notes,
      duration: editorMode === 'chart' ? Math.max(duration, ...notes.map(n => n.time + (n.duration || 0))) : duration,
      youtubeUrl,
      category,
    };
  }, [songId, title, artist, bpm, timeSignature, difficulty, icon, iconColor, notation, notes, duration, editorMode, youtubeUrl, category]);

  // Auto-trigger onChange when state changes
  useEffect(() => {
    if (isLoaded && onChange) {
      const state = getCurrentSongState();
      onChange(state);
    }
  }, [songId, title, artist, bpm, timeSignature, difficulty, icon, iconColor, notation, notes, duration, isLoaded, onChange, getCurrentSongState, youtubeUrl]);

  // Sync notes from notation when switching to chart mode
  const handleModeChange = useCallback((mode: EditorMode) => {
    // Always allow mode change, but sync data if available
    if (mode === 'chart') {
      // When switching to chart mode, try to sync from notation if available
      if (notation.trim()) {
        try {
          const song = createSongFromNotation(notation, {
            title: title.trim() || 'Untitled',
            artist: artist.trim() || 'Unknown',
            bpm,
            timeSignature,
            difficulty,
            icon,
            iconColor,
          });
          setNotes(song.notes);
          setDuration(song.duration);
          setError(null);
        } catch (err) {
          // Keep existing notes if parsing fails - don't prevent mode change
          console.error('Failed to parse notation:', err);
        }
      }
      // Always change mode, even if no notation
      setEditorMode(mode);
    } else if (mode === 'text') {
      // When switching to text mode, always convert notes to notation (even if empty)
      const newNotation = notes.length > 0
        ? notesToNotation(notes, bpm, timeSignature)
        : '';
      setNotation(newNotation);
      // Always change mode
      setEditorMode(mode);
    }
  }, [notation, notes, title, artist, bpm, timeSignature, difficulty, icon, iconColor]);

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
      songNotation = notesToNotation(notes, bpm, timeSignature);
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
    };

    setError(null);
    return song;
  }, [title, artist, bpm, timeSignature, difficulty, icon, iconColor, notation, notes, duration, editorMode, initialSong, syncToCloud, isPublic, youtubeUrl]);

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

  const handleTranscribeComplete = (newNotes: SongNote[], newBpm: number) => {
    setNotes(newNotes); // Replace notes or Append? Ideally Replace for a fresh transcribe.
    setBpm(newBpm);

    // Recalculate duration
    if (newNotes.length > 0) {
      const lastNote = newNotes[newNotes.length - 1];
      setDuration(Math.ceil(lastNote.time + (lastNote.duration || 1)) + 4);
    }
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

          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white drop-shadow-md">
            Chart Builder
          </h1>
        </div>

        {/* Editor Mode Toggle */}
        <div className="flex bg-black/40 p-1 rounded-none skew-x-[-12deg] border border-white/5">
          <button
            onClick={() => handleModeChange('chart')}
            className={cn(
              "flex items-center gap-2 px-6 py-2 rounded-none text-xs font-black italic uppercase tracking-widest transition-all cursor-pointer",
              editorMode === 'chart' ? "bg-cyan-600 text-white shadow-lg" : "text-white/40 hover:text-white"
            )}
          >
            <Grid className="w-3 h-3 skew-x-[12deg]" />
            <span className="skew-x-[12deg]">Visual Editor</span>
          </button>
          <button
            onClick={() => handleModeChange('text')}
            className={cn(
              "flex items-center gap-2 px-6 py-2 rounded-none text-xs font-black italic uppercase tracking-widest transition-all cursor-pointer",
              editorMode === 'text' ? "bg-purple-600 text-white shadow-lg" : "text-white/40 hover:text-white"
            )}
          >
            <FileText className="w-3 h-3 skew-x-[12deg]" />
            <span className="skew-x-[12deg]">Notation</span>
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTranscribeModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 hover:text-pink-300 rounded-none skew-x-[-12deg] border border-pink-500/20 hover:border-pink-500/40 transition-all cursor-pointer"
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
            <span className="skew-x-[12deg] text-xs font-black italic uppercase tracking-widest">Test</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 bg-green-500 hover:bg-green-400 text-white rounded-none skew-x-[-12deg] transition-all shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:shadow-[0_0_25px_rgba(34,197,94,0.6)] cursor-pointer"
          >
            <Save className="w-4 h-4 skew-x-[12deg]" />
            <span className="skew-x-[12deg] text-xs font-black italic uppercase tracking-widest">Save</span>
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
              className="relative z-10 flex-shrink-0 border-r border-white/5 overflow-y-auto bg-black/40 backdrop-blur-md"
            >
              <div className="p-6 space-y-6">
                <h2 className="text-xl font-black italic uppercase tracking-tighter text-white/80 border-b border-white/5 pb-4">Song Settings</h2>

                {/* Title */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Title</label>
                  <Input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="MY AWESOME SONG"
                    className="w-full bg-white/5 border-white/10 text-white placeholder-white/20 focus:border-cyan-500/50 rounded-none skew-x-[-12deg] text-xs font-bold uppercase tracking-wider h-10 px-4"
                  />
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

        {/* Editor area */}
        <div className="flex-1 overflow-hidden">
          {editorMode === 'chart' ? (
            <ChartEditor
              notes={notes}
              bpm={bpm}
              timeSignature={timeSignature}
              duration={duration}
              onNotesChange={setNotes}
              onDurationChange={setDuration}
              onBpmChange={setBpm}
              onTimeSignatureChange={setTimeSignature}
            />
          ) : (
            <div className="h-full flex flex-col p-8 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Tab Notation</h2>
                <div className="px-4 py-2 bg-white/5 border border-white/10 skew-x-[-12deg]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 skew-x-[12deg]">
                    Use 1-7 for scale degrees • ° or * for octaves
                  </p>
                </div>
              </div>

              <textarea
                value={notation}
                onChange={(e) => setNotation(e.target.value)}
                placeholder="1° 7 6 5 4&#10;5 6 1°&#10;135(461')&#10;7 6 5 4 3&#10;6 5 4 3 2&#10;..."
                className="flex-1 px-8 py-6 bg-black/40 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/50 transition-colors font-mono text-sm resize-none rounded-none shadow-inner"
              />

              {/* Notation help */}
              <div className="mt-6 p-6 bg-white/[0.02] border border-white/5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">Quick Reference</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium text-white/60">
                  <div><code className="text-cyan-400 font-bold">1-7</code> Scale degrees</div>
                  <div><code className="text-cyan-400 font-bold">1°</code> Higher octave</div>
                  <div><code className="text-cyan-400 font-bold">(1 3 5)</code> Chord (spaced)</div>
                  <div><code className="text-cyan-400 font-bold">135</code> Chord (compact)</div>
                  <div><code className="text-cyan-400 font-bold">-</code> Rest</div>
                  <div><code className="text-cyan-400 font-bold">Enter</code> New phrase</div>
                  <div><code className="text-cyan-400 font-bold">Space</code> Separator</div>
                  <div><code className="text-cyan-400 font-bold">* '</code> Markers</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SongBuilder;
