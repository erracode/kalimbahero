import React from 'react';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { NeonButton } from './NeonButton';
import { cn } from '@/lib/utils';

interface ReferenceChartProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

const OCTAVES = [
    {
        name: 'Basics (Octave 4)',
        rows: [
            { note: 'C', num: '1', pitch: 'C4', hz: '261.63' },
            { note: 'C# / Db', num: '1#', pitch: 'C#4', hz: '277.18' },
            { note: 'D', num: '2', pitch: 'D4', hz: '293.66' },
            { note: 'D# / Eb', num: '2#', pitch: 'D#4', hz: '311.13' },
            { note: 'E', num: '3', pitch: 'E4', hz: '329.63' },
            { note: 'F', num: '4', pitch: 'F4', hz: '349.23' },
            { note: 'F# / Gb', num: '4#', pitch: 'F#4', hz: '369.99' },
            { note: 'G', num: '5', pitch: 'G4', hz: '392.00' },
            { note: 'G# / Ab', num: '5#', pitch: 'G#4', hz: '415.30' },
            { note: 'A', num: '6', pitch: 'A4', hz: '440.00' },
            { note: 'A# / Bb', num: '6#', pitch: 'A#4', hz: '466.16' },
            { note: 'B', num: '7', pitch: 'B4', hz: '493.88' },
        ]
    },
    {
        name: 'Octave 5',
        rows: [
            { note: "C'", num: "1'", pitch: 'C5', hz: '523.25' },
            { note: "C#' / Db'", num: "1#'", pitch: 'C#5', hz: '554.37' },
            { note: "D'", num: "2'", pitch: 'D5', hz: '587.33' },
            { note: "D#' / Eb'", num: "2#'", pitch: 'D#5', hz: '622.25' },
            { note: "E'", num: "3'", pitch: 'E5', hz: '659.25' },
            { note: "F'", num: "4'", pitch: 'F5', hz: '698.46' },
            { note: "F#' / Gb'", num: "4#'", pitch: 'F#5', hz: '739.99' },
            { note: "G'", num: "5'", pitch: 'G5', hz: '783.99' },
            { note: "G#' / Ab'", num: "5#'", pitch: 'G#5', hz: '830.61' },
            { note: "A'", num: "6'", pitch: 'A5', hz: '880.00' },
            { note: "A#' / Bb'", num: "6#'", pitch: 'A#5', hz: '932.33' },
            { note: "B'", num: "7'", pitch: 'B5', hz: '987.77' },
        ]
    },
    {
        name: 'Octave 6',
        rows: [
            { note: "C''", num: "1''", pitch: 'C6', hz: '1046.50' },
            { note: "D''", num: "2''", pitch: 'D6', hz: '1174.66' },
            { note: "E''", num: "3''", pitch: 'E6', hz: '1318.51' },
            { note: "F''", num: "4''", pitch: 'F6', hz: '1396.91' },
            { note: "F#' / Gb''", num: "4#'", pitch: 'F#6', hz: '1479.98' },
            { note: "G''", num: "5''", pitch: 'G6', hz: '1567.98' },
            { note: "A''", num: "6''", pitch: 'A6', hz: '1760.00' },
            { note: "B''", num: "7''", pitch: 'B6', hz: '1975.53' },
        ]
    },
    {
        name: 'Octave 7',
        rows: [
            { note: "C'''", num: "1'''", pitch: 'C7', hz: '2093.00' },
        ]
    }
];

export const ReferenceChart: React.FC<ReferenceChartProps> = ({ isOpen, onOpenChange }) => {
    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="bg-black/60 backdrop-blur-xl border-l border-white/10 text-white w-full sm:max-w-md p-0 flex flex-col rounded-none shadow-2xl">
                <SheetHeader className="p-8 border-b border-white/10 shrink-0">
                    <SheetTitle className="text-2xl font-black italic tracking-tighter text-white uppercase">PITCH <span className="text-cyan-400">NOTATION</span></SheetTitle>
                    <SheetDescription className="text-white/40 font-bold tracking-[0.3em] uppercase text-[10px] mt-1">
                        Standard Kalimba Tuning Reference
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                    {OCTAVES.map((octave) => (
                        <div key={octave.name} className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-white/10" />
                                <h3 className="text-xs font-black italic uppercase tracking-widest text-cyan-400/60 whitespace-nowrap">
                                    {octave.name}
                                </h3>
                                <div className="h-px flex-1 bg-white/10" />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                {/* Header Row */}
                                <div className="grid grid-cols-4 text-[10px] font-black italic text-white/20 uppercase tracking-[0.2em] mb-2 px-4">
                                    <div>Note</div>
                                    <div>Num</div>
                                    <div>Pitch</div>
                                    <div className="text-right">Hz</div>
                                </div>

                                {/* Data Rows */}
                                {octave.rows.map((row) => (
                                    <div
                                        key={row.hz}
                                        className="group grid grid-cols-4 items-center px-4 py-3 rounded-none bg-white/[0.03] border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all cursor-default"
                                    >
                                        <div className="font-black italic text-white group-hover:text-cyan-400 transition-colors">{row.note}</div>
                                        <div className="font-mono text-white/40 text-xs">{row.num}</div>
                                        <div className="font-mono text-cyan-400/60 text-xs group-hover:text-cyan-400 transition-colors">{row.pitch}</div>
                                        <div className="text-right font-mono text-white/20 text-[10px]">{row.hz}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <SheetFooter className="p-8 border-t border-white/10 shrink-0 mt-0 bg-black/40">
                    <SheetClose asChild>
                        <NeonButton
                            variant="cyan"
                            fullWidth
                            className="h-14 text-lg font-black italic tracking-widest uppercase shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                        >
                            CLOSE CHART
                        </NeonButton>
                    </SheetClose>
                </SheetFooter>
            </SheetContent>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.05);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255,255,255,0.1);
                }
            `}</style>
        </Sheet>
    );
};
