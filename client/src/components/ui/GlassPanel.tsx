// ============================================
// Kalimba Hero - Glassmorphism Panel Component
// ============================================

import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassPanelProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'dark' | 'colored';
  blur?: 'sm' | 'md' | 'lg' | 'xl';
  glow?: boolean;
  glowColor?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const blurMap = {
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
  xl: 'backdrop-blur-xl',
};

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8',
};

const variantStyles = {
  default: 'bg-white/5 border-white/10',
  dark: 'bg-black/30 border-white/5',
  colored: 'bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border-cyan-500/20',
};

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className,
  variant = 'default',
  blur = 'lg',
  glow = false,
  glowColor = '#00E5FF',
  padding = 'md',
  ...motionProps
}) => {
  return (
    <motion.div
      className={cn(
        'relative rounded-2xl border',
        blurMap[blur],
        paddingMap[padding],
        variantStyles[variant],
        glow && 'shadow-lg',
        className
      )}
      style={{
        boxShadow: glow
          ? `0 0 30px ${glowColor}20, 0 0 60px ${glowColor}10, inset 0 1px 1px rgba(255,255,255,0.1)`
          : 'inset 0 1px 1px rgba(255,255,255,0.1)',
      }}
      {...motionProps}
    >
      {/* Inner highlight */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

// Card variant for library items
interface GlassCardProps extends GlassPanelProps {
  icon?: React.ReactNode;
  iconColor?: string;
  title?: string;
  subtitle?: string;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  icon,
  iconColor = '#00E5FF',
  title,
  subtitle,
  onClick,
  children,
  className,
  ...props
}) => {
  return (
    <GlassPanel
      className={cn(
        'cursor-pointer transition-all duration-300 hover:scale-[1.02]',
        className
      )}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      glow
      glowColor={iconColor}
      {...props}
    >
      <div className="flex flex-col items-center text-center gap-3">
        {icon && (
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
            style={{
              background: `linear-gradient(135deg, ${iconColor}30, ${iconColor}10)`,
              boxShadow: `0 0 20px ${iconColor}40`,
            }}
          >
            {icon}
          </div>
        )}
        
        {title && (
          <h3 className="text-lg font-bold text-white">{title}</h3>
        )}
        
        {subtitle && (
          <p className="text-sm text-white/60">{subtitle}</p>
        )}
        
        {children}
      </div>
    </GlassPanel>
  );
};

export default GlassPanel;






