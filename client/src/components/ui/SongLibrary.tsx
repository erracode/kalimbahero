// ============================================
// Kalimba Hero - Song Library Component
// ============================================

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Trash2, Plus, ArrowLeft, Star, Music, Snowflake, Sword, Heart, Bell, Zap, Gamepad2, FileText, Edit2, Cloud, Loader2, Clock, Disc, Globe, User, X } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import { NeonButton } from './NeonButton';
import { ToggleButton } from './ToggleButton';
import { IconButton } from './IconButton';
import type { Song } from '@/types/game';
import { useSongStore } from '@/stores/songStore';
import { useAuthSync } from '@/hooks/useAuthSync';

type GameMode = '3d' | 'tab';

interface SongLibraryProps {
  onSelectSong: (song: Song) => void;
  onEditSong?: (song: Song) => void;
  onDeleteSong?: (songId: string) => void;
  onCreateNew?: () => void;
  onBack: () => void;
  gameMode?: GameMode;
  onGameModeChange?: (mode: GameMode) => void;
}

// Icon map for song details
const iconMap: Record<string, React.ReactNode> = {
  star: <Star className="w-12 h-12" />,
  music: <Music className="w-12 h-12" />,
  snowflake: <Snowflake className="w-12 h-12" />,
  sword: <Sword className="w-12 h-12" />,
  heart: <Heart className="w-12 h-12" />,
  bell: <Bell className="w-12 h-12" />,
  zap: <Zap className="w-12 h-12" />,
};

const difficultyColors: Record<string, string> = {
  easy: '#6BCB77',
  medium: '#FFD93D',
  hard: '#FF8E53',
  expert: '#FF6B6B',
};

