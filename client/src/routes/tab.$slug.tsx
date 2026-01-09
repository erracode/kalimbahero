// ============================================
// Kalimba Hero - Tab Profile Route
// ============================================

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Star,
  Play,
  Heart,
  Music,
  Clock,
  User,
  FileText,
  Zap,
  Share2,
} from "lucide-react";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { NeonButton } from "@/components/ui/NeonButton";
import { TabNotation } from "@/components/game/TabNotation";
import { cn } from "@/lib/utils";
import type { Song } from "@/types/game";
import { useAuthSync } from "@/hooks/useAuthSync";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useUIStore } from "@/stores/uiStore";

export const Route = createFileRoute("/tab/$slug")({
  component: TabProfileRoute,
  head: ({ params }) => ({
    title: `Tab - ${params.slug} | Kalimba Hero`,
    meta: [{ name: "description", content: "View and play this Kalimba tab on Kalimba Hero." }],
  }),
});

const difficultyColors: Record<string, string> = {
  easy: "#6BCB77",
  medium: "#FFD93D",
  hard: "#FF8E53",
  expert: "#FF6B6B",
};

function TabProfileRoute() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthSync();
  const { openAuth } = useUIStore();
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);

  // Guest Bookmarks
  const [guestBookmarks, setGuestBookmarks] = useLocalStorage<string[]>('kalimba_guest_bookmarks', []);
  const [isGuestFavorite, setIsGuestFavorite] = useState(false);

  useEffect(() => {
    if (song && !isAuthenticated) {
      setIsGuestFavorite(guestBookmarks.includes(song.id));
    }
  }, [song, guestBookmarks, isAuthenticated]);

  useEffect(() => {
    const fetchSong = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/songs/${slug}`, { credentials: "include" });
        const json = await res.json();
        if (json.success && json.data) {
          const s = json.data;
          setSong({
            ...s.songData,
            id: s.id,
            artist: s.artist || s.songData.artist,
            author: s.author,
            likes: s.likes,
            plays: s.plays,
            isLiked: s.isLiked,
            isFavorited: s.isFavorited,
            averageRating: s.averageRating,
            userRating: s.userRating,
            voteCount: s.voteCount,
          });
        }
      } catch (err) {
        console.error("Failed to fetch song:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSong();
  }, [slug]);

  const handlePlay = () => {
    if (song) navigate({ to: "/game/$songId", params: { songId: song.id } });
  };

  const handleFavorite = async () => {
    if (!song) return;

    if (isAuthenticated) {
      try {
        const res = await fetch(`http://localhost:3000/api/songs/${song.id}/favorite`, { method: "POST", credentials: "include" });
        const json = await res.json();
        if (json.success) setSong(prev => prev ? { ...prev, isFavorited: json.isFavorited } : prev);
      } catch (err) {
        console.error("Failed to favorite song", err);
      }
    } else {
      // Guest Toggle
      setGuestBookmarks(prev => {
        const isBookmarked = prev.includes(song.id);
        if (isBookmarked) {
          return prev.filter(id => id !== song.id);
        } else {
          return [...prev, song.id];
        }
      });
    }
  };

  const handleRate = async (score: number) => {
    if (!isAuthenticated) {
      openAuth();
      return;
    }

    if (!song) return;
    try {
      const res = await fetch(`http://localhost:3000/api/songs/${song.id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score }),
        credentials: "include",
      });
      const json = await res.json();
      if (json.success) setSong(prev => prev ? { ...prev, averageRating: json.averageRating, userRating: json.userRating } : prev);
    } catch (err) {
      console.error("Failed to rate song", err);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-white/40 text-xl font-bold uppercase tracking-widest animate-pulse">Loading Tab...</div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center gap-6">
        <Music className="w-24 h-24 text-white/10" />
        <h1 className="text-3xl font-black text-white/40 uppercase">Tab Not Found</h1>
        <button onClick={() => navigate({ to: "/library" })} className="px-8 py-3 bg-white/10 text-white rounded-none skew-x-[-12deg] cursor-pointer">
          <span className="skew-x-[12deg] block">← Back to Library</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen relative overflow-hidden bg-black">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 opacity-30"><AuroraBackground /></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
      </div>

      {/* Two Column Layout */}
      <div className="relative z-10 flex h-screen">

        {/* LEFT COLUMN - Song Info */}
        <div className="w-[480px] flex-none h-full border-r border-white/10 bg-black/60 backdrop-blur-2xl flex flex-col">
          <div className="p-10 space-y-10 overflow-y-auto custom-scrollbar flex-1">
            {/* Back Button */}
            <button
              onClick={() => navigate({ to: "/library" })}
              className="group flex items-center gap-3 text-white/30 hover:text-white transition-all cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-white/30 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Exit to Library</span>
            </button>

            {/* Title & Artist & Cover */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="relative group self-start">
                <div className="w-48 h-48 bg-black/40 border border-white/10 rounded-none skew-x-[-12deg] flex items-center justify-center relative overflow-hidden group-hover:border-cyan-500/50 transition-colors duration-500">
                  <Music className="w-20 h-20 text-white/5 skew-x-[12deg] group-hover:text-cyan-500/10 transition-colors duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              <div>
                <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-[0.9] mb-4 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                  {song.title}
                </h1>
                <div className="flex flex-col gap-1">
                  <p className="text-2xl text-cyan-400 font-bold uppercase tracking-[0.2em]">{song.artist}</p>
                  <div className="flex items-center gap-2 text-white/20">
                    <User className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest italic">{song.author?.name || "Unknown Charter"}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Meta Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="bg-white/5 border border-white/10 p-4 rounded-none skew-x-[-12deg]">
                <div className="skew-x-[12deg] flex items-center gap-3">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Duration</p>
                    <p className="text-sm font-black text-white italic">{Math.floor((song.duration || 0) / 60)}:{String(Math.floor((song.duration || 0) % 60)).padStart(2, "0")}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-none skew-x-[-12deg]">
                <div className="skew-x-[12deg] flex items-center gap-3">
                  <Zap className="w-5 h-5 text-orange-400" />
                  <div>
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Tempo</p>
                    <p className="text-sm font-black text-white italic">{song.bpm} BPM</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-none skew-x-[-12deg]">
                <div className="skew-x-[12deg] flex items-center gap-3">
                  <Music className="w-5 h-5 text-pink-400" />
                  <div>
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Genre</p>
                    <p className="text-sm font-black text-white italic truncate max-w-[100px]">{song.category || "Unknown"}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-none skew-x-[-12deg]">
                <div className="skew-x-[12deg] flex items-center gap-3">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  <div>
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Year</p>
                    <p className="text-sm font-black text-white italic">{song.createdAt ? new Date(song.createdAt).getFullYear() : '—'}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Difficulty Badge & Social Stats */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2 flex-1">
                  <span className="text-[10px] font-black italic uppercase text-white/30 tracking-widest">Difficulty</span>
                  <div className="flex items-center gap-4">
                    <div
                      className="h-10 px-4 rounded-none skew-x-[-12deg] flex items-center justify-center font-black italic uppercase text-black shadow-[0_0_15px_rgba(0,0,0,0.3)]"
                      style={{ backgroundColor: difficultyColors[song.difficulty] }}
                    >
                      <span className="skew-x-[12deg]">
                        {song.difficulty}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleFavorite}
                    className={cn(
                      "group flex items-center gap-2 px-6 py-3 rounded-none skew-x-[-12deg] border transition-all cursor-pointer",
                      (isAuthenticated ? song.isFavorited : isGuestFavorite)
                        ? "bg-cyan-500/10 border-cyan-500 text-cyan-400"
                        : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/20"
                    )}
                    title={isAuthenticated ? "Bookmark Song" : "Guest Bookmark (Saved to this device)"}
                  >
                    <Heart className={cn("w-4 h-4 skew-x-[12deg]", (isAuthenticated ? song.isFavorited : isGuestFavorite) && "fill-cyan-500")} />
                    <span className="skew-x-[12deg] text-xs font-black italic uppercase tracking-wider uppercase">
                      {(isAuthenticated ? song.isFavorited : isGuestFavorite) ? "SAVED" : "BOOKMARK"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex-1 h-1.5 bg-white/10 rounded-none overflow-hidden skew-x-[-12deg]">
                <div
                  className="h-full transition-all duration-1000"
                  style={{
                    width: song.difficulty === 'easy' ? '25%' : song.difficulty === 'medium' ? '50%' : song.difficulty === 'hard' ? '75%' : '100%',
                    backgroundColor: difficultyColors[song.difficulty]
                  }}
                />
              </div>
            </div>

            {/* Rating System */}
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-black italic uppercase text-white/30 tracking-widest">Community Rating</span>

              {!isAuthenticated ? (
                <button
                  onClick={() => openAuth()}
                  className="flex items-center gap-3 w-full p-3 bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all rounded-none skew-x-[-12deg] group cursor-pointer"
                >
                  <div className="flex items-center gap-1 opacity-40 group-hover:opacity-60 transition-opacity skew-x-[12deg]">
                    {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-5 h-5 text-white" />)}
                  </div>
                  <span className="skew-x-[12deg] text-xs font-bold uppercase tracking-widest text-cyan-400 group-hover:text-cyan-300">
                    Sign In to Rate
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => handleRate(s)} className="group cursor-pointer">
                      <Star className={cn("w-6 h-6 transition-all", s <= (song.userRating || Math.round(song.averageRating || 0)) ? "text-yellow-500 fill-yellow-500" : "text-white/10 group-hover:text-yellow-500/50")} />
                    </button>
                  ))}
                  <span className="ml-3 text-sm font-bold text-white/60">
                    {song.averageRating ? Number(song.averageRating).toFixed(1) : "NR"} <span className="text-white/30 text-xs">({song.voteCount || 0} votes)</span>
                  </span>
                </div>
              )}
            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-8 bg-black border-t border-white/10">
            <NeonButton variant="cyan" fullWidth onClick={handlePlay} className="h-20 text-2xl font-black italic tracking-[0.2em] uppercase rounded-none skew-x-[-12deg] group">
              <div className=" flex items-center gap-4">
                <Play className="w-8 h-8 group-hover:scale-110 transition-transform" /> START PERFORMANCE
              </div>
            </NeonButton>
          </div>
        </div>

        {/* RIGHT COLUMN - Tab Notation */}
        <div className="flex-1 h-full bg-black/20 overflow-hidden flex flex-col">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="flex-1 p-10 overflow-hidden">
            <TabNotation song={song} className="h-full" />
          </motion.div>
        </div>

      </div>
    </div>
  );
}
