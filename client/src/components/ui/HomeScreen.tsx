
import React, { useState } from 'react';
import { Library, Wrench, Mic2, User, LogIn, Sparkles, Music2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { SkewedSheet } from './SkewedSheet';
import { AuthPanel } from '../auth/AuthPanel';
import { ProfilePanel } from '../profile/ProfilePanel';

interface HomeScreenProps {
  onStartGame: () => void;
  onSongBuilder: () => void;
  onLibrary: () => void;
  onTuner: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartGame,
  onSongBuilder,
  onLibrary,
  onTuner,
}) => {
  const { session } = useAuth();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);

  const isLoggedIn = !!session;
  const userName = session?.user?.name;

  const menuItems = [
    { label: 'LIBRARY', icon: <Library className="w-6 h-6" />, action: onLibrary, variant: 'purple' as const, desc: 'Browse your song collection' },
    { label: 'HERO PLAY', icon: <Sparkles className="w-6 h-6" />, action: onStartGame, variant: 'cyan' as const, desc: 'Play in Rhythm Mode' },
    { label: 'SONG BUILDER', icon: <Wrench className="w-6 h-6" />, action: onSongBuilder, variant: 'orange' as const, desc: 'Create and edit your own tracks' },
    { label: 'TUNER', icon: <Mic2 className="w-6 h-6" />, action: onTuner, variant: 'green' as const, desc: 'Tune your real Kalimba' },
    {
      label: isLoggedIn ? (userName || 'PROFILE') : 'LOGIN',
      icon: isLoggedIn ? <User className="w-6 h-6" /> : <LogIn className="w-6 h-6" />,
      action: () => isLoggedIn ? setShowProfileSheet(true) : setShowAuthSheet(true),
      variant: 'pink' as const,
      desc: isLoggedIn ? 'View your stats and settings' : 'Sign in to sync your progress'
    },
  ];

  return (
    <div className="relative z-10 w-full h-screen flex overflow-hidden ui-overlay pointer-events-none">

      {/* LEFT COLUMN: Main Menu (Skewed) */}
      <div className="flex flex-col justify-center pl-16 pr-8 h-full w-[450px] relative pointer-events-auto">

        {/* Menu Background Shape */}
        <div className="absolute inset-y-0 left-[-100px] right-0 bg-black/40 backdrop-blur-md border-r border-white/10 skew-x-[-12deg] transform-origin-bottom-left" />

        <div className="relative z-10 flex flex-col gap-6 transform skew-x-[-12deg]">
          {/* Header */}
          <div className="mb-8 pl-4">
            <h1 className="text-6xl font-black text-white italic tracking-tighter drop-shadow-[0_0_15px_rgba(0,229,255,0.5)]">
              KALIMBA<br />
              <span className="text-cyan-400">HERO</span>
            </h1>
            <p className="text-white/60 font-bold tracking-[0.3em] text-sm mt-2 ml-1">
              RHYTHM EVOLVED
            </p>
          </div>

          {/* Menu Buttons */}
          <div className="flex flex-col gap-3">
            {menuItems.map((item, index) => (
              <motion.button
                key={item.label}
                onClick={item.action}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={cn(
                  "group relative h-16 w-full flex items-center px-6 overflow-hidden transition-all duration-200 cursor-pointer",
                  "bg-black/40 border border-white/10 hover:border-white/40",
                  "rounded-none" // Sharp
                )}
                whileHover={{ x: 20, scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Hover Fill Effect */}
                <div className={cn(
                  "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r",
                  item.variant === 'cyan' && "from-cyan-900/80 to-transparent",
                  item.variant === 'purple' && "from-purple-900/80 to-transparent",
                  item.variant === 'orange' && "from-orange-900/80 to-transparent",
                  item.variant === 'green' && "from-green-900/80 to-transparent",
                  item.variant === 'pink' && "from-pink-900/80 to-transparent",
                )} />

                {/* Content */}
                <div className="relative z-10 flex items-center justify-between w-full">
                  <span className={cn(
                    "text-2xl font-black italic tracking-wider transition-colors duration-200",
                    hoveredIndex === index ? "text-white text-glow" : "text-white/70"
                  )}>
                    {item.label}
                  </span>
                  <span className={cn(
                    "opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-4 group-hover:translate-x-0",
                    item.variant === 'cyan' && "text-cyan-400",
                    item.variant === 'purple' && "text-purple-400",
                    item.variant === 'orange' && "text-orange-400",
                    item.variant === 'green' && "text-green-400",
                    item.variant === 'pink' && "text-pink-400",
                  )}>
                    {item.icon}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT AREA: Description / Content */}
      <div className="flex-1 flex flex-col justify-end pb-24 pr-16 items-end pointer-events-none">
        <div className="w-[400px] text-right transform skew-x-[-12deg]">
          <motion.div
            key={hoveredIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-black/60 backdrop-blur-md p-6 border border-white/10 rounded-none skew-x-[-12deg]"
          >
            {hoveredIndex !== null ? (
              <>
                <h3 className="text-2xl font-black italic text-white mb-2">{menuItems[hoveredIndex].label}</h3>
                <p className="text-lg text-white/80 font-medium leading-relaxed">
                  {menuItems[hoveredIndex].desc}
                </p>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-white/50 mb-2">WELCOME</h3>
                <p className="text-white/40">Hover over a menu item to see details.</p>
              </>
            )}
          </motion.div>
        </div>
      </div>


      {/* Side Sheets */}
      <SkewedSheet
        isOpen={showAuthSheet}
        onClose={() => setShowAuthSheet(false)}
        side="left"
      >
        <AuthPanel onAuthSuccess={() => setShowAuthSheet(false)} />
      </SkewedSheet>

      <SkewedSheet
        isOpen={showProfileSheet}
        onClose={() => setShowProfileSheet(false)}
        side="right"
      >
        <ProfilePanel
          session={session}
          onClose={() => setShowProfileSheet(false)}
        />
      </SkewedSheet>

    </div >
  );
};
