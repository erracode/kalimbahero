// ============================================
// Kalimba Hero - Neon Button Component
// ============================================

import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NeonButtonProps extends HTMLMotionProps<'button'> {
  children: React.ReactNode;
  variant?: 'cyan' | 'orange' | 'purple' | 'green' | 'red' | 'pink';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
}

const variantColors = {
  cyan: {
    bg: 'from-cyan-500 to-cyan-600',
    glow: '#00E5FF',
    text: 'text-white',
  },
  orange: {
    bg: 'from-orange-400 to-orange-500',
    glow: '#FF8E53',
    text: 'text-white',
  },
  purple: {
    bg: 'from-purple-500 to-purple-600',
    glow: '#9B59B6',
    text: 'text-white',
  },
  green: {
    bg: 'from-green-400 to-green-500',
    glow: '#6BCB77',
    text: 'text-white',
  },
  red: {
    bg: 'from-red-400 to-red-500',
    glow: '#FF6B6B',
    text: 'text-white',
  },
  pink: {
    bg: 'from-pink-400 to-pink-500',
    glow: '#E91E63',
    text: 'text-white',
  },
};

const sizeStyles = {
  sm: 'px-4 py-2 text-sm gap-1.5',
  md: 'px-6 py-3 text-base gap-2',
  lg: 'px-8 py-4 text-lg gap-3',
};

export const NeonButton: React.FC<NeonButtonProps> = ({
  children,
  variant = 'cyan',
  size = 'md',
  icon,
  fullWidth = false,
  disabled = false,
  className,
  ...motionProps
}) => {
  const colors = variantColors[variant];
  
  return (
    <motion.button
      className={cn(
        'relative inline-flex items-center justify-center font-bold rounded-xl',
        'bg-gradient-to-b',
        colors.bg,
        colors.text,
        sizeStyles[size],
        fullWidth && 'w-full',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className
      )}
      style={{
        boxShadow: disabled
          ? 'none'
          : `0 0 20px ${colors.glow}50, 0 0 40px ${colors.glow}30, inset 0 1px 1px rgba(255,255,255,0.3)`,
      }}
      whileHover={
        disabled
          ? {}
          : {
              scale: 1.05,
              boxShadow: `0 0 30px ${colors.glow}70, 0 0 60px ${colors.glow}50, inset 0 1px 1px rgba(255,255,255,0.3)`,
            }
      }
      whileTap={disabled ? {} : { scale: 0.95 }}
      disabled={disabled}
      {...motionProps}
    >
      {/* Shine effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
      
      {/* Icon */}
      {icon && <span className="relative z-10">{icon}</span>}
      
      {/* Text */}
      <span className="relative z-10 font-semibold tracking-wide">{children}</span>
    </motion.button>
  );
};

export default NeonButton;







