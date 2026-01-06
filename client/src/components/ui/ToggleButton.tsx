// ============================================
// Kalimba Hero - Toggle Button Component
// ============================================
// Standardized toggle button for mode switching, filters, etc.

import { cn } from '@/lib/utils';

interface ToggleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  variant?: 'default' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

const variantStyles = {
  default: {
    active: 'bg-white/20 text-white',
    inactive: 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80',
  },
  primary: {
    active: 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/30',
    inactive: 'text-white/50 hover:text-white/80 hover:bg-white/5',
  },
  secondary: {
    active: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30',
    inactive: 'text-white/50 hover:text-white/80 hover:bg-white/5',
  },
};

const sizeStyles = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const ToggleButton: React.FC<ToggleButtonProps> = ({
  active = false,
  variant = 'default',
  size = 'md',
  icon,
  children,
  className,
  ...props
}) => {
  const styles = variantStyles[variant];
  
  return (
    <button
      className={cn(
        'relative flex items-center gap-2 rounded-lg font-semibold transition-all duration-200 cursor-pointer',
        active ? styles.active : styles.inactive,
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
};

export default ToggleButton;





