// ============================================
// Kalimba Hero - Score Board Component
// ============================================

import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from './GlassPanel';
import type { GameScore } from '@/types/game';

interface ScoreBoardProps {
  score: GameScore;
  isVisible?: boolean;
  compact?: boolean;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  score,
  isVisible = true,
  compact = false,
}) => {
  const comboColor = 
    score.combo >= 100 ? '#FFD93D' :
    score.combo >= 50 ? '#FF8E53' :
    score.combo >= 25 ? '#9B59B6' :
    score.combo >= 10 ? '#00E5FF' :
    '#ffffff';

  if (compact) {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <GlassPanel padding="sm" className="min-w-[120px]">
              <div className="text-center">
                <div className="text-3xl font-black text-white tabular-nums">
                  {score.score.toLocaleString()}
                </div>
                <div 
                  className="text-lg font-bold mt-1"
                  style={{ color: comboColor }}
                >
                  {score.combo}x
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
        >
          <GlassPanel padding="md" className="w-56">
            {/* Score */}
            <div className="mb-4">
              <div className="text-xs text-white/50 uppercase tracking-wider mb-1">
                Score
              </div>
              <div className="text-4xl font-black text-white tabular-nums">
                {score.score.toLocaleString()}
              </div>
            </div>
            
            {/* Combo */}
            <div className="mb-4">
              <div className="text-xs text-white/50 uppercase tracking-wider mb-1">
                Combo
              </div>
              <motion.div
                className="text-3xl font-black tabular-nums"
                style={{ color: comboColor }}
                animate={{
                  scale: score.combo > 0 ? [1, 1.1, 1] : 1,
                }}
                transition={{ duration: 0.2 }}
              >
                {score.combo}x
              </motion.div>
            </div>
            
            {/* Accuracy */}
            <div className="mb-4">
              <div className="text-xs text-white/50 uppercase tracking-wider mb-1">
                Accuracy
              </div>
              <div className="text-2xl font-bold text-white">
                {score.accuracy}%
              </div>
            </div>
            
            {/* Hit breakdown */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-white/70">Perfect</span>
                <span className="text-white ml-auto">{score.perfect}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-white/70">Good</span>
                <span className="text-white ml-auto">{score.good}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-white/70">Okay</span>
                <span className="text-white ml-auto">{score.okay}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-white/70">Miss</span>
                <span className="text-white ml-auto">{score.miss}</span>
              </div>
            </div>
          </GlassPanel>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ScoreBoard;







