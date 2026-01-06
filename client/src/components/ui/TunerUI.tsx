import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAudioDetection } from '@/hooks/useAudioDetection';
import { KALIMBA_KEYS } from '@/utils/frequencyMap';
import { GlassPanel } from './GlassPanel';
import { NeonButton } from './NeonButton';
import { Canvas } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { Kalimba3D } from '../game/Kalimba3D';

export const TunerUI: React.FC = () => {
    const [isActive, setIsActive] = useState(false);
    const { isListening, currentPitch, startListening, stopListening, error } = useAudioDetection({
        enabled: isActive,
        clarityThreshold: 0.75, // Lower threshold for tuning
        pitchTolerance: 50,    // Wider tolerance to catch out-of-tune notes
    });

    const toggleTuner = () => {
        if (isActive) {
            stopListening();
            setIsActive(false);
        } else {
            startListening();
            setIsActive(true);
        }
    };

    // Find the target key info for display
    const targetKey = useMemo(() => {
        if (!currentPitch || !currentPitch.noteName) return null;
        return KALIMBA_KEYS.find(k => k.noteName === currentPitch.noteName) || null;
    }, [currentPitch]);

    // Determine if note is "in tune" (within 10 cents)
    const isInTune = currentPitch && Math.abs(currentPitch.cents) < 10;
    const isClose = currentPitch && Math.abs(currentPitch.cents) < 25;

    return (
        <div className="flex flex-col items-center gap-8 w-full max-w-2xl mx-auto">
            {/* Main Tuner Display */}
            <GlassPanel className="w-full relative overflow-hidden group" padding="lg">
                <div
                    className="absolute inset-0 opacity-10 blur-3xl transition-colors duration-500"
                    style={{
                        backgroundColor: currentPitch ? (isInTune ? '#00FF88' : isClose ? '#FFCC00' : '#FF4400') : 'transparent'
                    }}
                />

                {/* 3D Kalimba Model in the background/side of the panel */}
                <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
                    <Canvas shadows camera={{ position: [0, 8, 12], fov: 40 }}>
                        <ambientLight intensity={0.5} />
                        <pointLight position={[10, 10, 10]} intensity={1} />
                        <Float speed={isActive ? 2 : 0.5} rotationIntensity={0.2} floatIntensity={0.5}>
                            <Kalimba3D
                                position={[0, -2, 0]}
                                activeKeyIndices={currentPitch?.noteName && currentPitch.noteName !== '-' ?
                                    [KALIMBA_KEYS.findIndex(k => k.noteName === currentPitch.noteName)] :
                                    []
                                }
                                showNumbers={false}
                            />
                        </Float>
                    </Canvas>
                </div>

                <div className="relative z-10 flex flex-col items-center py-8">
                    {/* Note Display */}
                    <div className="flex flex-col items-center mb-12">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={targetKey?.displayNote || 'idle'}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex items-baseline gap-2"
                            >
                                <span className="text-8xl font-black text-white tracking-tighter" style={{ textShadow: '0 0 40px rgba(255,255,255,0.2)' }}>
                                    {targetKey?.displayNote || '--'}
                                </span>
                                <span className="text-4xl font-bold text-cyan-400">
                                    {targetKey?.displayDegree || ''}
                                </span>
                            </motion.div>
                        </AnimatePresence>

                        <motion.div
                            animate={{ opacity: currentPitch ? 1 : 0.3 }}
                            className="text-white/40 font-mono mt-2 flex flex-col items-center"
                        >
                            {currentPitch ? (
                                <>
                                    <span className="text-cyan-400/80 tracking-widest uppercase text-[10px] font-bold mb-1">Frequency</span>
                                    <span className="text-white font-bold">{currentPitch.frequency.toFixed(2)} Hz</span>
                                    {currentPitch.volume !== undefined && (
                                        <div className="flex items-center gap-2 mt-2 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                                            <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-cyan-400"
                                                    animate={{ width: `${Math.min(100, currentPitch.volume * 200)}%` }}
                                                />
                                            </div>
                                            <span className="text-[9px] opacity-60 font-bold uppercase">
                                                Vol: {(currentPitch.volume * 100).toFixed(2)}%
                                            </span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <span className="animate-pulse tracking-widest uppercase text-[10px] font-bold">Waiting for input...</span>
                            )}
                        </motion.div>
                    </div>

                    {/* Cents Gauge */}
                    <div className="w-full max-w-md px-12 relative">
                        {/* Center Line */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20 -translate-x-1/2" />

                        {/* Gauge Background */}
                        <div className="h-2 w-full bg-white/5 rounded-full relative overflow-visible flex items-center">
                            {/* Markers */}
                            {[-50, -25, 0, 25, 50].map((val) => (
                                <div
                                    key={val}
                                    className="absolute h-4 w-0.5 bg-white/10"
                                    style={{ left: `${((val + 50) / 100) * 100}%`, top: '-4px' }}
                                />
                            ))}

                            {/* Active Needle */}
                            <motion.div
                                animate={{
                                    left: `${(((currentPitch?.cents || 0) + 50) / 100) * 100}%`,
                                    opacity: currentPitch ? 1 : 0
                                }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                className="absolute flex flex-col items-center h-12 -top-5"
                            >
                                <div
                                    className="w-1.5 h-full rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                                    style={{
                                        backgroundColor: isInTune ? '#00FF88' : isClose ? '#FFCC00' : '#FF4400',
                                        boxShadow: `0 0 20px ${isInTune ? '#00FF8888' : isClose ? '#FFCC0088' : '#FF440088'}`
                                    }}
                                />
                                <div
                                    className="text-xs font-bold mt-1"
                                    style={{ color: isInTune ? '#00FF88' : isClose ? '#FFCC00' : '#FF4400' }}
                                >
                                    {currentPitch && (currentPitch.cents > 0 ? `+${currentPitch.cents.toFixed(0)}` : currentPitch.cents.toFixed(0))}
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    <div className="mt-12 flex items-center gap-4">
                        {currentPitch ? (
                            isInTune ? (
                                <div className="flex items-center gap-2 text-[#00FF88]">
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span className="font-bold uppercase tracking-wider">Perfect</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-white/40">
                                    <AlertCircle className="w-5 h-5" />
                                    <span className="uppercase tracking-widest text-[10px] font-bold">
                                        {currentPitch.cents > 0 ? 'Too Sharp' : 'Too Flat'}
                                    </span>
                                </div>
                            )
                        ) : (
                            <div className="flex items-center gap-2 text-white/20 italic text-sm">
                                Striking a tine...
                            </div>
                        )}
                    </div>
                </div>
            </GlassPanel>

            {/* Control Actions */}
            <div className="flex gap-4 items-center">
                <NeonButton
                    variant={isActive ? 'orange' : 'cyan'}
                    icon={isActive ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    onClick={toggleTuner}
                    size="lg"
                >
                    {isActive ? 'Stop Tuner' : 'Start Tuner'}
                </NeonButton>

                {!isListening && isActive && !error && (
                    <div className="flex items-center gap-2 text-white/60 animate-pulse text-sm">
                        <Mic className="w-4 h-4" /> Waiting for audio...
                    </div>
                )}
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Instructions */}
            <div className="flex items-start gap-4 p-6 bg-white/5 rounded-2xl border border-white/5 text-white/60 text-sm max-w-lg">
                <Info className="w-6 h-6 flex-shrink-0 text-cyan-400" />
                <div className="flex flex-col gap-2">
                    <p className="font-semibold text-white/80">How to tune your Kalimba:</p>
                    <ul className="list-disc pl-4 flex flex-col gap-1">
                        <li>Place your device close to your Kalimba in a quiet room.</li>
                        <li>Strike each tine firmly. The tuner will detect the note automatically.</li>
                        <li>If the needle is to the <b>right (Sharp)</b>, move the tine slightly <b>up</b>.</li>
                        <li>If the needle is to the <b>left (Flat)</b>, move the tine slightly <b>down</b>.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
