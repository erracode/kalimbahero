// ============================================
// Kalimba Hero - Song Library Component (Aurora Style)
// ============================================

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Play, Trash2, Edit2, Star, Heart, Music, Zap, ArrowLeft, Snowflake, Sword, Bell, Box, FileText } from 'lucide-react';
import { NeonButton } from './NeonButton';
import type { Song } from '@/types/game';
import { useSongStore } from '@/stores/songStore';
import { useAuthSync } from '@/hooks/useAuthSync';
import { cn } from '@/lib/utils';
import { AuroraBackground } from './AuroraBackground';

type GameMode = '3d' | 'tab';

interface SongLibraryProps {
  onSelectSong: (song: Song) => void;
  onEditSong?: (song: Song) => void;
  onDeleteSong?: (songId: string) => void;
  onCreateNew?: () => void;
  onBack: () => void;
  gameMode?: GameMode;
  onGameModeChange?: (mode: GameMode) => void;
  initialView?: 'all' | 'bookmarks' | 'my-tabs';
}

// Icon map for song details
const iconMap: Record<string, React.ReactNode> = {
  star: <Star className="w-full h-full" />,
  music: <Music className="w-full h-full" />,
  snowflake: <Snowflake className="w-full h-full" />,
  sword: <Sword className="w-full h-full" />,
  heart: <Heart className="w-full h-full" />,
  bell: <Bell className="w-full h-full" />,
  zap: <Zap className="w-full h-full" />,
};

const difficultyColors: Record<string, string> = {
  easy: '#6BCB77', // Green
  medium: '#FFD93D', // Yellow
  hard: '#FF8E53', // Orange
  expert: '#FF6B6B', // Red
};

