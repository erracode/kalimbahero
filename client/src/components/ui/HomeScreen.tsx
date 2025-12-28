// ============================================
// Kalimba Hero - Home Screen Component
// ============================================

import { motion } from 'framer-motion';
import { Music, Wrench, Library } from 'lucide-react';
import { GlassPanel, GlassCard } from './GlassPanel';
import { NeonButton } from './NeonButton';

interface HomeScreenProps {
  onStartGame: () => void;
  onSongBuilder: () => void;
  onLibrary: () => void;
}

// Kalimba icon SVG component
const KalimbaIcon = () => (
  <svg
    viewBox="0 0 100 120"
    className="w-24 h-28"
    style={{ filter: 'drop-shadow(0 0 20px #00E5FF)' }}
  >
    {/* Body */}
    <ellipse
      cx="50"
      cy="80"
      rx="40"
      ry="35"
      fill="none"
      stroke="#00E5FF"
      strokeWidth="2"
      opacity="0.8"
    />
    {/* Sound hole */}
    <circle cx="50" cy="90" r="10" fill="none" stroke="#00E5FF" strokeWidth="1.5" opacity="0.6" />
    {/* Tines */}
    {[0, 1, 2, 3, 4, 5, 6].map((i) => {
      const x = 25 + i * 8.3;
      const height = 35 + Math.abs(i - 3) * 8;
      return (
        <motion.rect
          key={i}
          x={x}
          y={50 - height + 40}
          width="5"
          height={height}
          rx="2"
          fill={`hsl(${180 + i * 20}, 100%, 60%)`}
          opacity="0.9"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.1 * i, duration: 0.5, type: 'spring' }}
          style={{ transformOrigin: 'bottom' }}
        />
      );
    })}
    {/* Bridge */}
    <rect x="20" y="45" width="60" height="4" rx="2" fill="#FFD93D" opacity="0.8" />
  </svg>
);

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartGame,
  onSongBuilder,
  onLibrary,
}) => {
  return (
    <motion.div
      className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Title section */}
      <motion.div
        className="text-center mb-12"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
      >
        <div className="flex justify-center mb-4">
          <KalimbaIcon />
        </div>
        <h1
          className="text-6xl md:text-7xl font-black tracking-tight"
          style={{
            background: 'linear-gradient(135deg, #00E5FF, #FF6B6B, #FFD93D)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 60px rgba(0, 229, 255, 0.3)',
          }}
        >
          KALIMBA HERO
        </h1>
        <p className="text-white/60 mt-2 text-lg">
          Master the 21 keys. Feel the rhythm.
        </p>
      </motion.div>

      {/* Menu buttons */}
      <motion.div
        className="flex flex-wrap justify-center gap-4 md:gap-6"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, type: 'spring' }}
      >
        <NeonButton
          variant="cyan"
          size="lg"
          icon={<Music className="w-5 h-5" />}
          onClick={onStartGame}
        >
          START GAME
        </NeonButton>

        <NeonButton
          variant="orange"
          size="lg"
          icon={<Wrench className="w-5 h-5" />}
          onClick={onSongBuilder}
        >
          SONG BUILDER
        </NeonButton>

        <NeonButton
          variant="purple"
          size="lg"
          icon={<Library className="w-5 h-5" />}
          onClick={onLibrary}
        >
          LIBRARY
        </NeonButton>
      </motion.div>

      {/* Feature cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl w-full"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <GlassPanel padding="md" className="text-center">
          <div className="text-3xl mb-2">🎵</div>
          <h3 className="text-white font-bold mb-1">Real-Time Detection</h3>
          <p className="text-white/50 text-sm">
            Play your real kalimba and see your notes detected instantly
          </p>
        </GlassPanel>

        <GlassPanel padding="md" className="text-center">
          <div className="text-3xl mb-2">🎮</div>
          <h3 className="text-white font-bold mb-1">Guitar Hero Style</h3>
          <p className="text-white/50 text-sm">
            Watch notes fall and hit them at the perfect moment
          </p>
        </GlassPanel>

        <GlassPanel padding="md" className="text-center">
          <div className="text-3xl mb-2">🛠️</div>
          <h3 className="text-white font-bold mb-1">Create Songs</h3>
          <p className="text-white/50 text-sm">
            Build your own songs with simple tablature notation
          </p>
        </GlassPanel>
      </motion.div>

      {/* Instructions hint */}
      <motion.div
        className="mt-12 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <p className="text-white/30 text-sm">
          Press <kbd className="px-2 py-1 bg-white/10 rounded text-white/50">Space</kbd> to start quickly
        </p>
      </motion.div>
    </motion.div>
  );
};

export default HomeScreen;






