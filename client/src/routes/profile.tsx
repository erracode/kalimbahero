
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth, AUTH_QUERY_KEY } from '../hooks/useAuth'
import { signOut } from '../lib/auth-client'
import { useQueryClient } from '@tanstack/react-query'
import { AuroraBackground } from '../components/ui/AuroraBackground'
import { NeonButton } from '../components/ui/NeonButton'
import { User, LogOut, Music, Star, ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/profile')({
    component: ProfilePage,
})

function ProfilePage() {
    const { session, isPending } = useAuth()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    if (isPending) {
        return (
            <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-black text-white">
                <AuroraBackground className="absolute inset-0 z-0" />
                <div className="relative z-10 flex flex-col items-center gap-4">
                    <div className="w-20 h-20 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                    <div className="text-3xl font-black italic tracking-tighter uppercase drop-shadow-lg">
                        LOADING <span className="text-cyan-400">BACKSTAGE...</span>
                    </div>
                </div>
            </div>
        )
    }

    if (!session) {
        // If not logged in, should ideally redirect to auth, but for now show a message or redirect
        setTimeout(() => navigate({ to: '/auth' }), 100)
        return null
    }

    const handleSignOut = async () => {
        await signOut({
            fetchOptions: {
                onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY })
                    navigate({ to: '/' })
                }
            }
        })
    }

    return (
        <div className="relative min-h-screen w-full overflow-hidden p-4 md:p-8">
            <AuroraBackground className="absolute inset-0 z-0" />

            <div className="relative z-10 max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <NeonButton
                        variant="cyan"
                        size="sm"
                        icon={<ArrowLeft className="w-4 h-4" />}
                        onClick={() => navigate({ to: '/' })}
                        className="cursor-pointer"
                    >
                        BACK TO STAGE
                    </NeonButton>
                    <h1 className="text-4xl font-black italic text-white tracking-tighter uppercase drop-shadow-xl">
                        BACKSTAGE <span className="text-cyan-400">PASS</span>
                    </h1>
                    <div className="w-24"></div> {/* Spacer for centering */}
                </div>

                {/* Profile Card */}
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-none p-10 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                    <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                        {/* Avatar (Skewed) */}
                        <div className="relative group shrink-0">
                            <div className="w-40 h-40 bg-black/50 border border-cyan-500/50 flex items-center justify-center overflow-hidden skew-x-[-12deg] shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                                <div className="skew-x-[12deg] w-full h-full flex items-center justify-center">
                                    {session.user.image ? (
                                        <img src={session.user.image} alt={session.user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-20 h-20 text-cyan-400 opacity-50" />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center md:text-left space-y-4">
                            <div>
                                <h2 className="text-5xl font-black italic text-white tracking-tighter uppercase">
                                    {session.user.name}
                                </h2>
                                <p className="text-cyan-400 font-bold tracking-[0.2em] text-xs uppercase mt-1">
                                    {session.user.email}
                                </p>
                            </div>

                            <div className="flex gap-4 justify-center md:justify-start">
                                <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-none skew-x-[-12deg] flex items-center gap-3">
                                    <Star className="w-4 h-4 text-yellow-500 skew-x-[12deg] fill-yellow-500" />
                                    <div className="skew-x-[12deg] flex items-baseline gap-1">
                                        <span className="text-white font-black italic text-xl">0</span>
                                        <span className="text-white/40 text-[10px] font-black italic uppercase tracking-widest">Stars</span>
                                    </div>
                                </div>
                                <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-none skew-x-[-12deg] flex items-center gap-3">
                                    <Music className="w-4 h-4 text-purple-500 skew-x-[12deg] fill-purple-500" />
                                    <div className="skew-x-[12deg] flex items-baseline gap-1">
                                        <span className="text-white font-black italic text-xl">0</span>
                                        <span className="text-white/40 text-[10px] font-black italic uppercase tracking-widest">Songs</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-4 min-w-[220px]">
                            <NeonButton
                                variant="orange"
                                icon={<LogOut className="w-4 h-4" />}
                                onClick={handleSignOut}
                                className="h-14 text-sm font-black italic tracking-widest uppercase cursor-pointer"
                                fullWidth
                            >
                                SIGN OUT
                            </NeonButton>
                        </div>
                    </div>
                </div>

                {/* Grid Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* My Setlist */}
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-none skew-x-[-12deg] h-72 flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-black/60 transition-all">
                        <div className="skew-x-[12deg] flex flex-col items-center">
                            <div className="p-4 bg-white/5 border border-white/10 mb-6 rotate-3 group-hover:rotate-0 transition-transform">
                                <Music className="w-12 h-12 text-cyan-400 opacity-20 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <h3 className="text-2xl font-black italic text-white uppercase tracking-tighter mb-2">My Setlist</h3>
                            <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-6">Unleash your creations</p>
                            <NeonButton
                                variant="cyan"
                                size="sm"
                                className="cursor-pointer font-black italic tracking-widest uppercase"
                                onClick={() => navigate({ to: '/song-builder' })}
                            >
                                CREATE TRACK
                            </NeonButton>
                        </div>
                    </div>

                    {/* Favorites */}
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-none skew-x-[-12deg] h-72 flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-black/60 transition-all">
                        <div className="skew-x-[12deg] flex flex-col items-center">
                            <div className="p-4 bg-white/5 border border-white/10 mb-6 -rotate-3 group-hover:rotate-0 transition-transform">
                                <Star className="w-12 h-12 text-yellow-400 opacity-20 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <h3 className="text-2xl font-black italic text-white uppercase tracking-tighter mb-2">Bookmarks</h3>
                            <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-6">Saved for later</p>
                            <NeonButton
                                variant="purple"
                                size="sm"
                                className="cursor-pointer font-black italic tracking-widest uppercase"
                                onClick={() => navigate({ to: '/' })}
                            >
                                EXPLORE
                            </NeonButton>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
