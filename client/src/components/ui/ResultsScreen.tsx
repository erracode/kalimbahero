// ============================================
// Kalimba Hero - Results Screen Component
// ============================================

import { motion } from 'framer-motion';
import { GlassPanel } from './GlassPanel';
import { NeonButton } from './NeonButton';
import type { GameScore, Song } from '@/types/game';

interface ResultsScreenProps {
  score: GameScore;
  song: Song;
  onRestart: () => void;
  onBackToLibrary: () => void;
  onShare?: () => void;
}

// Calculate rank based on accuracy
const getRank = (accuracy: number): { rank: string; color: string; label: string } => {
  if (accuracy >= 98) return { rank: 'S+', color: '#FFD93D', label: 'LEGENDARY!' };
  if (accuracy >= 95) return { rank: 'S', color: '#FFD93D', label: 'PERFECT!' };
  if (accuracy >= 90) return { rank: 'A', color: '#6BCB77', label: 'EXCELLENT!' };
  if (accuracy >= 80) return { rank: 'B', color: '#00E5FF', label: 'GREAT!' };
  if (accuracy >= 70) return { rank: 'C', color: '#9B59B6', label: 'GOOD' };
  if (accuracy >= 60) return { rank: 'D', color: '#FF8E53', label: 'OKAY' };
  return { rank: 'F', color: '#FF6B6B', label: 'TRY AGAIN' };
};

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  score,
  song,
  onRestart,
  onBackToLibrary,
  onShare,
}) => {
  const { rank, color, label } = getRank(score.accuracy);
  const totalNotes = score.perfect + score.good + score.okay + score.miss;
  const passed = score.accuracy >= 60;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <GlassPanel
        padding="lg"
        className="max-w-md w-full"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring' }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            className="text-5xl font-black mb-2"
            style={{ color }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          >
            {passed ? 'PASSED' : 'FAILED'}
          </motion.div>
          <div className="text-white/60">{song.title}</div>
        </div>

        {/* Rank badge */}
        <motion.div
          className="flex justify-center mb-6"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 150 }}
        >
          <div
            className="w-24 h-24 rounded-full flex flex-col items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${color}40, ${color}20)`,
              boxShadow: `0 0 40px ${color}60, inset 0 0 20px ${color}30`,
              border: `3px solid ${color}`,
            }}
          >
            <div className="text-4xl font-black" style={{ color }}>
              {rank}
            </div>
            <div className="text-xs text-white/60 uppercase">{label}</div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="space-y-4 mb-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {/* Score */}
          <div className="flex justify-between items-center">
            <span className="text-white/60">Score</span>
            <span className="text-2xl font-bold text-white tabular-nums">
              {score.score.toLocaleString()}
            </span>
          </div>

          {/* Max Combo */}
          <div className="flex justify-between items-center">
            <span className="text-white/60">Max Combo</span>
            <span className="text-xl font-bold text-orange-400 tabular-nums">
              {score.maxCombo}x
            </span>
          </div>

          {/* Accuracy */}
          <div className="flex justify-between items-center">
            <span className="text-white/60">Accuracy</span>
            <span className="text-xl font-bold text-cyan-400 tabular-nums">
              {score.accuracy}%
            </span>
          </div>

          {/* Hit breakdown */}
          <div className="pt-4 border-t border-white/10">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-cyan-400 font-bold text-lg">{score.perfect}</div>
                <div className="text-xs text-white/50">Perfect</div>
              </div>
              <div>
                <div className="text-green-400 font-bold text-lg">{score.good}</div>
                <div className="text-xs text-white/50">Good</div>
              </div>
              <div>
                <div className="text-yellow-400 font-bold text-lg">{score.okay}</div>
                <div className="text-xs text-white/50">Okay</div>
              </div>
              <div>
                <div className="text-red-400 font-bold text-lg">{score.miss}</div>
                <div className="text-xs text-white/50">Miss</div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
              initial={{ width: 0 }}
              animate={{ width: `${score.accuracy}%` }}
              transition={{ delay: 0.8, duration: 0.5 }}
            />
          </div>
          <div className="text-xs text-white/40 text-center">
            {totalNotes} notes played
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          className="flex flex-col gap-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <NeonButton variant="cyan" fullWidth onClick={onRestart}>
            🔄 Play Again
          </NeonButton>
          
          {onShare && (
            <NeonButton variant="purple" fullWidth onClick={onShare}>
              📤 Share Score
            </NeonButton>
          )}
          
          <NeonButton variant="orange" fullWidth onClick={onBackToLibrary}>
            📚 Back to Library
          </NeonButton>
        </motion.div>
      </GlassPanel>
    </motion.div>
  );
};

export default ResultsScreen;






