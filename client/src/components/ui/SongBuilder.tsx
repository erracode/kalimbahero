// ============================================
// Kalimba Hero - Song Builder Component
// ============================================

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Save, Upload, Download, RefreshCw, Edit3, Grid, FileText } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import { NeonButton } from './NeonButton';
import { ChartEditor } from './ChartEditor';
import { 
  createSongFromNotation, 
  exportSongToJSON, 
  importSongFromJSON,
  notesToNotation,
} from '@/utils/songParser';
import { KALIMBA_KEYS } from '@/utils/frequencyMap';
import type { Song, SongNote } from '@/types/game';

interface SongBuilderProps {
  onBack: () => void;
  onTestPlay: (song: Song) => void;
  onSave: (song: Song) => void;
  initialSong?: Song;
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

const DIFFICULTIES: Song['difficulty'][] = ['easy', 'medium', 'hard', 'expert'];

// Generate unique ID
const generateId = () => `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const SongBuilder: React.FC<SongBuilderProps> = ({
  onBack,
  onTestPlay,
  onSave,
  initialSong,
}) => {
  const [editorMode, setEditorMode] = useState<EditorMode>('chart');
  const [title, setTitle] = useState(initialSong?.title || '');
  const [artist, setArtist] = useState(initialSong?.artist || '');
  const [bpm, setBpm] = useState(initialSong?.bpm || 120);
  const [difficulty, setDifficulty] = useState<Song['difficulty']>(
    initialSong?.difficulty || 'medium'
  );
  const [icon, setIcon] = useState(initialSong?.icon || 'music');
  const [iconColor, setIconColor] = useState(initialSong?.iconColor || '#00E5FF');
  const [notation, setNotation] = useState(initialSong?.notation || '');
  const [notes, setNotes] = useState<SongNote[]>(initialSong?.notes || []);
  const [duration, setDuration] = useState(initialSong?.duration || 30);
  const [jsonOutput, setJsonOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(true);

  // Sync notes from notation when switching to chart mode
  const handleModeChange = useCallback((mode: EditorMode) => {
    if (mode === 'chart' && notation.trim()) {
      try {
        const song = createSongFromNotation(notation, {
          title: title.trim() || 'Untitled',
          artist: artist.trim() || 'Unknown',
          bpm,
          difficulty,
          icon,
          iconColor,
        });
        setNotes(song.notes);
        setDuration(song.duration);
        setError(null);
      } catch (err) {
        // Keep existing notes if parsing fails
      }
    } else if (mode === 'text' && notes.length > 0) {
      // Convert notes back to notation
      const newNotation = notesToNotation(notes, bpm);
      setNotation(newNotation);
    }
    setEditorMode(mode);
  }, [notation, notes, title, artist, bpm, difficulty, icon, iconColor]);

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
      songDuration = Math.max(duration, ...notes.map(n => n.time + n.duration)) + 2;
      songNotation = notesToNotation(notes, bpm);
    }
    
    const song: Song = {
      id: initialSong?.id || `song_${Date.now()}`,
      title: title.trim(),
      artist: artist.trim() || 'Unknown',
      bpm,
      difficulty,
      icon,
      iconColor,
      notation: songNotation,
      notes: songNotes,
      duration: songDuration,
    };
    
    setError(null);
    return song;
  }, [title, artist, bpm, difficulty, icon, iconColor, notation, notes, duration, editorMode, initialSong]);

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
      onSave(song);
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
        setDifficulty(song.difficulty);
        setIcon(song.icon || 'music');
        setIconColor(song.iconColor || '#00E5FF');
        setNotation(song.notation || '');
        setNotes(song.notes || []);
        setDuration(song.duration || 30);
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

  return (
    <motion.div
      className="fixed inset-0 z-10 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 overflow-hidden flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
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
          <button
            onClick={() => handleModeChange('chart')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              editorMode === 'chart'
                ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg'
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            <Grid className="w-4 h-4" />
            Visual Editor
          </button>
          <button
            onClick={() => handleModeChange('text')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              editorMode === 'text'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            <FileText className="w-4 h-4" />
            Tab Notation
          </button>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${
              showSettings ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
            title="Toggle settings"
          >
            <Edit3 className="w-5 h-5" />
          </button>
          
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
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="My Awesome Song"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-cyan-500 transition-colors text-sm"
                  />
                </div>

                {/* Artist */}
                <div>
                  <label className="block text-sm text-white/60 mb-1">Artist</label>
                  <input
                    type="text"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="Artist Name"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-cyan-500 transition-colors text-sm"
                  />
                </div>

                {/* BPM */}
                <div>
                  <label className="block text-sm text-white/60 mb-1">BPM: {bpm}</label>
                  <input
                    type="range"
                    min="30"
                    max="200"
                    value={bpm}
                    onChange={(e) => setBpm(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                  <div className="flex justify-between text-xs text-white/40 mt-1">
                    <span>30</span>
                    <span>200</span>
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-sm text-white/60 mb-1">Difficulty</label>
                  <div className="flex gap-1 flex-wrap">
                    {DIFFICULTIES.map((diff) => (
                      <button
                        key={diff}
                        onClick={() => setDifficulty(diff)}
                        className={`px-2 py-1 rounded text-xs capitalize transition-all ${
                          difficulty === diff
                            ? 'bg-cyan-500 text-white'
                            : 'bg-white/10 text-white/60 hover:bg-white/20'
                        }`}
                      >
                        {diff}
                      </button>
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
                        className={`w-8 h-8 rounded text-lg flex items-center justify-center transition-all ${
                          icon === i.id
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
                        className={`w-6 h-6 rounded-full transition-all ${
                          iconColor === color ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Duration info (for chart mode) - now controlled in ChartEditor via beats */}
                {editorMode === 'chart' && (
                  <div className="p-2 bg-white/5 rounded-lg">
                    <span className="text-sm text-white/60">
                      Duration: {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
                    </span>
                    <span className="text-xs text-white/40 ml-2">
                      (set beats in editor)
                    </span>
                  </div>
                )}

                {/* JSON Import/Export */}
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/60">Import/Export</span>
                    <div className="flex gap-1">
                      <button
                        onClick={handleGenerateJSON}
                        className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                        title="Generate JSON"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleLoadJSON}
                        className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                        title="Load JSON"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                      {jsonOutput && (
                        <button
                          onClick={handleCopyJSON}
                          className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                          title="Copy JSON"
                        >
                          <Download className="w-4 h-4" />
                        </button>
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
              duration={duration}
              onNotesChange={setNotes}
              onDurationChange={setDuration}
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
