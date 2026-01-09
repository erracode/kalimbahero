import { useNavigate } from '@tanstack/react-router'
import { signOut } from '@/lib/auth-client'
import { useQueryClient } from '@tanstack/react-query'
import { AUTH_QUERY_KEY } from '@/hooks/useAuth'
import { NeonButton } from '@/components/ui/NeonButton'
import { User, LogOut, Music, Star } from 'lucide-react'
import { useSongStore } from '@/stores/songStore'

interface ProfilePanelProps {
    session: any;
    onClose: () => void;
}

export function ProfilePanel({ session, onClose }: ProfilePanelProps) {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { songs } = useSongStore()

    const mySongsCount = songs.filter(s => !s.cloudId).length
    const bookmarksCount = songs.filter(s => s.isFavorited || s.isLiked).length

    const handleSignOut = async () => {
        await signOut({
            fetchOptions: {
                onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY })
                    onClose()
                }
            }
        })
    }

    if (!session) return null;

    return (
        <div className="w-full text-white space-y-6">

            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-4xl font-black italic text-white tracking-tighter uppercase drop-shadow-xl">
                    BACKSTAGE <span className="text-cyan-400">PASS</span>
                </h1>
                <p className="text-white/40 text-xs font-bold tracking-[0.3em] uppercase mt-2">
                    Player Profile
                </p>
            </div>

            {/* Profile Info */}
            <div className="flex flex-col items-center gap-6">
                {/* Avatar (Skewed) */}
                <div className="relative group shrink-0">
                    <div className="w-32 h-32 bg-black/50 border border-cyan-500/50 flex items-center justify-center overflow-hidden skew-x-[-12deg] shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                        <div className="skew-x-[12deg] w-full h-full flex items-center justify-center">
                            {session.user.image ? (
                                <img src={session.user.image} alt={session.user.name} className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-16 h-16 text-cyan-400 opacity-50" />
                            )}
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <h2 className="text-4xl font-black italic text-white tracking-tighter uppercase">
                        {session.user.name}
                    </h2>
                    <p className="text-cyan-400 font-bold tracking-[0.2em] text-xs uppercase mt-1">
                        {session.user.email}
                    </p>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4">
                <div className="px-6 py-4 bg-white/5 border border-white/10 rounded-none skew-x-[-12deg] flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors">
                    <div className="skew-x-[12deg] flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-white font-black italic text-xl">{bookmarksCount}</span>
                    </div>
                    <span className="skew-x-[12deg] text-white/40 text-[10px] font-black italic uppercase tracking-widest">Stars</span>
                </div>
                <div className="px-6 py-4 bg-white/5 border border-white/10 rounded-none skew-x-[-12deg] flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors">
                    <div className="skew-x-[12deg] flex items-center gap-2">
                        <Music className="w-4 h-4 text-purple-500 fill-purple-500" />
                        <span className="text-white font-black italic text-xl">{mySongsCount}</span>
                    </div>
                    <span className="skew-x-[12deg] text-white/40 text-[10px] font-black italic uppercase tracking-widest">Songs</span>
                </div>
            </div>

            {/* Actions */}
            <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="bg-black/40 border border-white/10 p-6 rounded-none skew-x-[-12deg] flex items-center justify-between group cursor-pointer hover:bg-white/5 transition-all" onClick={() => { onClose(); navigate({ to: '/library', search: { view: 'my-tabs' } }) }}>
                    <div className="skew-x-[12deg] flex items-center gap-4">
                        <div className="p-2 bg-cyan-500/20 rounded-none">
                            <Music className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black italic text-white uppercase tracking-tight">My Setlist</h3>
                            <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Manage your tracks</p>
                        </div>
                    </div>
                </div>

                <div className="bg-black/40 border border-white/10 p-6 rounded-none skew-x-[-12deg] flex items-center justify-between group cursor-pointer hover:bg-white/5 transition-all" onClick={() => { onClose(); navigate({ to: '/library', search: { view: 'bookmarks' } }) }}>
                    <div className="skew-x-[12deg] flex items-center gap-4">
                        <div className="p-2 bg-yellow-500/20 rounded-none">
                            <Star className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black italic text-white uppercase tracking-tight">Bookmarks</h3>
                            <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Saved songs</p>
                        </div>
                    </div>
                </div>

                <NeonButton
                    variant="orange"
                    icon={<LogOut className="w-4 h-4" />}
                    onClick={handleSignOut}
                    className="h-12 text-sm font-black italic tracking-widest uppercase cursor-pointer w-full mt-8"
                    fullWidth
                >
                    SIGN OUT
                </NeonButton>
            </div>
        </div>
    )
}
