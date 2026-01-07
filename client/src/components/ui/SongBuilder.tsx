// ============================================
// Kalimba Hero - Song Builder Component
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Save, Upload, Download, RefreshCw, Edit3, Grid, FileText, Wand2, Cloud, Globe } from 'lucide-react';
import { NeonButton } from './NeonButton';
import { ToggleButton } from './ToggleButton';
import { IconButton } from './IconButton';
import { AutoTranscribeModal } from './AutoTranscribeModal';
import { Input } from './input';
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
  const [jsonOutput, setJsonOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(true);

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
    };
  }, [songId, title, artist, bpm, timeSignature, difficulty, icon, iconColor, notation, notes, duration, editorMode]);

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
        setYoutubeUrl(song.youtubeUrl || '');
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
      className="fixed inset-0 z-10 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 overflow-hidden flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <AutoTranscribeModal
        isOpen={showTranscribeModal}
        onClose={() => setShowTranscribeModal(false)}
        onTranscribeComplete={handleTranscribeComplete}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-4 bg-black/30 border-b border-white/10">
        <div className="flex items-center gap-4">
          <NeonButton
            variant="purple"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={onBack}
          >
            Back
          </NeonButton>

          <h1 className="text-2xl font-black text-white">
            CHART BUILDER
          </h1>
        </div>

        {/* Editor Mode Toggle */}
        <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1 border border-white/10">
          <ToggleButton
            active={editorMode === 'chart'}
            variant="primary"
            size="md"
            icon={<Grid className="w-4 h-4" />}
            onClick={() => handleModeChange('chart')}
          >
            Visual Editor
          </ToggleButton>
          <ToggleButton
            active={editorMode === 'text'}
            variant="secondary"
            size="md"
            icon={<FileText className="w-4 h-4" />}
            onClick={() => handleModeChange('text')}
          >
            Tab Notation
          </ToggleButton>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <NeonButton
            variant="pink"
            size="sm"
            icon={<Wand2 className="w-4 h-4" />}
            onClick={() => setShowTranscribeModal(true)}
            title="Auto-Transcribe from Audio"
          >
            Magic Import
          </NeonButton>

          <IconButton
            variant={showSettings ? 'default' : 'ghost'}
            size="md"
            icon={<Edit3 className="w-5 h-5" />}
            title="Toggle settings"
            onClick={() => setShowSettings(!showSettings)}
          />

          <NeonButton
            variant="cyan"
            size="sm"
            icon={<Play className="w-4 h-4" />}
            onClick={handleTestPlay}
          >
            Test
          </NeonButton>

          <NeonButton
            variant="green"
            size="sm"
            icon={<Save className="w-4 h-4" />}
            onClick={handleSave}
          >
            Save
          </NeonButton>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Settings sidebar */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="flex-shrink-0 border-r border-white/10 overflow-y-auto bg-black/20"
            >
              <div className="p-4 space-y-4">
                <h2 className="text-lg font-bold text-white">Song Settings</h2>

                {/* Title */}
                <div>
                  <label className="block text-sm text-white/60 mb-1">Title</label>
                  <Input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="My Awesome Song"
                    className="w-full bg-white/10 border-white/20 text-white placeholder-white/30 focus:border-cyan-500"
                  />
                </div>

                {/* Artist */}
                <div>
                  <label className="block text-sm text-white/60 mb-1">Artist</label>
                  <Input
                    type="text"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="Artist Name"
                    className="w-full bg-white/10 border-white/20 text-white placeholder-white/30 focus:border-cyan-500"
                  />
                </div>

                {/* Time Signature */}
                <div>
                  <label className="block text-sm text-white/60 mb-1">Time Signature</label>
                  <Select
                    value={timeSignature}
                    onValueChange={(value) => setTimeSignature(value as TimeSignature)}
                  >
                    <SelectTrigger className="w-full bg-white/10 border-white/20 text-white focus:border-cyan-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/20">
                      <SelectItem value="4/4" className="text-white hover:bg-white/10 cursor-pointer">4/4</SelectItem>
                      <SelectItem value="3/4" className="text-white hover:bg-white/10 cursor-pointer">3/4</SelectItem>
                      <SelectItem value="2/4" className="text-white hover:bg-white/10 cursor-pointer">2/4</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-white/40 mt-1">
                    Determines grid divisions ({timeSignature.split('/')[0]} beats per measure)
                  </p>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-sm text-white/60 mb-1">Difficulty</label>
                  <div className="flex gap-1 flex-wrap">
                    {DIFFICULTIES.map((diff) => (
                      <ToggleButton
                        key={diff}
                        active={difficulty === diff}
                        variant="default"
                        size="sm"
                        onClick={() => setDifficulty(diff)}
                      >
                        {diff}
                      </ToggleButton>
                    ))}
                  </div>
                </div>

                {/* Icon */}
                <div>
                  <label className="block text-sm text-white/60 mb-1">Icon</label>
                  <div className="flex gap-1 flex-wrap">
                    {ICONS.map((i) => (
                      <button
                        key={i.id}
                        onClick={() => setIcon(i.id)}
                        className={`w-8 h-8 rounded text-lg flex items-center justify-center transition-all cursor-pointer ${icon === i.id
                          ? 'bg-white/20 ring-2 ring-cyan-500'
                          : 'bg-white/10 hover:bg-white/20'
                          }`}
                      >
                        {i.emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm text-white/60 mb-1">Color</label>
                  <div className="flex gap-1 flex-wrap">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setIconColor(color)}
                        className={`w-6 h-6 rounded-full transition-all cursor-pointer ${iconColor === color ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''
                          }`}
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
                          // Prompt login
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
                </div>

                {/* JSON Import/Export */}
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/60">Import/Export</span>
                    <div className="flex gap-1">
                      <IconButton
                        variant="default"
                        size="sm"
                        icon={<RefreshCw className="w-4 h-4" />}
                        title="Generate JSON"
                        onClick={handleGenerateJSON}
                      />
                      <IconButton
                        variant="default"
                        size="sm"
                        icon={<Upload className="w-4 h-4" />}
                        title="Load JSON"
                        onClick={handleLoadJSON}
                      />
                      {jsonOutput && (
                        <IconButton
                          variant="default"
                          size="sm"
                          icon={<Download className="w-4 h-4" />}
                          title="Copy JSON"
                          onClick={handleCopyJSON}
                        />
                      )}
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
            <div className="h-full flex flex-col p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Tab Notation</h2>
                <p className="text-sm text-white/50">
                  Enter notes using scale degrees 1-7. Use ° or * for higher octaves.
                </p>
              </div>

              <textarea
                value={notation}
                onChange={(e) => setNotation(e.target.value)}
                placeholder="1° 7 6 5 4&#10;5 6 1°&#10;135(461')&#10;7 6 5 4 3&#10;6 5 4 3 2&#10;..."
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-cyan-500 transition-colors font-mono text-sm resize-none"
              />

              {/* Notation help */}
              <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-sm font-bold text-white mb-2">Quick Reference</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-white/60">
                  <div><code className="text-cyan-400">1-7</code> = Scale degrees</div>
                  <div><code className="text-cyan-400">1°</code> = Higher octave</div>
                  <div><code className="text-cyan-400">(1 3 5)</code> = Chord (spaced)</div>
                  <div><code className="text-cyan-400">135</code> = Chord (compact)</div>
                  <div><code className="text-cyan-400">- or _</code> = Rest</div>
                  <div><code className="text-cyan-400">New line</code> = New phrase</div>
                  <div><code className="text-cyan-400">Space</code> = Note separator</div>
                  <div><code className="text-cyan-400">* or '</code> = Octave marker</div>
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
