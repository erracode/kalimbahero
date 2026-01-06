// ============================================
// Kalimba Hero - Icon Button Component
// ============================================
// Standardized icon button with consistent styling

import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface IconButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  icon: React.ReactNode;
  variant?: 'default' | 'ghost' | 'danger' | 'primary' | 'pink' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  title?: string;
}

const variantStyles = {
  default: 'bg-white/10 hover:bg-white/20 text-white/60 hover:text-white',
  ghost: 'bg-transparent hover:bg-white/5 text-white/50 hover:text-white/80',
  danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-400',
  primary: 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400',
  pink: 'bg-pink-500/20 hover:bg-pink-500/30 text-pink-400',
  orange: 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-400',
};

const sizeStyles = {
  sm: 'p-1.5',
  md: 'p-2',
  lg: 'p-3',
};

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = 'default',
  size = 'md',
  className,
  title,
  ...props
}) => {
  return (
    <motion.button
      className={cn(
        'rounded-lg transition-colors cursor-pointer',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={title}
      {...props}
    >
      {icon}
    </motion.button>
  );
};

export default IconButton;





