// ============================================
// Kalimba Hero - Song Library Component (Aurora Style)
// ============================================

import { useState, useMemo, useEffect } from 'react';
import { useDebounce } from "@uidotdev/usehooks";
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Play, Trash2, Edit2, Star, Heart, Music, Zap, ArrowLeft, Snowflake, Sword, Bell, Box, FileText, Cloud, HardDrive, Loader2, AlertTriangle, Youtube } from 'lucide-react';
import { NeonButton } from './NeonButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import type { Song } from '@/types/game';
import { useSongStore } from '@/stores/songStore';
import { useAuth } from '@/hooks/useAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { AuroraBackground } from './AuroraBackground';
import { useUIStore } from '@/stores/uiStore';

type GameMode = '3d' | 'tab';

interface SongLibraryProps {
  onSelectSong: (song: Song) => void;
  onEditSong?: (song: Song) => void;
  onDeleteSong?: (song: Song) => Promise<void>;
  onCreateNew?: () => void;
  onBack: () => void;
  gameMode?: GameMode;
  onGameModeChange?: (mode: GameMode) => void;
  searchParams: {
    q?: string;
    difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
    category?: string;
    view?: 'all' | 'bookmarks' | 'my-tabs';
    bookmarks?: boolean;
    tuning?: string;
    tines?: number;
  };
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

const SONG_CATEGORIES = [
  'Pop', 'Anime', 'Rock', 'OST', 'Classical', 'Game',
  'Valentine', 'Christmas', 'Halloween', 'Meme', 'Disney',
  'TV', 'K-pop', 'Movies', 'Nursery rhymes', 'Traditional', 'Worship'
];

// Helper to extract YouTube ID
const getYoutubeId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export const SongLibrary: React.FC<SongLibraryProps> = ({
  onSelectSong,
  onEditSong,
  onDeleteSong,
  onCreateNew,
  onBack,
  gameMode = '3d',
  onGameModeChange,
  searchParams,
}) => {
  const navigate = useNavigate();
  const { songs } = useSongStore();
  const { openAuth } = useUIStore();

  // URL Params Derivation
  const filter = searchParams.difficulty || 'all';
  const tab = searchParams.view === 'my-tabs' ? 'my' : 'community';

  // "Bookmarks" is now a toggle regardless of tab (though mostly for community)
  // But for legacy compatibility with 'view=bookmarks', we treat it as active
  const showFavorites = searchParams.bookmarks || searchParams.view === 'bookmarks';
  const searchQuery = searchParams.q || '';
  const activeCategory = searchParams.category || 'all';
  const activeTuning = searchParams.tuning || 'all';
  const activeTines = searchParams.tines || 'all';

  const [communitySongs, setCommunitySongs] = useState<Song[]>([]);
  const [userSongs, setUserSongs] = useState<Song[]>([]);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Guest Bookmarks State
  const [guestBookmarks, setGuestBookmarks] = useLocalStorage<string[]>('kalimba_guest_bookmarks', []);

  // Pagination & Social Filters
  const [isLoading, setIsLoading] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const sort = 'new';

  const { isAuthenticated, user } = useAuth();

  // Local state for debounced search
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  // Sync local searchTerm with URL if it changes externally (e.g. back button)
  useEffect(() => {
    setSearchTerm(searchQuery);
  }, [searchQuery]);

  // Update URL search params when debounced term changes
  useEffect(() => {
    if (debouncedSearchTerm !== searchQuery) {
      updateSearch({ q: debouncedSearchTerm });
    }
  }, [debouncedSearchTerm]);

  const updateSearch = (updates: Partial<typeof searchParams>) => {
    navigate({
      to: '/library',
      search: (prev) => {
        const next = { ...prev, ...updates };
        // Clean up empty/all filters
        if ((next.difficulty as any) === 'all') delete next.difficulty;
        if ((next.category as any) === 'all') delete next.category;
        if ((next.tuning as any) === 'all') delete next.tuning;
        if ((next.tines as any) === 'all') delete next.tines;
        if (next.q === '') delete next.q;
        return next;
      },
      replace: true
    });
  };

  const fetchCommunity = async (targetPage = page) => {
    // Logic Split: Auth vs Guest for Bookmarks
    if (showFavorites && !isAuthenticated) {
      // GUEST BOOKMARKS FETCH
      // API doesn't support ids filtering, so we fetch individual songs
      if (guestBookmarks.length === 0) {
        setCommunitySongs([]);
        return;
      }

      setIsLoading(true);
      try {
        const promises = guestBookmarks.map(id =>
          fetch(`http://localhost:3000/api/songs/${id}`).then(res => res.ok ? res.json() : null)
        );

        const results = await Promise.all(promises);
        const validSongs = results
          .filter(r => r && r.success && r.data)
          .map(r => ({
            ...r.data.songData,
            id: r.data.id,
            title: r.data.title || r.data.songData?.title,
            artist: r.data.artist || r.data.songData?.artist,
            difficulty: r.data.difficulty || r.data.songData?.difficulty || 'medium',
            author: r.data.author,
            likes: r.data.likes,
            plays: r.data.plays,
            isLiked: false,
            isFavorited: false, // Guest "favorite" is local
            averageRating: r.data.averageRating,
            userRating: r.data.userRating, // Likely null for guest
            voteCount: r.data.voteCount
          }));

        setCommunitySongs(validSongs);
        // Pagination is artificial for guest bookmarks (all loaded)
        setPage(1);
      } catch (err) {
        console.error("Failed to fetch guest bookmarks", err);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // AUTH / NORMAL DISCOVERY FETCH
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        sort,
        limit: '12',
        ...(filter !== 'all' && { difficulty: filter }),
        // Only pass favoritesOnly if authenticated
        ...(showFavorites && isAuthenticated && { favoritesOnly: 'true' }),
        ...(searchQuery && { q: searchQuery }),
        ...(activeCategory !== 'all' && { category: activeCategory }),
        ...(activeTuning !== 'all' && { tuning: activeTuning }),
        ...(activeTines !== 'all' && { tines: activeTines.toString() }),
      });

      const res = await fetch(`http://localhost:3000/api/songs?${params}`, {
        credentials: isAuthenticated ? 'include' : 'omit'
      });

      const json = await res.json();
      if (json.success) {
        setCommunitySongs(json.data.map((s: any) => ({
          ...s.songData,
          id: s.id,
          title: s.title || s.songData?.title,
          artist: s.artist || s.songData?.artist,
          difficulty: s.difficulty || s.songData?.difficulty || 'medium',
          author: s.author,
          likes: s.likes,
          plays: s.plays,
          isLiked: s.isLiked, // From Auth
          isFavorited: s.isFavorited, // From Auth
          averageRating: s.averageRating,
          userRating: s.userRating,
          voteCount: s.voteCount,
          isCloud: true,
          cloudId: s.id,
          isPublic: s.isPublic
        })));
        setPage(json.pagination.page);
      }
    } catch (err) {
      console.error("Failed to fetch community songs", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserSongs = async () => {
    if (!isAuthenticated || !user) return;
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/songs/me`, {
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) {
        setUserSongs(json.data.map((s: any) => ({
          ...s.songData,
          id: s.id,
          title: s.title || s.songData?.title,
          artist: s.artist || s.songData?.artist,
          difficulty: s.difficulty || s.songData?.difficulty || 'medium',
          author: s.author,
          likes: s.likes,
          plays: s.plays,
          isLiked: s.isLiked,
          isFavorited: s.isFavorited,
          averageRating: s.averageRating,
          userRating: s.userRating,
          voteCount: s.voteCount,
          isCloud: true,
          cloudId: s.id,
          isPublic: s.isPublic
        })));
      }
    } catch (err) {
      console.error("Failed to fetch user songs", err);
    } finally {
      setIsLoading(false);
    }
  };

  const isSongBookmarked = (song: Song) => {
    if (isAuthenticated) return song.isFavorited || song.isLiked; // Simplified for now
    return guestBookmarks.includes(song.id);
  };

  const handleToggleBookmark = async (song: Song) => {
    if (isAuthenticated) {
      // Auth Flow
      setIsBookmarking(song.id);
      try {
        const res = await fetch(`http://localhost:3000/api/songs/${song.id}/like`, { method: 'POST', credentials: 'include' });
        const json = await res.json();
        if (json.success) {
          setCommunitySongs(prev => prev.map(s =>
            s.id === song.id ? { ...s, isLiked: json.isLiked, likes: (s.likes || 0) + (json.isLiked ? 1 : -1) } : s
          ));
        }
      } catch (err) {
        console.error("Failed to like song", err);
      } finally {
        setIsBookmarking(null);
      }
    } else {
      // Guest Flow
      setGuestBookmarks(prev => {
        if (prev.includes(song.id)) return prev.filter(id => id !== song.id);
        return [...prev, song.id];
      });
    }
  };

  const incrementPlay = async (songId: string) => {
    try {
      fetch(`http://localhost:3000/api/songs/${songId}/play`, { method: 'POST' });
    } catch (err) { /* ignore */ }
  };

  const handleRate = async (songId: string, score: number) => {
    if (!isAuthenticated) {
      openAuth();
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/api/songs/${songId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score }),
        credentials: "include",
      });
      const json = await res.json();
      if (json.success) {
        setCommunitySongs(prev => prev.map(s =>
          s.id === songId ? { ...s, averageRating: json.averageRating, userRating: json.userRating } : s
        ));
      }
    } catch (err) {
      console.error("Failed to rate song", err);
    }
  };

  const handleTabChange = (newView: 'my-tabs' | 'all') => {
    updateSearch({ view: newView, bookmarks: undefined }); // Reset bookmarks when switching main view logic
    setSelectedSongId(null);
  };

  useEffect(() => {
    if (tab === 'community') {
      fetchCommunity();
    } else if (tab === 'my') {
      fetchUserSongs();
    }
  }, [filter, page, showFavorites, tab, sort, searchQuery, activeCategory, activeTuning, activeTines, isAuthenticated, guestBookmarks, user?.id]);

  const activeSongs = useMemo(() => {
    if (tab === 'my') {
      // Filter out local songs that are marked as cloud (to support migration)
      // and merge with fetched user songs from cloud.
      const localOnly = songs.filter(s => !s.isCloud);

      // Merge: avoid duplicates just in case (by title/artist if ids differ for some reason)
      // But usually id will be the same if we handle sync correctly.
      return [...localOnly, ...userSongs];
    }
    return communitySongs;
  }, [tab, songs, userSongs, communitySongs]);

  const filteredSongs = useMemo(() => {
    let result = activeSongs;

    if (tab === 'my') {
      // My Local Songs - Ignore 'showFavorites' here as bookmarks are managed via Community/Cloud
      // result = result.filter((s: Song) => s.isFavorited || s.isLiked);
    } else {
      // Community Songs
      if (showFavorites && !isAuthenticated) {
        // Guest Bookmarks Client Side Filter
        result = result.filter(s => guestBookmarks.includes(s.id));
      }
    }

    // Difficulty Filter (Client Side for 'My', Server Side already done for 'Community' usually, but good to be safe/consistent)
    if (filter !== 'all') {
      result = result.filter((s: Song) => s.difficulty === filter);
    }

    // Search Query (Client Side for 'My')
    if (tab === 'my' && searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s: Song) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q)
      );
    }

    // Category Filter (Client Side fallback)
    if (activeCategory !== 'all') {
      result = result.filter(s => s.category === activeCategory);
    }

    // Tuning/Tines Client Side Filter for 'My'
    if (tab === 'my') {
      if (activeTuning !== 'all') result = result.filter(s => s.authorTuning === activeTuning);
      if (activeTines !== 'all') result = result.filter(s => s.authorTineCount === Number(activeTines));
    }

    return result;
  }, [filter, activeSongs, searchQuery, showFavorites, tab, guestBookmarks, isAuthenticated, activeCategory]);

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
                onClick={() => handleTabChange('my-tabs')}
                className={cn(
                  "px-10 py-3 rounded-none text-xs font-black italic uppercase tracking-widest transition-all cursor-pointer",
                  tab === 'my' ? "bg-white/10 text-white shadow" : "text-white/30 hover:text-white"
                )}
              >
                <span className="skew-x-[12deg] block">My Tabs</span>
              </button>
              <button
                onClick={() => handleTabChange('all')}
                className={cn(
                  "px-10 py-3 rounded-none text-xs font-black italic uppercase tracking-widest transition-all cursor-pointer",
                  tab === 'community' ? "bg-white/10 text-white shadow" : "text-white/30 hover:text-white"
                )}
              >
                <span className="skew-x-[12deg] block">Global</span>
              </button>
            </div>

            {/* Bookmarks Toggle Hooked to URL */}
            <div className="ml-6 flex items-center">
              <button
                onClick={() => updateSearch({
                  bookmarks: !showFavorites,
                  view: !showFavorites ? 'all' : undefined
                })}
                className={cn(
                  "group flex items-center gap-2 px-4 py-2 border rounded-none skew-x-[-12deg] transition-all cursor-pointer",
                  showFavorites ? "bg-yellow-500/20 border-yellow-500 text-yellow-500" : "bg-transparent border-white/10 text-white/40 hover:text-white"
                )}
              >
                <Star className={cn("w-4 h-4 skew-x-[12deg]", showFavorites && "fill-yellow-500")} />
                <span className="skew-x-[12deg] text-[10px] font-black italic uppercase tracking-widest">
                  {showFavorites ? "Bookmarks" : "Bookmarks"}
                </span>
              </button>
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="SEARCH FOR A TRACK..."
                className="w-full bg-black/40 border border-white/10 py-2.5 pl-12 pr-4 text-xs font-black italic tracking-widest text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/50 transition-colors uppercase"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-[10px] font-black italic uppercase tracking-[0.2em] text-white/30 mr-4">
              <span>Category:</span>
            </div>
            <Select value={activeCategory} onValueChange={(val) => updateSearch({ category: val === 'all' ? undefined : val })}>
              <SelectTrigger className="w-[180px] bg-black/40 border-white/10 text-white text-xs font-bold uppercase tracking-wider rounded-none skew-x-[-12deg] focus:ring-cyan-500/50">
                <SelectValue placeholder="CATEGORY" />
              </SelectTrigger>
              <SelectContent className="bg-[#111] border-white/10 text-white ">
                <SelectItem value="all">ALL CATEGORIES</SelectItem>
                <SelectItem value="pop">POP</SelectItem>
                <SelectItem value="anime">ANIME</SelectItem>
                <SelectItem value="rock">ROCK</SelectItem>
                <SelectItem value="soundtrack">OST</SelectItem>
                <SelectItem value="classical">CLASSICAL</SelectItem>
                <SelectItem value="game">GAME</SelectItem>
                {SONG_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat.toLowerCase().replace(/\s/g, '-')}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-[10px] font-black italic uppercase tracking-[0.2em] text-white/30 mr-2">
              <span>Tuning:</span>
            </div>
            <Select value={activeTuning} onValueChange={(val) => updateSearch({ tuning: val === 'all' ? undefined : val })}>
              <SelectTrigger className="w-[100px] bg-black/40 border-white/10 text-white text-xs font-bold uppercase tracking-wider rounded-none skew-x-[-12deg] focus:ring-cyan-500/50">
                <SelectValue placeholder="TUNING" />
              </SelectTrigger>
              <SelectContent className="bg-[#111] border-white/10 text-white ">
                <SelectItem value="all">ALL</SelectItem>
                {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(n => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-[10px] font-black italic uppercase tracking-[0.2em] text-white/30 mr-2">
              <span>Tines:</span>
            </div>
            <Select value={activeTines.toString()} onValueChange={(val) => updateSearch({ tines: val === 'all' ? undefined : parseInt(val) })}>
              <SelectTrigger className="w-[120px] bg-black/40 border-white/10 text-white text-xs font-bold uppercase tracking-wider rounded-none skew-x-[-12deg] focus:ring-cyan-500/50">
                <SelectValue placeholder="TINES" />
              </SelectTrigger>
              <SelectContent className="bg-[#111] border-white/10 text-white ">
                <SelectItem value="all">ALL</SelectItem>
                {[8, 9, 10, 13, 17, 21, 34].map(t => (
                  <SelectItem key={t} value={t.toString()}>{t} TINES</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 ml-8">
            <div className="flex items-center gap-2 text-[10px] font-black italic uppercase tracking-[0.2em] text-white/30 mr-4">
              <span>Filter:</span>
            </div>
            {['all', 'easy', 'medium', 'hard', 'expert'].map(diff => (
              <button
                key={diff}
                onClick={() => updateSearch({ difficulty: diff === 'all' ? undefined : diff as any })}
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
              {isLoading ? (
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
                        : "hover:bg-white/5 text-white/60 hover:text-white",
                      // Highlight if bookmarked and not selected?
                      !isSelected && isSongBookmarked(song) && "bg-cyan-500/5 text-cyan-200"
                    )}
                  >
                    {/* Artist */}
                    <div className="flex-[2] text-xs font-bold uppercase tracking-wide truncate pr-4 opacity-80 flex items-center gap-2">
                      {tab === 'community' && isSongBookmarked(song) && <Heart className="w-3 h-3 fill-cyan-400 text-cyan-400" />}
                      {tab === 'my' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="relative group/storage">
                              {song.isCloud ? (
                                <>
                                  <div className="absolute -inset-1 bg-cyan-500/20 blur-[2px] rounded-full opacity-0 group-hover/storage:opacity-100 transition-opacity" />
                                  <Cloud className="relative w-3 h-3 text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]" />
                                </>
                              ) : (
                                <HardDrive className="relative w-3 h-3 text-white/30" />
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-black/90 border-white/10 text-white font-bold uppercase tracking-widest text-[8px] py-1 px-2">
                            {song.isCloud ? 'Cloud Synced' : 'Local Only'}
                          </TooltipContent>
                        </Tooltip>
                      )}
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
                        style={{ backgroundColor: difficultyColors[String(song.difficulty).toLowerCase()] || '#666' }}
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
                  {/* Album Art / YouTube Preview */}
                  <div className="relative w-48 h-28 rounded-none skew-x-[-12deg] bg-black box-border border border-white/10 shadow-lg overflow-hidden flex-none group">
                    {selectedSong.coverUrl ? (
                      <img src={selectedSong.coverUrl} className="w-full h-full object-cover skew-x-[12deg] scale-125" alt="" />
                    ) : getYoutubeId(selectedSong.youtubeUrl || '') ? (
                      <iframe
                        className="w-full h-full skew-x-[12deg] scale-[1.4] pointer-events-none grayscale-[0.2] opacity-80"
                        src={`https://www.youtube.com/embed/${getYoutubeId(selectedSong.youtubeUrl!)}?autoplay=1&mute=1&controls=0&modestbranding=1&showinfo=0&rel=0&loop=1&playlist=${getYoutubeId(selectedSong.youtubeUrl!)}`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-white/10 skew-x-[12deg]">
                        {iconMap[selectedSong.icon || 'music']}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer skew-x-[12deg] z-10" onClick={handlePlaySelected}>
                      <Play className="w-12 h-12 text-white drop-shadow-lg" />
                    </div>
                  </div>

                  {/* Titles & Status Badges */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {/* Difficulty Badge */}
                      <Badge
                        variant="outline"
                        className="rounded-none border-white/20 text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 bg-white/5"
                        style={{ color: difficultyColors[String(selectedSong.difficulty).toLowerCase()], borderColor: `${difficultyColors[String(selectedSong.difficulty).toLowerCase()]}44` }}
                      >
                        {selectedSong.difficulty}
                      </Badge>

                      {/* Genre Badge */}
                      {selectedSong.category && (
                        <Badge
                          variant="secondary"
                          className="rounded-none bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5"
                        >
                          {selectedSong.category}
                        </Badge>
                      )}

                      {/* Storage Status Badge (Top) */}
                      {tab === 'my' && (
                        <Badge
                          className={cn(
                            "rounded-none text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 border transition-all",
                            selectedSong.isCloud
                              ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                              : "bg-white/5 border-white/10 text-white/40"
                          )}
                        >
                          {selectedSong.isCloud ? (
                            <span className="flex items-center gap-1"><Cloud className="w-2.5 h-2.5" /> Cloud</span>
                          ) : (
                            <span className="flex items-center gap-1"><HardDrive className="w-2.5 h-2.5" /> Local</span>
                          )}
                        </Badge>
                      )}
                    </div>

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

                  {/* Metadata Grid (Condensed) */}
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div className="space-y-0.5">
                      <span className="block text-[8px] font-black uppercase text-white/20 tracking-widest">Charter</span>
                      <span className="block text-base font-bold text-white uppercase truncate">{selectedSong.author?.name || 'Unknown'}</span>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <span className="block text-[8px] font-black uppercase text-white/20 tracking-widest">Length</span>
                      <span className="block text-base font-bold text-white uppercase font-mono">{Math.floor((selectedSong.duration || 0) / 60)}:{String(Math.floor((selectedSong.duration || 0) % 60)).padStart(2, '0')}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="block text-[8px] font-black uppercase text-white/20 tracking-widest">Added</span>
                      <span className="block text-base font-bold text-white uppercase truncate">
                        {selectedSong.createdAt ? new Date(selectedSong.createdAt).toLocaleDateString() : '—'}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="block text-[8px] font-black uppercase text-white/20 tracking-widest">Tuning</span>
                      <span className="block text-base font-bold text-cyan-400 uppercase truncate">
                        {selectedSong.authorTuning || 'C'} Major
                      </span>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <span className="block text-[8px] font-black uppercase text-white/20 tracking-widest">Hardware</span>
                      <span className="block text-base font-bold text-white uppercase truncate">
                        {selectedSong.authorTineCount || 17} Tines
                      </span>
                    </div>
                    <div className="space-y-0.5 text-right">
                      {selectedSong.youtubeUrl && (
                        <div className="flex flex-col items-end gap-1">
                          <span className="block text-[8px] font-black uppercase text-white/20 tracking-widest">Youtube Source</span>
                          <a
                            href={selectedSong.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[10px] font-black text-[#FF0000] hover:text-white transition-colors uppercase tracking-widest cursor-pointer group/yt"
                          >
                            <span>Watch Original</span>
                            <Youtube className="w-3.5 h-3.5 group-hover/yt:scale-110 transition-transform" />
                          </a>
                        </div>
                      )}
                      {tab === 'my' && !selectedSong.isCloud && isAuthenticated && (
                        <button
                          onClick={() => onEditSong?.(selectedSong)}
                          className="text-[9px] font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-widest border-b border-cyan-400/30 hover:border-cyan-400 transition-all cursor-pointer"
                        >
                          Sync Now
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="h-px bg-white/5 w-full my-2" />

                  {/* Social & Rating Actions */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-black italic uppercase text-white/30 tracking-widest">Community Rating</span>
                        {!isAuthenticated ? (
                          <button
                            onClick={() => openAuth()}
                            className="flex items-center gap-2 group cursor-pointer"
                          >
                            <div className="flex items-center gap-1 opacity-20 group-hover:opacity-40 transition-opacity">
                              {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 text-white" />)}
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-400/60 group-hover:text-cyan-400 italic">
                              Sign In to Rate
                            </span>
                          </button>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {selectedSong.author?.id === user?.id ? (
                              <div className="flex items-center gap-2 opacity-50 grayscale pointer-events-none">
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <Star
                                      key={s}
                                      className={cn(
                                        "w-4 h-4",
                                        s <= Math.round(selectedSong.averageRating || 0) ? "text-yellow-500 fill-yellow-500" : "text-white/10"
                                      )}
                                    />
                                  ))}
                                </div>
                                <span className="text-[8px] font-bold uppercase tracking-widest text-white/40 italic">
                                  You cannot rate your own track
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <button
                                      key={s}
                                      onClick={(e) => { e.stopPropagation(); handleRate(selectedSong.id, s); }}
                                      className="group cursor-pointer"
                                    >
                                      <Star className={cn(
                                        "w-4 h-4 transition-all",
                                        s <= (selectedSong.userRating || Math.round(selectedSong.averageRating || 0))
                                          ? "text-yellow-500 fill-yellow-500"
                                          : "text-white/10 group-hover:text-yellow-500/50"
                                      )} />
                                    </button>
                                  ))}
                                </div>
                                <span className="text-[10px] font-black italic text-white/40 ml-1">
                                  {selectedSong.averageRating ? Number(selectedSong.averageRating).toFixed(1) : "—"}
                                  <span className="text-[8px] opacity-50 ml-1">({selectedSong.voteCount || 0})</span>
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {tab === 'community' && (selectedSong.isCloud || selectedSong.isPublic) && (
                        <button
                          onClick={() => handleToggleBookmark(selectedSong)}
                          disabled={isBookmarking === selectedSong.id}
                          className={cn(
                            "group flex items-center gap-2 px-4 py-2 rounded-none skew-x-[-12deg] border transition-all h-fit",
                            isBookmarking === selectedSong.id ? "opacity-50 cursor-wait" : "cursor-pointer",
                            isSongBookmarked(selectedSong)
                              ? "bg-cyan-500/10 border-cyan-500 text-cyan-400"
                              : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/20"
                          )}
                          title={isAuthenticated ? "Bookmark Song" : "Guest Bookmark"}
                        >
                          {isBookmarking === selectedSong.id ? (
                            <Loader2 className="w-3 h-3 animate-spin skew-x-[12deg] text-cyan-400" />
                          ) : (
                            <Heart className={cn("w-3 h-3 skew-x-[12deg]", isSongBookmarked(selectedSong) && "fill-cyan-500")} />
                          )}
                          <span className="skew-x-[12deg] text-[10px] font-black italic uppercase tracking-wider">
                            {isBookmarking === selectedSong.id ? "SAVING..." : (isSongBookmarked(selectedSong) ? "BOOKMARKED" : "BOOKMARK")}
                          </span>
                        </button>
                      )}
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-[#0a0a0f] border border-red-500/20 p-10 max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.15)] overflow-hidden"
            >
              {/* Background Accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-[60px] rounded-full -mr-16 -mt-16" />

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-red-500/10 flex items-center justify-center border border-red-500/20 skew-x-[-12deg]">
                    <AlertTriangle className="w-6 h-6 text-red-500 skew-x-[12deg]" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black italic text-white uppercase tracking-tighter leading-none">Delete Track</h3>
                    <p className="text-[10px] font-bold text-red-500/60 uppercase tracking-[0.2em] mt-1">Permanent Action</p>
                  </div>
                </div>

                <p className="text-sm text-white/60 mb-10 leading-relaxed font-medium">
                  You're about to remove <span className="text-white font-black italic">"{activeSongs.find(s => s.id === showDeleteConfirm)?.title}"</span>. This will erase the data from all storage locations.
                </p>

                <div className="flex gap-4">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-[10px] tracking-[0.2em] skew-x-[-12deg] transition-all border border-white/10 cursor-pointer"
                  >
                    <span className="skew-x-[12deg] block">Cancel</span>
                  </button>
                  <button
                    disabled={isDeleting}
                    onClick={async () => {
                      const song = activeSongs.find(s => s.id === showDeleteConfirm);
                      if (onDeleteSong && song) {
                        setIsDeleting(true);
                        try {
                          await onDeleteSong(song);
                          if (song.isCloud) {
                            await fetchUserSongs();
                          }
                        } finally {
                          setIsDeleting(false);
                        }
                      }
                      setShowDeleteConfirm(null);
                      setSelectedSongId(null);
                    }}
                    className={cn(
                      "flex-1 py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase text-[10px] tracking-[0.2em] skew-x-[-12deg] transition-all shadow-[0_4px_20px_rgba(220,38,38,0.3)] cursor-pointer flex items-center justify-center gap-2",
                      isDeleting && "opacity-70 cursor-wait"
                    )}
                  >
                    <div className="skew-x-[12deg] flex items-center gap-2">
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>DELETING...</span>
                        </>
                      ) : (
                        <span>Delete Now</span>
                      )}
                    </div>
                  </button>
                </div>
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