export const SongLibrary: React.FC<SongLibraryProps> = ({
  onSelectSong,
  onEditSong,
  onDeleteSong,
  onCreateNew,
  onBack,
  gameMode = '3d',
  onGameModeChange,
  initialView = 'all',
}) => {
  const { songs } = useSongStore();
  const [filter, setFilter] = useState<string>('all');
  // Set initial tab based on initialView prop
  // bookmarks and all -> Global tab, my-tabs -> My Tabs tab
  const [tab, setTab] = useState<'my' | 'community'>(initialView === 'my-tabs' ? 'my' : 'community');
  const [subFilter, setSubFilter] = useState<'all' | 'bookmarks' | 'my-tabs'>(initialView);
  const [communitySongs, setCommunitySongs] = useState<Song[]>([]);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination & Social Filters
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1); // Added page state
  const sort = 'new';
  const showFavorites = subFilter === 'bookmarks'; // Derived from subFilter

  const { isAuthenticated } = useAuthSync();

  const fetchCommunity = async (targetPage = page) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        sort,
        limit: '12',
        ...(filter !== 'all' && { difficulty: filter }),
        ...(showFavorites && { favoritesOnly: 'true' })
      });

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
        setPage(json.pagination.page);
      }
    } catch (err) {
      console.error("Failed to fetch community songs", err);
    } finally {
      setIsLoading(false);
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

  const incrementPlay = async (songId: string) => {
    try {
      fetch(`http://localhost:3000/api/songs/${songId}/play`, { method: 'POST' });
    } catch (err) { /* ignore */ }
  };

  const handleTabChange = (newTab: 'my' | 'community') => {
    setTab(newTab);
    setSelectedSongId(null);
    if (newTab === 'community' && subFilter === 'my-tabs') {
      setSubFilter('all');
    }
  };

  useEffect(() => {
    if (tab === 'community') {
      fetchCommunity();
    }
  }, [filter, page, showFavorites, tab, sort]);

  const activeSongs = tab === 'my' ? songs : communitySongs;

  const filteredSongs = useMemo(() => {
    let result = activeSongs;

    // Sub-filters for 'My' tab
    if (tab === 'my') {
      if (subFilter === 'bookmarks') {
        result = result.filter((s: Song) => s.isFavorited || s.isLiked);
      } else if (subFilter === 'my-tabs') {
        result = result.filter((s: Song) => !s.cloudId);
      }
    }

    // Difficulty Filter
    if (filter !== 'all') {
      result = result.filter((s: Song) => s.difficulty === filter);
    }

    // Search Query
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s: Song) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q)
      );
    }

    return result;
  }, [filter, activeSongs, searchQuery, subFilter, tab]);

  const selectedSong = useMemo(() => {
    return activeSongs.find(s => s.id === selectedSongId) || null;
  }, [selectedSongId, activeSongs]);

  const handlePlaySelected = () => {
    if (selectedSong) {
      if (tab === 'community') incrementPlay(selectedSong.id);
      onSelectSong(selectedSong);
    }
  };

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();

      if (!selectedSongId && filteredSongs.length > 0) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          setSelectedSongId(filteredSongs[0].id);
        }
      } else if (selectedSongId) {
        const idx = filteredSongs.findIndex(s => s.id === selectedSongId);
        if (e.key === 'ArrowDown') {
          const nextIndex = (idx + 1) % filteredSongs.length;
          setSelectedSongId(filteredSongs[nextIndex].id);
        } else if (e.key === 'ArrowUp') {
          const prevIndex = (idx - 1 + filteredSongs.length) % filteredSongs.length;
          setSelectedSongId(filteredSongs[prevIndex].id);
        } else if (e.key === 'Enter') {
          handlePlaySelected();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSongId, filteredSongs]);


  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen w-screen relative overflow-hidden flex flex-col font-sans"
    >

      {/* Background Ambience */}
      <div className="absolute inset-0 bg-black z-0">
        <div className="absolute inset-0 opacity-40">
          <AuroraBackground />
        </div>
        <div className="absolute inset-0 bg-black/50 z-10" /> {/* Darken slightly for readability */}
        <div className="absolute inset-0 bg-[url('/grid.png')] opacity-[0.05] z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80 z-10" />
      </div>

      {/* ================= HEADER SECTION ================= */}
      <header className="relative z-20 flex-none border-b border-white/5 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center justify-between px-8 py-4">
          {/* Left: Title & Back */}
          <div className="flex items-center gap-6">
            <button
              onClick={onBack}
              className="group flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-none skew-x-[-12deg] transition-all border border-white/5 hover:border-white/20 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-white/60 group-hover:text-white skew-x-[12deg]" />
            </button>

            <div className="flex flex-col">
              <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase leading-none drop-shadow-md">
                Song Library
              </h1>
              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 mt-1">
                <span>{activeSongs.length} Tracks</span>
              </div>
            </div>
          </div>

          {/* Right: Mode Toggle (High Visibility) */}
          <div className="flex items-center gap-8">
            {onGameModeChange && (
              <div className="flex bg-black/60 p-1 rounded-none skew-x-[-12deg] border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                <button
                  onClick={() => onGameModeChange('3d')}
                  className={cn(
                    "flex items-center gap-2 px-10 py-3 rounded-none text-xs font-black italic uppercase tracking-widest transition-all cursor-pointer",
                    gameMode === '3d' ? "bg-cyan-600 text-white shadow-lg" : "text-white/40 hover:text-white"
                  )}
                >
                  <Box className="w-4 h-4 skew-x-[12deg]" />
                  <span className="skew-x-[12deg]">Hero Play</span>
                </button>
                <button
                  onClick={() => onGameModeChange('tab')}
                  className={cn(
                    "flex items-center gap-2 px-10 py-3 rounded-none text-xs font-black italic uppercase tracking-widest transition-all cursor-pointer",
                    gameMode === 'tab' ? "bg-purple-600 text-white shadow-lg" : "text-white/40 hover:text-white"
                  )}
                >
                  <FileText className="w-4 h-4 skew-x-[12deg]" />
                  <span className="skew-x-[12deg]">Notation</span>
                </button>
              </div>
            )}

            {tab === 'my' && onCreateNew && (
              <button
                onClick={onCreateNew}
                className="group flex items-center gap-2 px-6 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 rounded-none skew-x-[-12deg] transition-all border border-cyan-500/20 hover:border-cyan-500/40 cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.1)] hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]"
              >
                <Plus className="w-4 h-4 skew-x-[12deg]" />
                <span className="skew-x-[12deg] text-xs font-black italic uppercase tracking-widest">Create New</span>
              </button>
            )}

            {/* Library Source Switch */}
            <div className="flex bg-black/40 p-1 rounded-none skew-x-[-12deg] border border-white/5">
              <button
                onClick={() => handleTabChange('my')}
                className={cn(
                  "px-10 py-3 rounded-none text-xs font-black italic uppercase tracking-widest transition-all cursor-pointer",
                  tab === 'my' ? "bg-white/10 text-white shadow" : "text-white/30 hover:text-white"
                )}
              >
                <span className="skew-x-[12deg] block">My Tabs</span>
              </button>
              <button
                onClick={() => handleTabChange('community')}
                className={cn(
                  "px-10 py-3 rounded-none text-xs font-black italic uppercase tracking-widest transition-all cursor-pointer",
                  tab === 'community' ? "bg-white/10 text-white shadow" : "text-white/30 hover:text-white"
                )}
              >
                <span className="skew-x-[12deg] block">Global</span>
              </button>
            </div>

            {/* Sub-filters */}
            <div className="flex items-center gap-2 ml-6">
              {(tab === 'my'
                ? (['all', 'my-tabs', 'bookmarks'] as const)
                : (['all', 'bookmarks'] as const)
              ).map((sf) => (
                <button
                  key={sf}
                  onClick={() => setSubFilter(sf)}
                  className={cn(
                    "px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer border",
                    subFilter === sf
                      ? "bg-cyan-500/20 border-cyan-500 text-cyan-400"
                      : "bg-transparent border-white/10 text-white/40 hover:text-white hover:border-white/20"
                  )}
                >
                  {sf === 'all' ? 'All' : sf === 'my-tabs' ? 'Created' : 'Saved'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Secondary Bar: Filters */}
        <div className="flex items-center px-8 h-16 bg-white/[0.02] border-t border-white/5 gap-10">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative w-full skew-x-[-12deg] group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none skew-x-[12deg]">
                <Search className="w-4 h-4 text-white/30" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="SEARCH FOR A TRACK..."
                className="w-full bg-black/40 border border-white/10 py-2.5 pl-12 pr-4 text-xs font-black italic tracking-widest text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 transition-colors uppercase"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-[10px] font-black italic uppercase tracking-[0.2em] text-white/30 mr-4">
              <span>Filter:</span>
            </div>
            {['all', 'easy', 'medium', 'hard', 'expert'].map(diff => (
              <button
                key={diff}
                onClick={() => setFilter(diff)}
                className={cn(
                  "relative group px-6 py-2 rounded-none skew-x-[-12deg] border transition-all duration-300 overflow-hidden cursor-pointer",
                  // Base Styles & Borders
                  filter === diff
                    ? "text-black scale-105 shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                    : "bg-black/40 text-white/40 border-white/10 hover:border-white/30",

                  // Active State Specific Color Borders/Shadows
                  filter === diff && diff === 'all' && "bg-white border-white",
                  filter === diff && diff === 'easy' && "bg-green-400 border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.5)]",
                  filter === diff && diff === 'medium' && "bg-yellow-400 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)]",
                  filter === diff && diff === 'hard' && "bg-orange-500 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.5)]",
                  filter === diff && diff === 'expert' && "bg-purple-500 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)]",
                )}
              >
                {/* Hover Fill Effect (Gradient) */}
                <div className={cn(
                  "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r",
                  diff === 'all' && "from-white/20 to-transparent",
                  diff === 'easy' && "from-green-500/40 to-transparent",
                  diff === 'medium' && "from-yellow-500/40 to-transparent",
                  diff === 'hard' && "from-orange-500/40 to-transparent",
                  diff === 'expert' && "from-purple-500/40 to-transparent",
                  // Hide hover effect if active (since active has solid bg)
                  filter === diff && "hidden"
                )} />

                {/* Text Content */}
                <span className={cn(
                  "relative z-10 skew-x-[12deg] block font-black italic uppercase text-xs tracking-wider transition-colors duration-200",
                  filter !== diff && "group-hover:text-white"
                )}>
                  {diff}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>


      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 flex min-h-0 relative z-20">

        {/* LEFT: SCROLLABLE SONG LIST */}
        <div className="flex-1 flex flex-col min-w-0 bg-transparent">
          {/* List Header */}
          <div className="flex-none flex items-center px-10 py-3 text-[10px] font-black uppercase tracking-widest text-white/40 border-b border-white/5 bg-black/20 backdrop-blur-md">
            <div className="flex-[2]">Artist</div>
            <div className="flex-[3]">Song Title</div>
            <div className="flex-[1] text-center">Difficulty</div>
            <div className="flex-[1] text-right">Time</div>
          </div>

          {/* Scroll Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20">
            <div className="flex flex-col">
              {isLoading && tab === 'community' ? (
                <div className="grid grid-cols-1 gap-1">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex items-center px-10 py-4 bg-white/[0.03] border-b border-white/[0.03] animate-pulse">
                      <div className="flex-[2] h-4 bg-white/10 rounded-sm mr-4" />
                      <div className="flex-[3] h-6 bg-white/10 rounded-sm mr-4" />
                      <div className="flex-[1] flex justify-center">
                        <div className="w-3 h-3 bg-white/10 rounded-none rotate-45" />
                      </div>
                      <div className="flex-[1] h-4 bg-white/10 rounded-sm ml-4" />
                    </div>
                  ))}
                </div>
              ) : filteredSongs.length > 0 ? filteredSongs.map((song) => {
                const isSelected = selectedSongId === song.id;
                return (
                  <motion.div
                    layout
                    key={song.id}
                    onClick={() => setSelectedSongId(song.id)}
                    className={cn(
                      "group flex items-center px-10 py-4 cursor-pointer border-b border-white/[0.03] transition-colors duration-150",
                      isSelected
                        ? "bg-white text-black z-10 shadow-[0_4px_20px_rgba(0,0,0,0.5)] border-transparent"
                        : "hover:bg-white/5 text-white/60 hover:text-white"
                    )}
                  >
                    {/* Artist */}
                    <div className="flex-[2] text-xs font-bold uppercase tracking-wide truncate pr-4 opacity-80">
                      {song.artist}
                    </div>

                    {/* Title */}
                    <div className={cn("flex-[3] text-lg font-black italic uppercase tracking-wider truncate pr-4", isSelected ? "text-black" : "text-white")}>
                      {song.title}
                    </div>

                    {/* Difficulty */}
                    <div className="flex-[1] flex justify-center">
                      <span
                        className="w-3 h-3 rounded-none rotate-45 shadow-sm"
                        style={{ backgroundColor: difficultyColors[song.difficulty] || '#666' }}
                      />
                    </div>

                    {/* Time */}
                    <div className="flex-[1] text-right font-mono text-xs font-medium opacity-60">
                      {Math.floor((song.duration || 0) / 60)}:{String(Math.floor((song.duration || 0) % 60)).padStart(2, '0')}
                    </div>
                  </motion.div>
                );
              }) : (
                <div className="flex flex-col items-center justify-center py-32 text-white/20">
                  <Music className="w-16 h-16 mb-4 opacity-20" />
                  <p className="font-bold uppercase tracking-widest">No Tracks Available</p>
                </div>
              )}
              <div className="h-20" />
            </div>
          </div>
        </div>


        {/* RIGHT: FIXED DETAILS PANEL (Refined) */}
        <div className="w-[550px] flex-none bg-[#050505]/95 border-l border-white/10 flex flex-col shadow-2xl backdrop-blur-xl relative">
          <AnimatePresence mode="wait">
            {selectedSong ? (
              <motion.div
                key={selectedSong.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full"
              >
                {/* Compact Header with Smaller Image */}
                <div className="flex items-center p-6 gap-6 bg-white/[0.02] border-b border-white/5">
                  {/* Album Art (Smaller) */}
                  <div className="relative w-32 h-32 rounded-none skew-x-[-12deg] bg-black box-border border border-white/10 shadow-lg overflow-hidden flex-none group">
                    <div className="absolute inset-0 flex items-center justify-center text-white/10 skew-x-[12deg]">
                      {iconMap[selectedSong.icon || 'music']}
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer skew-x-[12deg]" onClick={handlePlaySelected}>
                      <Play className="w-12 h-12 text-white drop-shadow-lg" />
                    </div>
                  </div>

                  {/* Titles */}
                  <div className="flex flex-col min-w-0">
                    <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-[0.9] mb-2 truncate break-words whitespace-normal drop-shadow-md">
                      {selectedSong.title}
                    </h2>
                    <p className="text-sm text-cyan-400 font-bold uppercase tracking-[0.2em] truncate">
                      {selectedSong.artist}
                    </p>
                  </div>
                </div>

                {/* Expanded Details List (Fills space, no scroll needed mostly) */}
                <div className="flex-1 p-8 flex flex-col gap-6">

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-1">
                      <span className="block text-[10px] font-black uppercase text-white/30 tracking-widest">Charter</span>
                      <span className="block text-lg font-bold text-white uppercase truncate">{selectedSong.author?.name || 'Unknown'}</span>
                    </div>
                    <div className="space-y-1 text-right">
                      <span className="block text-[10px] font-black uppercase text-white/30 tracking-widest">Length</span>
                      <span className="block text-lg font-bold text-white uppercase font-mono">{Math.floor((selectedSong.duration || 0) / 60)}:{String(Math.floor((selectedSong.duration || 0) % 60)).padStart(2, '0')}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="block text-[10px] font-black uppercase text-white/30 tracking-widest">Genre</span>
                      <span className="block text-lg font-bold text-white uppercase truncate">Rock</span>
                    </div>
                    <div className="space-y-1 text-right">
                      <span className="block text-[10px] font-black uppercase text-white/30 tracking-widest">Year</span>
                      <span className="block text-lg font-bold text-white uppercase truncate">2024</span>
                    </div>
                  </div>

                  <div className="h-px bg-white/5 w-full my-2" />

                  {/* Difficulty Badge & Social Stats */}
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-2 flex-1">
                        <span className="text-[10px] font-black italic uppercase text-white/30 tracking-widest">Difficulty</span>
                        <div className="flex items-center gap-4">
                          <div
                            className="h-10 px-4 rounded-none skew-x-[-12deg] flex items-center justify-center font-black italic uppercase text-black shadow-[0_0_15px_rgba(0,0,0,0.3)]"
                            style={{ backgroundColor: difficultyColors[selectedSong.difficulty] }}
                          >
                            <span className="skew-x-[12deg]">
                              {selectedSong.difficulty}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleLike(selectedSong.id)}
                          className={cn(
                            "group flex items-center gap-2 px-6 py-3 rounded-none skew-x-[-12deg] border transition-all cursor-pointer",
                            selectedSong.isLiked
                              ? "bg-cyan-500/10 border-cyan-500 text-cyan-400"
                              : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/20"
                          )}
                          title="Bookmark Song"
                        >
                          <Heart className={cn("w-4 h-4 skew-x-[12deg]", selectedSong.isLiked && "fill-cyan-500")} />
                          <span className="skew-x-[12deg] text-xs font-black italic uppercase tracking-wider">BOOKMARK</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 h-1.5 bg-white/10 rounded-none overflow-hidden skew-x-[-12deg]">
                      <div
                        className="h-full rounded-none"
                        style={{
                          width: selectedSong.difficulty === 'easy' ? '25%' : selectedSong.difficulty === 'medium' ? '50%' : selectedSong.difficulty === 'hard' ? '75%' : '100%',
                          backgroundColor: difficultyColors[selectedSong.difficulty]
                        }}
                      />
                    </div>
                  </div>

                  {/* Rating System (WIP) */}
                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-black italic uppercase text-white/30 tracking-widest">Community Rating</span>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button key={s} className="group cursor-pointer">
                          <Star className={cn("w-6 h-6 transition-all", s <= 4 ? "text-yellow-500 fill-yellow-500" : "text-white/10 group-hover:text-yellow-500/50")} />
                        </button>
                      ))}
                      <span className="ml-2 text-sm font-bold text-white/60">4.0 (12 votes)</span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-black border-t border-white/10 flex flex-col gap-3">
                  <NeonButton
                    variant="cyan"
                    fullWidth
                    onClick={handlePlaySelected}
                    className="h-16 text-2xl font-black italic tracking-widest uppercase rounded-none skew-x-[-12deg] hover:scale-[1.02] transition-transform shadow-[0_0_30px_rgba(6,182,212,0.2)]"
                  >
                    PLAY TRACK
                  </NeonButton>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => window.open(`/tab/${selectedSong.id}`, '_blank')}
                      className="py-3 w-full text-xs font-black italic uppercase tracking-[0.2em] bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-black rounded-none skew-x-[-12deg] border border-cyan-500/30 hover:border-cyan-400 transition-all cursor-pointer flex items-center justify-center gap-2 group shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]"
                    >
                      <span className="block skew-x-[12deg]">VIEW FULL TAB →</span>
                    </button>
                    <div className="flex gap-2">
                      {tab === 'my' && onEditSong && (
                        <button onClick={() => onEditSong(selectedSong)} className="flex-1 py-3 text-xs font-bold uppercase tracking-widest bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-none border border-white/5 transition-colors cursor-pointer">
                          <Edit2 className="w-4 h-4 mx-auto" />
                        </button>
                      )}
                      {tab === 'my' && onDeleteSong && (
                        <button onClick={() => setShowDeleteConfirm(selectedSong.id)} className="flex-1 py-3 text-xs font-bold uppercase tracking-widest bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 rounded-none border border-red-500/10 transition-colors cursor-pointer">
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-white/20">
                <div className="w-40 h-40 rounded-none skew-x-[-12deg] border-2 border-dashed border-white/5 flex items-center justify-center mb-8 animate-pulse bg-white/[0.01]">
                  <div className="skew-x-[12deg]">
                    <Music className="w-16 h-16 opacity-30" />
                  </div>
                </div>
                <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-2 text-white/30">Select Track</h3>
                <p className="text-xs font-bold uppercase tracking-[0.3em] opacity-40">Ready to Rock?</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111] border border-white/10 p-8 max-w-md w-full shadow-2xl rounded-xl"
            >
              <h3 className="text-2xl font-black italic text-white uppercase mb-4">Delete Song?</h3>
              <p className="text-white/60 mb-8">
                This action cannot be undone. <span className="text-white font-bold">{activeSongs.find(s => s.id === showDeleteConfirm)?.title}</span> will be permanently removed.
              </p>
              <div className="flex gap-4">
                <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold uppercase text-xs tracking-widest rounded transition-colors">Cancel</button>
                <button
                  onClick={() => {
                    if (onDeleteSong && showDeleteConfirm) onDeleteSong(showDeleteConfirm);
                    setShowDeleteConfirm(null);
                    setSelectedSongId(null);
                  }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold uppercase text-xs tracking-widest rounded transition-colors shadow-lg"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 0px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
    </motion.div>
  );
};
