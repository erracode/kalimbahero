import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { TunerUI } from '@/components/ui/TunerUI';
import { AuroraBackground } from '@/components/ui/AuroraBackground';
import { NeonButton } from '@/components/ui/NeonButton';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { ReferenceChart } from '@/components/ui/ReferenceChart';

export const Route = createFileRoute('/tuner')({
  component: TunerPageRoute,
});

function TunerPageRoute() {
  const navigate = useNavigate();
  const [isChartOpen, setIsChartOpen] = useState(false);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#050510] flex flex-col">
      <ReferenceChart isOpen={isChartOpen} onOpenChange={setIsChartOpen} />

      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <AuroraBackground
          speed={0.4}
          intensity={0.6}
          vibrancy={0.7}
          frequency={0.8}
        />
      </div>

      {/* Minimal Header */}
      <header className="relative z-20 px-6 py-4 flex items-center justify-between shrink-0">
        <NeonButton
          variant="cyan"
          size="sm"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate({ to: '/' })}
        >
          Back
        </NeonButton>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsChartOpen(true)}
            className="group relative h-10 flex items-center px-6 overflow-hidden transition-all duration-200 bg-black/40 border border-white/10 hover:border-white/40 rounded-none skew-x-[-12deg] cursor-pointer"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-cyan-900/80 to-transparent" />
            <div className="relative z-10 flex items-center gap-2 skew-x-[12deg]">
              <BookOpen className="w-4 h-4 text-white/70 group-hover:text-cyan-400 transition-colors" />
              <span className="text-xs font-black italic tracking-widest text-white/70 group-hover:text-white transition-colors uppercase">CHART</span>
            </div>
          </button>
        </div>
      </header>

      {/* Main Content Area - Full height, no scroll */}
      <main className="relative z-10 flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col relative w-full h-full">
          <TunerUI />
        </div>
      </main>
    </div>
  );
}
