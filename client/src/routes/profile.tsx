
import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { useAuth, AUTH_QUERY_KEY } from '../hooks/useAuth'
import { signOut } from '../lib/auth-client'
import { useQueryClient } from '@tanstack/react-query'
import { AuroraBackground } from '../components/ui/AuroraBackground'
import { GlassPanel } from '../components/ui/GlassPanel'
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
            <div className="relative min-h-screen w-full flex items-center justify-center bg-black text-white">
                <AuroraBackground className="absolute inset-0 z-0" />
                <div className="relative z-10 text-2xl font-black tracking-widest animate-pulse">
                    LOADING BACKSTAGE...
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
                        variant="ghost"
                        size="sm"
                        icon={<ArrowLeft className="w-4 h-4" />}
                        onClick={() => navigate({ to: '/' })}
                    >
                        Back to Stage
                    </NeonButton>
                    <h1 className="text-3xl font-black text-white tracking-widest uppercase drop-shadow-lg">
                        Backstage Pass
                    </h1>
                    <div className="w-24"></div> {/* Spacer for centering */}
                </div>

                {/* Profile Card */}
                <GlassPanel className="p-8 border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.1)]">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        {/* Avatar */}
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full bg-black/50 border-2 border-cyan-500 flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                                {session.user.image ? (
                                    <img src={session.user.image} alt={session.user.name} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-16 h-16 text-cyan-500" />
                                )}
                            </div>
                            {/* Ring animation */}
                            <div className="absolute inset-0 border-2 border-cyan-400/50 rounded-full animate-ping opacity-20"></div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center md:text-left space-y-2">
                            <h2 className="text-4xl font-black text-white tracking-tighter">
                                {session.user.name}
                            </h2>
                            <p className="text-cyan-200/60 font-medium tracking-wide">
                                {session.user.email}
                            </p>
                            <div className="flex gap-4 justify-center md:justify-start mt-4">
                                <div className="px-4 py-2 bg-black/40 rounded border border-white/10 flex items-center gap-2">
                                    <Star className="w-4 h-4 text-yellow-400" />
                                    <span className="text-white font-bold">0</span>
                                    <span className="text-white/40 text-xs uppercase">Stars</span>
                                </div>
                                <div className="px-4 py-2 bg-black/40 rounded border border-white/10 flex items-center gap-2">
                                    <Music className="w-4 h-4 text-purple-400" />
                                    <span className="text-white font-bold">0</span>
                                    <span className="text-white/40 text-xs uppercase">Songs</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3 min-w-[200px]">
                            <NeonButton
                                variant="orange"
                                icon={<LogOut className="w-4 h-4" />}
                                onClick={handleSignOut}
                            >
                                SIGN OUT
                            </NeonButton>
                        </div>
                    </div>
                </GlassPanel>

                {/* Mock "My Songs" Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassPanel className="p-6 h-64 flex flex-col items-center justify-center text-center opacity-70 hover:opacity-100 transition-opacity">
                        <Music className="w-12 h-12 text-white/20 mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">My Setlist</h3>
                        <p className="text-white/40 text-sm">You haven't published any songs yet.</p>
                        <NeonButton variant="cyan" size="sm" className="mt-4" onClick={() => navigate({ to: '/song-builder' })}>
                            Create New Song
                        </NeonButton>
                    </GlassPanel>

                    <GlassPanel className="p-6 h-64 flex flex-col items-center justify-center text-center opacity-70 hover:opacity-100 transition-opacity">
                        <Star className="w-12 h-12 text-white/20 mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Favorites</h3>
                        <p className="text-white/40 text-sm">Your favorite tracks will appear here.</p>
                        <NeonButton variant="purple" size="sm" className="mt-4" onClick={() => navigate({ to: '/' })}>
                            Explore Library
                        </NeonButton>
                    </GlassPanel>
                </div>

            </div>
        </div>
    )
}
