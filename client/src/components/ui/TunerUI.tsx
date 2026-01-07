import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Mic, MousePointer, X } from 'lucide-react';
import { useAudioDetection } from '@/hooks/useAudioDetection';
import { KALIMBA_KEYS } from '@/utils/frequencyMap';
import { Canvas } from '@react-three/fiber';
import { Kalimba3D } from '../game/Kalimba3D';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { cn } from '@/lib/utils';
import { AuroraBackground } from './AuroraBackground';
import { NeonButton } from './NeonButton';
import { useNavigate } from '@tanstack/react-router';

export const TunerUI: React.FC = () => {
    const navigate = useNavigate();
    const [isActive] = useState(true);
    const [mode, setMode] = useState<'auto' | 'manual'>('auto');
    const [manualTargetIndex, setManualTargetIndex] = useState<number>(10);

    const audioCtxRef = useRef<AudioContext | null>(null);

    const { isListening, currentPitch, startListening, stopListening, error } = useAudioDetection({
        enabled: isActive,
        clarityThreshold: 0.75,
        pitchTolerance: 50,
    });

    useEffect(() => {
        startListening();
        return () => stopListening();
    }, []);

    const playTone = (frequency: number) => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.5);
    };

    const handleTineClick = (index: number) => {
        const key = KALIMBA_KEYS[index];
        if (key) {
            playTone(key.frequency);
            if (mode === 'manual') setManualTargetIndex(index);
        }
    };

    const targetKey = useMemo(() => {
        if (mode === 'manual') return KALIMBA_KEYS[manualTargetIndex];
        if (!currentPitch || !currentPitch.noteName) return null;
        return KALIMBA_KEYS.find(k => k.noteName === currentPitch.noteName) || null;
    }, [mode, manualTargetIndex, currentPitch]);

    const deviation = useMemo(() => {
        if (!currentPitch) return null;
        if (mode === 'auto') return currentPitch.cents;
        const targetFreq = KALIMBA_KEYS[manualTargetIndex].frequency;
        return 1200 * Math.log2(currentPitch.frequency / targetFreq);
    }, [currentPitch, mode, manualTargetIndex]);

    const isInTune = deviation !== null && Math.abs(deviation) < 10;
    const isClose = deviation !== null && Math.abs(deviation) < 25;
    const clampedDeviation = deviation !== null ? Math.max(-50, Math.min(50, deviation)) : 0;
    const needleRotation = (clampedDeviation / 50) * 45;
    const statusColor = isInTune ? '#00FF88' : isClose ? '#FFCC00' : '#FF4400';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full min-h-screen relative overflow-hidden bg-black font-sans"
        >

            {/* BACKGROUND: Aurora + Grid */}
            <div className="absolute inset-0 z-0 bg-black">
                <div className="absolute inset-0 opacity-40">
                    <AuroraBackground />
                </div>
                <div className="absolute inset-0 bg-black/30 z-10" />
                <div className="absolute inset-0 bg-[url('/grid.png')] opacity-[0.05] z-10 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80 z-10" />
            </div>

            {/* 3D SCENE (Transparent Background) */}
            <div className="absolute inset-0 z-10">
                <Canvas
                    shadows
                    camera={{ position: [0, 10, 14], rotation: [-0.42, 0, 0], fov: 60 }}
                    gl={{
                        antialias: true,
                        toneMapping: THREE.ACESFilmicToneMapping,
                        toneMappingExposure: 1.2,
                        alpha: true, // Transparent canvas
                    }}
                >
                    <ambientLight intensity={0.4} />
                    <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
                    <pointLight position={[0, 10, 0]} intensity={0.5} color="#00E5FF" />
                    <pointLight position={[-10, 5, 5]} intensity={0.3} color="#FF6B6B" />

                    <Kalimba3D
                        position={[0, 0, 0]}
                        activeKeyIndices={mode === 'manual' ? [manualTargetIndex] : (targetKey ? [targetKey.index] : [])}
                        showNumbers={true}
                        onTineClick={handleTineClick}
                    />

                    <EffectComposer>
                        <Bloom intensity={0.5} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur={false} />
                    </EffectComposer>
                </Canvas>
            </div>

            {/* UI LAYER */}
            <div className="absolute inset-0 z-20 flex flex-col justify-between pointer-events-none">

                {/* Top: Header & Meter */}
                <div className="w-full flex flex-col items-center pt-8 gap-6 pointer-events-auto">


                    {/* Meter Panel - Clean Glass Style */}
                    <div className="relative w-full max-w-lg bg-black/60 backdrop-blur-xl border border-white/10 rounded-none p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center gap-2">
                        <h2 className="text-white/40 font-black uppercase tracking-[0.3em] text-[10px] mb-2">Current Tone</h2>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={targetKey?.displayNote || (mode === 'manual' ? KALIMBA_KEYS[manualTargetIndex].displayNote : 'idle')}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex items-baseline gap-2"
                            >
                                <span className={cn(
                                    "text-7xl font-black italic tracking-tighter drop-shadow-xl",
                                    isInTune ? "text-[#00FF88]" : "text-white"
                                )}>
                                    {targetKey?.displayNote || (mode === 'manual' ? KALIMBA_KEYS[manualTargetIndex].displayNote : '--')}
                                </span>
                                {targetKey && (
                                    <span className="text-3xl font-bold text-cyan-400">
                                        {targetKey.displayDegree}
                                    </span>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        {/* Deviation Badge */}
                        <div className="h-6 mt-2">
                            {currentPitch && deviation !== null && (
                                <div className={cn(
                                    "px-4 py-1 rounded-none skew-x-[-12deg] border backdrop-blur-sm flex items-center gap-2",
                                    isInTune ? "bg-green-500/20 border-green-500/50" : "bg-white/5 border-white/10"
                                )}>
                                    <span className={cn("text-xs font-bold uppercase tracking-widest", isInTune ? "text-green-400" : "text-white/60")}>
                                        {isInTune ? 'PERFECT' : deviation > 0 ? 'SHARP' : 'FLAT'}
                                    </span>
                                    <span className="text-xs font-mono text-white/40">
                                        {deviation > 0 ? '+' : ''}{deviation.toFixed(0)}c
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Gauge Visual */}
                        <div className="relative w-64 h-4 rounded-none skew-x-[-12deg] bg-white/10 mt-6 overflow-hidden">
                            {/* Center Marker */}
                            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/50 -translate-x-1/2 z-10" />
                            {/* Range Markers */}
                            <div className="absolute top-0 bottom-0 left-[25%] w-px bg-white/10" />
                            <div className="absolute top-0 bottom-0 left-[75%] w-px bg-white/10" />

                            {/* Moving Indicator */}
                            {(isActive || currentPitch) && (
                                <motion.div
                                    className="absolute top-0 bottom-0 w-2 bg-white shadow-[0_0_10px_white] z-20"
                                    animate={{ left: `${50 + clampedDeviation}%` }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    style={{ translateX: '-50%', backgroundColor: statusColor, boxShadow: `0 0 15px ${statusColor}` }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Mode Switcher */}
                    <div className="flex bg-black/60 p-1 rounded-none skew-x-[-12deg] border border-white/10 pointer-events-auto">
                        <button
                            onClick={() => setMode('auto')}
                            className={cn(
                                "px-10 py-3 rounded-none text-xs font-black italic uppercase tracking-widest transition-all cursor-pointer",
                                mode === 'auto' ? "bg-cyan-600 text-white shadow-lg" : "text-white/40 hover:text-white"
                            )}
                        >
                            <span className="skew-x-[12deg] block">Auto</span>
                        </button>
                        <button
                            onClick={() => setMode('manual')}
                            className={cn(
                                "px-10 py-3 rounded-none text-xs font-black italic uppercase tracking-widest transition-all cursor-pointer",
                                mode === 'manual' ? "bg-purple-600 text-white shadow-lg" : "text-white/40 hover:text-white"
                            )}
                        >
                            <span className="skew-x-[12deg] block">Manual</span>
                        </button>
                    </div>
                </div>

                {/* Bottom: Instructions & Tuning Actions */}
                <div className="pb-12 px-8 flex flex-col items-center gap-8 pointer-events-auto">

                    {/* Instructions */}
                    <div className="text-center opacity-60">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-white font-bold flex items-center justify-center gap-2">
                            {mode === 'manual' ? (
                                <>
                                    <MousePointer className="w-3 h-3 text-purple-400" />
                                    <span>Click a tine to select it as reference</span>
                                </>
                            ) : (
                                <>
                                    <Mic className="w-3 h-3 text-cyan-400" />
                                    <span>Play a note to detect pitch</span>
                                </>
                            )}
                        </p>
                    </div>

                    {/* Tune Up/Down Big Indicators */}
                    <div className="h-24">
                        <AnimatePresence>
                            {currentPitch && deviation !== null && !isInTune && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className={cn(
                                        "flex items-center gap-8 px-10 py-4 bg-[#111] border border-white/20 rounded-none skew-x-[-12deg] shadow-2xl",
                                        deviation < -10 ? "border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]" : "border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
                                    )}
                                >
                                    {deviation < -10 ? (
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-3xl font-black text-red-500 italic uppercase tracking-tighter skew-x-[12deg]">TUNE UP</span>
                                            <span className="text-[10px] uppercase tracking-widest text-white/60 skew-x-[12deg]">Hammer Upwards</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-3xl font-black text-yellow-500 italic uppercase tracking-tighter skew-x-[12deg]">TUNE DOWN</span>
                                            <span className="text-[10px] uppercase tracking-widest text-white/60 skew-x-[12deg]">Hammer Downwards</span>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

            </div>
        </motion.div >
    );
};
