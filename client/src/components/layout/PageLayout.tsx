import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Music, Mic2, Library, Wrench, User, LogIn, Home } from 'lucide-react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface PageLayoutProps {
    children: React.ReactNode;
    userName?: string | null;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ children }) => {
    const navigate = useNavigate();
    // We can get location if we want to highlight active tab, though user didn't explicitly ask for it, it's good UX.
    // const location = useLocation(); 
    const { session } = useAuth();
    const userName = session?.user?.name;

    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const menuItems = [
        { label: 'HOME', icon: <Home className="w-6 h-6" />, path: '/', variant: 'cyan' as const, desc: 'Return to main menu' },
        { label: 'QUICKPLAY', icon: <Music className="w-6 h-6" />, path: '/library', variant: 'cyan' as const, desc: 'Jump straight into the action' },
        { label: 'LIBRARY', icon: <Library className="w-6 h-6" />, path: '/library', variant: 'purple' as const, desc: 'Browse your song collection' },
        { label: 'SONG BUILDER', icon: <Wrench className="w-6 h-6" />, path: '/song-builder', variant: 'orange' as const, desc: 'Create and edit your own tracks' },
        { label: 'TUNER', icon: <Mic2 className="w-6 h-6" />, path: '/tuner', variant: 'green' as const, desc: 'Tune your real Kalimba' },
        {
            label: session ? (userName || 'PROFILE') : 'LOGIN',
            icon: session ? <User className="w-6 h-6" /> : <LogIn className="w-6 h-6" />,
            path: session ? '/profile' : '/auth',
            variant: 'pink' as const,
            desc: session ? 'View your stats and settings' : 'Sign in to sync your progress'
        },
    ];

    const handleNavigation = (path: string) => {
        navigate({ to: path });
    };

    return (
        <div className="relative z-10 w-full h-screen flex overflow-hidden ui-overlay pointer-events-none">

            {/* LEFT COLUMN: Main Menu (Skewed) */}
            <div className="flex flex-col justify-center pl-16 pr-8 h-full w-[450px] relative pointer-events-auto shrink-0 z-50">

                {/* Menu Background Shape */}
                <div className="absolute inset-y-0 left-[-100px] right-0 bg-black/40 backdrop-blur-md border-r border-white/10 skew-x-[-12deg] transform-origin-bottom-left" />

                <div className="relative z-10 flex flex-col gap-6 transform skew-x-[-12deg]">
                    {/* Header */}
                    <div className="mb-8 pl-4 cursor-pointer" onClick={() => handleNavigation('/')}>
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
                                onClick={() => handleNavigation(item.path)}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                className={cn(
                                    "group relative h-16 w-full flex items-center px-6 overflow-hidden transition-all duration-200",
                                    "bg-black/40 border border-white/10 hover:border-white/40",
                                    "rounded-none"
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

            {/* RIGHT AREA: Content Slot */}
            <div className="flex-1 flex flex-col h-full relative pointer-events-auto overflow-hidden">
                {/* We can potentially put the 'hover details' here, or let the page content take over. 
             For general pages, we probably want the content to be the main focus.
             However, keeping the hover details persistent might be nice. 
             Let's render the hover details in the bottom right corner like the HomeScreen 
             BUT only if the children don't obscure it? 
             Actually, for specific tools (Tuner, Builder), we might want full screen real estate.
             
             Let's put the children in a container that fills the space.
          */}
                <div className="flex-1 relative z-10 p-8 overflow-auto">
                    {children}
                </div>

                {/* Hover Description Overlay - Identical to HomeScreen but maybe transient? 
              On HomeScreen it was occupying the main space. Here "children" occupy the main space.
              Let's float it in the bottom right, similar to HomeScreen.
          */}
                <div className="absolute bottom-8 right-16 w-[400px] text-right pointer-events-none z-50 transform skew-x-[-12deg]">
                    <motion.div
                        key={hoveredIndex}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        // Only show if we are hovering
                        className={cn(
                            "bg-black/80 backdrop-blur-md p-6 border border-white/10 rounded-none skew-x-[-12deg] transition-opacity duration-200",
                            hoveredIndex !== null ? "opacity-100" : "opacity-0"
                        )}
                    >
                        {hoveredIndex !== null && (
                            <>
                                <h3 className="text-2xl font-black italic text-white mb-2">{menuItems[hoveredIndex].label}</h3>
                                <p className="text-lg text-white/80 font-medium leading-relaxed">
                                    {menuItems[hoveredIndex].desc}
                                </p>
                            </>
                        )}
                    </motion.div>
                </div>

            </div>

        </div>
    );
};