export const SongLibrary: React.FC<SongLibraryProps> = ({
  onSelectSong,
  onEditSong,
  onDeleteSong,
  onCreateNew,
  onBack,
  gameMode = '3d',
  onGameModeChange,
}) => {
  const { songs } = useSongStore();
  const [filter, setFilter] = useState<string>('all');
  const [tab, setTab] = useState<'my' | 'community'>('my');
  const [communitySongs, setCommunitySongs] = useState<Song[]>([]);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Pagination & Social Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [authorFilterId, setAuthorFilterId] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [sort, setSort] = useState<string>('new');
  const [showFavorites, setShowFavorites] = useState(false);

  const { syncAllLocal, syncSong, isSyncing, isAuthenticated } = useAuthSync();

  const fetchCommunity = async (targetPage = page, targetAuthorId = authorFilterId, favsOnly = showFavorites) => {
    setIsLoadingCommunity(true);
    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        sort,
        limit: '12'
      });
      if (targetAuthorId) params.append('authorId', targetAuthorId);
      if (filter !== 'all') params.append('difficulty', filter);
      if (favsOnly) params.append('favoritesOnly', 'true');

      const res = await fetch(`http://localhost:3000/api/songs?${params}`, {
        headers: isAuthenticated ? { 'credentials': 'include' } : {}
      } as any);

      const json = await res.json();
      if (json.success) {
        setCommunitySongs(json.data.map((s: any) => ({
          ...s.songData,
          id: s.id,
          artist: s.artist || s.songData.artist,
          author: s.author,
          likes: s.likes,
          plays: s.plays,
          isLiked: s.isLiked,
          isFavorited: s.isFavorited
        })));
        setTotalPages(json.pagination.totalPages);
        setPage(json.pagination.page);
      }
    } catch (err) {
      console.error("Failed to fetch community songs", err);
    } finally {
      setIsLoadingCommunity(false);
    }
  };

  const handleLike = async (songId: string) => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch(`http://localhost:3000/api/songs/${songId}/like`, { method: 'POST', credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setCommunitySongs(prev => prev.map(s =>
          s.id === songId ? { ...s, isLiked: json.isLiked, likes: (s.likes || 0) + (json.isLiked ? 1 : -1) } : s
        ));
      }
    } catch (err) {
      console.error("Failed to like song", err);
    }
  };

  const handleFavorite = async (songId: string) => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch(`http://localhost:3000/api/songs/${songId}/favorite`, { method: 'POST', credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setCommunitySongs(prev => prev.map(s =>
          s.id === songId ? { ...s, isFavorited: json.isFavorited } : s
        ));
      }
    } catch (err) {
      console.error("Failed to favorite song", err);
    }
  };

  const incrementPlay = async (songId: string) => {
    try {
      fetch(`http://localhost:3000/api/songs/${songId}/play`, { method: 'POST' });
    } catch (err) { /* ignore */ }
  };

  const handleTabChange = (newTab: 'my' | 'community') => {
    setTab(newTab);
    setSelectedSongId(null);
    if (newTab === 'community') {
      fetchCommunity();
    }
  };

  const activeSongs = tab === 'my' ? songs : communitySongs;

  // Check if there are any local songs that are not synced to the cloud
  const hasUnsyncedSongs = useMemo(() => {
    return songs.some(s => !s.isCloud);
  }, [songs]);

  const filteredSongs = useMemo(() => {
    return filter === 'all'
      ? activeSongs
      : activeSongs.filter(s => s.difficulty === filter);
  }, [filter, activeSongs]);

  const selectedSong = useMemo(() => {
    return activeSongs.find(s => s.id === selectedSongId) || null;
  }, [selectedSongId, activeSongs]);

  // Handle playing selected song
  const handlePlaySelected = () => {
    if (selectedSong) {
      if (tab === 'community') incrementPlay(selectedSong.id);
      onSelectSong(selectedSong);
    }
  };

  return (
    <motion.div
      className="relative z-10 min-h-screen px-6 py-8 flex flex-col max-w-[1600px] mx-auto overflow-hidden h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header Area */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-6">
          <NeonButton
            variant="purple"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={onBack}
          >
            Back
          </NeonButton>
          <h1 className="text-4xl font-black text-white tracking-tighter">
            SONG <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">LIBRARY</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-2xl p-1.5 border border-white/10 shadow-xl">
            <ToggleButton active={tab === 'my'} variant="primary" size="sm" onClick={() => handleTabChange('my')}>
              MY SONGS
            </ToggleButton>
            <ToggleButton active={tab === 'community'} variant="secondary" size="sm" onClick={() => handleTabChange('community')}>
              COMMUNITY
            </ToggleButton>
          </div>

          {onGameModeChange && (
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md rounded-2xl p-1.5 border border-white/10">
              <ToggleButton active={gameMode === '3d'} variant="primary" size="sm" icon={<Gamepad2 className="w-4 h-4" />} onClick={() => onGameModeChange('3d')}>
                3D
              </ToggleButton>
              <ToggleButton active={gameMode === 'tab'} variant="secondary" size="sm" icon={<FileText className="w-4 h-4" />} onClick={() => onGameModeChange('tab')}>
                TAB
              </ToggleButton>
            </div>
          )}

          {onCreateNew && (
            <NeonButton variant="green" size="sm" icon={<Plus className="w-4 h-4" />} onClick={onCreateNew}>
              Create New
            </NeonButton>
          )}
        </div>
      </div>

      {/* Main Layout Area */}
      <div className="flex flex-1 gap-8 overflow-hidden">

        {/* Left Side: List (40% width) */}
        <div className="w-[40%] flex flex-col gap-4 overflow-hidden">
          {/* Filters & Sorting */}
          <div className="flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                {['all', 'easy', 'medium', 'hard', 'expert'].map((diff) => (
                  <ToggleButton
                    key={diff}
                    active={filter === diff}
                    variant="default"
                    size="sm"
                    className="text-[10px]"
                    onClick={() => {
                      setFilter(diff);
                      if (tab === 'community') fetchCommunity(1);
                    }}
                  >
                    {diff.toUpperCase()}
                  </ToggleButton>
                ))}

                {tab === 'community' && isAuthenticated && (
                  <ToggleButton
                    active={showFavorites}
                    variant="default"
                    size="sm"
                    className={`text-[10px] ${showFavorites ? 'border-orange-500/50 text-orange-400' : ''}`}
                    icon={<Star className={`w-3 h-3 ${showFavorites ? 'fill-current' : ''}`} />}
                    onClick={() => {
                      const next = !showFavorites;
                      setShowFavorites(next);
                      fetchCommunity(1, authorFilterId, next);
                    }}
                  >
                    FAVORITES
                  </ToggleButton>
                )}
              </div>

              {tab === 'community' && (
                <select
                  className="bg-black/40 border border-white/10 rounded-lg text-[10px] text-white/60 px-2 py-1 outline-none"
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    fetchCommunity(1);
                  }}
                >
                  <option value="new">NEWEST</option>
                  <option value="popular">MOST PLAYS</option>
                  <option value="trending">MOST LIKED</option>
                </select>
              )}
            </div>

            {authorFilterId && (
              <div className="flex items-center justify-between bg-purple-500/10 border border-purple-500/30 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs text-purple-200">Songs by <span className="font-bold">{authorName}</span></span>
                </div>
                <button
                  onClick={() => {
                    setAuthorFilterId(null);
                    setAuthorName(null);
                    fetchCommunity(1, null);
                  }}
                  className="text-purple-400 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Song List Scroll Area */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex flex-col gap-3 pb-8">
              {isLoadingCommunity && tab === 'community' ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-10 h-10 text-purple-400 animate-spin mb-4" />
                  <p className="text-white/30 text-sm">Loading tracks...</p>
                </div>
              ) : filteredSongs.length > 0 ? (
                <>
                  {filteredSongs.map((song, index) => (
                    <motion.div
                      key={song.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => setSelectedSongId(song.id)}
                      className={`group relative flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer border ${selectedSongId === song.id
                        ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/10 border-cyan-500/50 shadow-[0_0_20px_rgba(0,229,255,0.1)]'
                        : 'bg-white/5 border-transparent hover:bg-white/10'
                        }`}
                    >
                      <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
                        {iconMap[song.icon || 'music'] && <span className="scale-[0.5]">{iconMap[song.icon || 'music']}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-bold truncate group-hover:text-cyan-300 transition-colors uppercase tracking-tight">{song.title}</h4>
                          <span className="text-[8px] opacity-40 font-black">/</span>
                          <span className="text-[9px] text-white/40 font-bold truncate uppercase">{song.artist}</span>
                        </div>
                        {song.author && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <User className="w-2.5 h-2.5 text-white/20" />
                            <span className="text-[9px] text-white/30 font-medium uppercase tracking-wider">{song.author.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex gap-1.5 items-center">
                          {tab === 'community' && (
                            <div className="flex items-center gap-1 text-[9px] text-white/20 font-bold">
                              <Heart className={`w-2.5 h-2.5 ${song.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                              {song.likes || 0}
                            </div>
                          )}
                          {song.isCloud && <Cloud className="w-3.5 h-3.5 text-cyan-400" />}
                        </div>
                        <span className="text-[8px] font-black uppercase text-white/30 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5">
                          {song.difficulty}
                        </span>
                      </div>
                    </motion.div>
                  ))}

                  {/* Pagination Controls */}
                  {tab === 'community' && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-6 py-4">
                      <NeonButton
                        variant="cyan"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => fetchCommunity(page - 1)}
                      >
                        Prev
                      </NeonButton>
                      <span className="text-xs text-white/40 font-bold">
                        {page} <span className="opacity-20">/</span> {totalPages}
                      </span>
                      <NeonButton
                        variant="cyan"
                        size="sm"
                        disabled={page === totalPages}
                        onClick={() => fetchCommunity(page + 1)}
                      >
                        Next
                      </NeonButton>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                  <p className="text-white/30 italic">
                    {tab === 'my' ? "No local songs yet." : "No community tracks found."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Details (60% width) */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {!selectedSong ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-white/10"
              >
                <Disc className="w-32 h-32 mb-4 animate-spin-slow" />
                <p className="text-xl font-bold tracking-widest uppercase">Select a track to preview</p>
              </motion.div>
            ) : (
              <motion.div
                key={selectedSong.id}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                className="h-full flex flex-col"
              >
                <GlassPanel glow glowColor={selectedSong.iconColor || '#00E5FF'} className="h-full flex flex-col border-white/10">
                  {/* Art & Hero Section */}
                  <div className="flex gap-8 mb-8">
                    <div
                      className="w-48 h-48 rounded-3xl flex items-center justify-center relative overflow-hidden shrink-0 group shadow-2xl"
                      style={{
                        background: `linear-gradient(135deg, ${selectedSong.iconColor}40, ${selectedSong.iconColor}10)`,
                        border: `1px solid ${selectedSong.iconColor}50`
                      }}
                    >
                      <div className="relative z-10 text-white scale-[1.5]">
                        {iconMap[selectedSong.icon || 'music']}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60" />
                      <motion.div
                        className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        whileHover={{ scale: 1.1 }}
                      >
                        <Play className="w-12 h-12 text-white fill-current" />
                      </motion.div>
                    </div>

                    <div className="flex-1 flex flex-col justify-end pb-2">
                      <div className="flex items-center gap-2 mb-2 text-cyan-400 font-bold tracking-widest text-xs uppercase">
                        {tab === 'my' ? 'Local Chart' : 'Community Submission'}
                      </div>
                      <h2 className="text-5xl font-black text-white mb-2 tracking-tighter uppercase leading-none">{selectedSong.title}</h2>

                      <div className="flex items-center gap-3 mb-6">
                        <p className="text-xl text-white/60 uppercase tracking-[0.2em] font-light">{selectedSong.artist}</p>
                        {selectedSong.author && (
                          <div
                            className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                            onClick={() => {
                              setAuthorFilterId(selectedSong.author!.id);
                              setAuthorName(selectedSong.author!.name);
                              fetchCommunity(1, selectedSong.author!.id);
                            }}
                          >
                            <User className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">By {selectedSong.author.name}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <NeonButton variant="cyan" size="lg" icon={<Play className="w-6 h-6" />} onClick={handlePlaySelected} className="px-10">
                          PLAY NOW
                        </NeonButton>

                        {tab === 'community' && (
                          <>
                            <IconButton
                              variant={selectedSong.isLiked ? 'pink' : 'primary'}
                              size="lg"
                              icon={<Heart className={`w-5 h-5 ${selectedSong.isLiked ? 'fill-current' : ''}`} />}
                              onClick={() => handleLike(selectedSong.id)}
                            />
                            <IconButton
                              variant={selectedSong.isFavorited ? 'orange' : 'primary'}
                              size="lg"
                              icon={<Star className={`w-5 h-5 ${selectedSong.isFavorited ? 'fill-current' : ''}`} />}
                              onClick={() => handleFavorite(selectedSong.id)}
                            />
                          </>
                        )}

                        {tab === 'my' && onEditSong && (
                          <IconButton variant="primary" size="lg" icon={<Edit2 className="w-5 h-5" />} onClick={() => onEditSong(selectedSong)} />
                        )}

                        {tab === 'my' && onDeleteSong && (
                          <IconButton variant="danger" size="lg" icon={<Trash2 className="w-5 h-5 text-red-400" />} onClick={() => setShowDeleteConfirm(selectedSong.id)} />
                        )}

                        {tab === 'my' && !selectedSong.notation && (
                          <IconButton variant="primary" size="lg" icon={<Cloud className="w-5 h-5 text-cyan-400" />} onClick={() => syncSong(selectedSong)} title="Save to Cloud" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                      <div className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                        <Star className="w-3 h-3 text-yellow-400" /> Difficulty
                      </div>
                      <div className="text-xl font-bold uppercase" style={{ color: difficultyColors[selectedSong.difficulty] }}>
                        {selectedSong.difficulty}
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                      <div className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                        <Clock className="w-3 h-3 text-cyan-400" /> Duration
                      </div>
                      <div className="text-xl font-bold text-white uppercase">
                        {Math.floor((selectedSong.duration || 0) / 60)}:{String(Math.floor((selectedSong.duration || 0) % 60)).padStart(2, '0')}
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                      <div className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                        <Zap className="w-3 h-3 text-orange-400" /> Tempo
                      </div>
                      <div className="text-xl font-bold text-white uppercase">
                        {selectedSong.bpm || '--'} <span className="text-xs text-white/30">BPM</span>
                      </div>
                    </div>
                  </div>

                  {/* Social Stats */}
                  {tab === 'community' && (
                    <div className="flex gap-6 mb-8 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Plays</span>
                        <div className="flex items-center gap-2 text-xl font-black text-white">
                          <Play className="w-4 h-4 text-cyan-400 fill-current" />
                          {selectedSong.plays || 0}
                        </div>
                      </div>
                      <div className="w-px h-10 bg-white/10" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Likes</span>
                        <div className="flex items-center gap-2 text-xl font-black text-white">
                          <Heart className="w-4 h-4 text-red-500 fill-current" />
                          {selectedSong.likes || 0}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Metadata & Links */}
                  <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
                    <div className="bg-black/40 rounded-3xl p-6 border border-white/10 overflow-y-auto custom-scrollbar">
                      <h5 className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-4">Track Information</h5>
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between py-3 border-b border-white/5">
                          <span className="text-white/30 text-xs text-nowrap">Creation Date</span>
                          <span className="text-white/80 text-xs font-medium">{new Date(selectedSong.createdAt || Date.now()).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-white/5">
                          <span className="text-white/30 text-xs text-nowrap">Note Count</span>
                          <span className="text-white/80 text-xs font-medium">{(selectedSong.notes?.length || 0)} Active Notes</span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-white/5">
                          <span className="text-white/30 text-xs text-nowrap">Time Signature</span>
                          <span className="text-white/80 text-xs font-medium">{selectedSong.timeSignature || '4/4'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-black/40 rounded-3xl p-6 border border-white/10">
                      <h5 className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-4">Quick Links</h5>
                      <div className="flex flex-col gap-2">
                        <button className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group">
                          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-500">
                            <Play className="w-4 h-4 fill-current" />
                          </div>
                          <span className="text-white/70 text-xs font-bold group-hover:text-white transition-colors">YOUTUBE REFERENCE</span>
                        </button>
                        <button className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors group">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500">
                            <Globe className="w-4 h-4" />
                          </div>
                          <span className="text-white/70 text-xs font-bold group-hover:text-white transition-colors">COMMUNITY PAGE</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </GlassPanel>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Sync Prompt Bar (My Songs only) */}
      <AnimatePresence>
        {tab === 'my' && isAuthenticated && hasUnsyncedSongs && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl z-50 px-4"
          >
            <div className="bg-cyan-500/20 backdrop-blur-xl border border-cyan-500/30 rounded-3xl p-4 flex items-center justify-between shadow-2xl shadow-cyan-500/10">
              <div className="flex items-center gap-4 pl-4">
                <Cloud className="w-10 h-10 text-cyan-400" />
                <div>
                  <h4 className="text-white font-bold leading-tight uppercase tracking-tight">Sync Library</h4>
                  <p className="text-cyan-200/50 text-xs font-medium">Backup your tracks to the Kalimba Cloud.</p>
                </div>
              </div>
              <NeonButton
                variant="cyan"
                size="sm"
                disabled={isSyncing}
                onClick={syncAllLocal}
                icon={isSyncing ? <Loader2 className="animate-spin w-4 h-4" /> : <Cloud className="w-4 h-4" />}
              >
                {isSyncing ? 'Syncing...' : 'Sync All'}
              </NeonButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)} />
            <motion.div
              className="relative w-full max-w-md"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
            >
              <GlassPanel padding="lg" className="border-red-500/30">
                <h3 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter">Wait a second!</h3>
                <p className="text-white/60 mb-8 leading-relaxed">
                  Are you sure you want to delete <span className="text-white font-bold uppercase">"{activeSongs.find(s => s.id === showDeleteConfirm)?.title}"</span>? This cannot be undone.
                </p>
                <div className="flex gap-4">
                  <NeonButton variant="purple" fullWidth onClick={() => setShowDeleteConfirm(null)}>
                    Cancel
                  </NeonButton>
                  <NeonButton variant="cyan" fullWidth onClick={() => {
                    if (onDeleteSong && showDeleteConfirm) {
                      // Find cloudId to sync with community tab state
                      const songToDelete = songs.find(s => s.id === showDeleteConfirm);
                      const cloudId = songToDelete?.cloudId;

                      onDeleteSong(showDeleteConfirm);

                      if (cloudId) {
                        setCommunitySongs(prev => prev.filter(s => s.id !== cloudId));
                      }

                      setSelectedSongId(null);
                      setShowDeleteConfirm(null);
                    }
                  }}>
                    Confirm
                  </NeonButton>
                </div>
              </GlassPanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 229, 255, 0.2);
          border-radius: 20px;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
};

export default SongLibrary;
