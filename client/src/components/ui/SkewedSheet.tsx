import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { NeonButton } from './NeonButton';

interface SkewedSheetProps {
    isOpen: boolean;
    onClose: () => void;
    side: 'left' | 'right';
    children: React.ReactNode;
    className?: string;
}

export const SkewedSheet: React.FC<SkewedSheetProps> = ({
    isOpen,
    onClose,
    side,
    children,
    className
}) => {
    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const slideVariants = {
        closed: {
            x: side === 'left' ? '-100%' : '100%',
            opacity: 0,
        },
        open: {
            x: '0%',
            opacity: 1,
            transition: {
                type: 'spring',
                damping: 25,
                stiffness: 200,
                mass: 0.8
            }
        }
    };

    const backdropVariants = {
        closed: { opacity: 0 },
        open: { opacity: 1 }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial="closed"
                        animate="open"
                        exit="closed"
                        variants={backdropVariants}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial="closed"
                        animate="open"
                        exit="closed"
                        variants={slideVariants}
                        className={cn(
                            "fixed top-0 bottom-0 z-50 w-full md:w-[600px] p-0 flex flex-col",
                            side === 'left' ? "left-0" : "right-0",
                            className
                        )}
                    >
                        {/* Skewed Container */}
                        <div className={cn(
                            "h-full w-full relative bg-black/90 border-white/10 flex flex-col overflow-hidden",
                            // Left Sheet: Skew -12deg (Matches Menu)
                            // Right Sheet: Skew -12deg (Parallel to Menu, as requested "same direction")
                            side === 'left' ? "border-r skew-x-[-12deg] -ml-12 px-16" : "border-l skew-x-[-12deg] -mr-12 px-16"
                        )}>
                            {/* Decorative Background Elements */}
                            <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
                            </div>

                            {/* Close Button Area */}
                            <div className={cn(
                                "relative z-20 flex pt-8 pb-4 shrink-0",
                                side === 'left' ? "justify-end skew-x-[12deg]" : "justify-start skew-x-[12deg]"
                            )}>
                                <button
                                    onClick={onClose}
                                    className={cn(
                                        "group relative h-12 flex items-center px-8 overflow-hidden transition-all duration-200 cursor-pointer bg-black/40 border border-white/10 hover:border-white/40",
                                        "rounded-none skew-x-[-12deg] hover:scale-105 active:scale-95"
                                    )}
                                >
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-red-900/80 to-transparent" />
                                    <div className="relative z-10 flex items-center gap-2 skew-x-[12deg]">
                                        <X className="w-5 h-5 text-white/70 group-hover:text-red-400 transition-colors" />
                                        <span className="text-sm font-black italic tracking-widest text-white/70 group-hover:text-white transition-colors uppercase">
                                            CLOSE
                                        </span>
                                    </div>
                                </button>
                            </div>

                            {/* Content Area - Unskewed */}
                            <div className={cn(
                                "flex-1 overflow-y-auto relative z-10 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent p-4",
                                // Counter-skew to straighten content. Since container is -12deg, we need +12deg.
                                "skew-x-[12deg]"
                            )}>
                                {children}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
