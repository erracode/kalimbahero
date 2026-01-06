// ============================================
// Kalimba Hero - Song Library Component
// ============================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Trash2, Plus, ArrowLeft, Star, Music, Snowflake, Sword, Heart, Bell, Zap, Gamepad2, FileText, Edit2 } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import { NeonButton } from './NeonButton';
import { ToggleButton } from './ToggleButton';
import { IconButton } from './IconButton';
import type { Song } from '@/types/game';

type GameMode = '3d' | 'tab';

interface SongLibraryProps {
  songs: Song[];
  onSelectSong: (song: Song) => void;
  onEditSong?: (song: Song) => void;
  onDeleteSong?: (songId: string) => void;
  onCreateNew?: () => void;
  onBack: () => void;
  gameMode?: GameMode;
  onGameModeChange?: (mode: GameMode) => void;
}

// Icon map for song cards
const iconMap: Record<string, React.ReactNode> = {
  star: <Star className="w-8 h-8" />,
  music: <Music className="w-8 h-8" />,
  snowflake: <Snowflake className="w-8 h-8" />,
  sword: <Sword className="w-8 h-8" />,
  heart: <Heart className="w-8 h-8" />,
  bell: <Bell className="w-8 h-8" />,
  zap: <Zap className="w-8 h-8" />,
};

// Difficulty badge colors
const difficultyColors: Record<string, string> = {
  easy: '#6BCB77',
  medium: '#FFD93D',
  hard: '#FF8E53',
  expert: '#FF6B6B',
};

interface SongCardProps {
  song: Song;
  onPlay: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  index: number;
}

const SongCard: React.FC<SongCardProps> = ({ song, onPlay, onEdit, onDelete, index }) => {
  const icon = iconMap[song.icon || 'music'] || <Music className="w-8 h-8" />;
  const iconColor = song.iconColor || '#00E5FF';
  const diffColor = difficultyColors[song.difficulty] || '#00E5FF';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
    >
      <GlassPanel
        padding="md"
        className="relative group cursor-pointer transition-all duration-300 hover:scale-[1.02]"
        whileHover={{ y: -4 }}
        glow
        glowColor={iconColor}
      >
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-3"
          style={{
            background: `linear-gradient(135deg, ${iconColor}40, ${iconColor}10)`,
            boxShadow: `0 0 25px ${iconColor}50`,
            color: iconColor,
          }}
        >
          {icon}
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-white text-center truncate mb-1">
          {song.title}
        </h3>

        {/* Artist */}
        <p className="text-sm text-white/50 text-center truncate mb-2">
          {song.artist}
        </p>

        {/* Difficulty badge */}
        <div className="flex justify-center mb-3">
          <span
            className="px-3 py-1 rounded-full text-xs font-bold uppercase"
            style={{
              backgroundColor: `${diffColor}20`,
              color: diffColor,
              border: `1px solid ${diffColor}40`,
            }}
          >
            {song.difficulty}
          </span>
        </div>

        {/* BPM */}
        <div className="text-center text-sm text-white/40 mb-4">
          {song.bpm} BPM • {Math.floor(song.duration / 60)}:{String(Math.floor(song.duration % 60)).padStart(2, '0')}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <NeonButton
            variant="cyan"
            size="sm"
            fullWidth
            icon={<Play className="w-4 h-4" />}
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
          >
            Play
          </NeonButton>
          
          {onEdit && (
            <IconButton
              variant="primary"
              size="md"
              icon={<Edit2 className="w-4 h-4" />}
              title="Edit song"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            />
          )}
          
          {onDelete && (
            <IconButton
              variant="danger"
              size="md"
              icon={<Trash2 className="w-4 h-4" />}
              title="Delete song"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            />
          )}
        </div>
      </GlassPanel>
    </motion.div>
  );
};

export const SongLibrary: React.FC<SongLibraryProps> = ({
  songs,
  onSelectSong,
  onEditSong,
  onDeleteSong,
  onCreateNew,
  onBack,
  gameMode = '3d',
  onGameModeChange,
}) => {
  const [filter, setFilter] = useState<string>('all');

  const filteredSongs = filter === 'all' 
    ? songs 
    : songs.filter(s => s.difficulty === filter);

  return (
    <motion.div
      className="relative z-10 min-h-screen px-4 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <NeonButton
              variant="purple"
              size="sm"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={onBack}
            >
              Back
            </NeonButton>
            
            <h1 className="text-4xl font-black text-white">
              SONG LIBRARY
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Game Mode Toggle - Flex Switch */}
            {onGameModeChange && (
              <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl p-1 border border-white/10">
                <ToggleButton
                  active={gameMode === '3d'}
                  variant="primary"
                  size="md"
                  icon={<Gamepad2 className="w-4 h-4" />}
                  onClick={() => onGameModeChange('3d')}
                >
                  Play Mode
                </ToggleButton>
                <ToggleButton
                  active={gameMode === 'tab'}
                  variant="secondary"
                  size="md"
                  icon={<FileText className="w-4 h-4" />}
                  onClick={() => onGameModeChange('tab')}
                >
                  Practice Mode
                </ToggleButton>
              </div>
            )}
            
            {onCreateNew && (
              <NeonButton
                variant="green"
                icon={<Plus className="w-5 h-5" />}
                onClick={onCreateNew}
              >
                Create New
              </NeonButton>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-6 flex-wrap">
          {['all', 'easy', 'medium', 'hard', 'expert'].map((diff) => (
            <ToggleButton
              key={diff}
              active={filter === diff}
              variant="default"
              size="md"
              onClick={() => setFilter(diff)}
            >
              {diff.charAt(0).toUpperCase() + diff.slice(1)}
            </ToggleButton>
          ))}
        </div>
      </div>

      {/* Song grid */}
      <div className="max-w-6xl mx-auto">
        <AnimatePresence mode="popLayout">
          {filteredSongs.length > 0 ? (
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
              layout
            >
              {filteredSongs.map((song, index) => (
                <SongCard
                  key={song.id}
                  song={song}
                  index={index}
                  onPlay={() => onSelectSong(song)}
                  onEdit={onEditSong ? () => onEditSong(song) : undefined}
                  onDelete={onDeleteSong ? () => onDeleteSong(song.id) : undefined}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-2xl font-bold text-white mb-2">No songs found</h3>
              <p className="text-white/50 mb-6">
                {filter === 'all' 
                  ? "Your library is empty. Create a new song to get started!"
                  : `No ${filter} songs in your library.`}
              </p>
              {onCreateNew && filter === 'all' && (
                <NeonButton
                  variant="cyan"
                  icon={<Plus className="w-5 h-5" />}
                  onClick={onCreateNew}
                >
                  Create Your First Song
                </NeonButton>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default SongLibrary;

