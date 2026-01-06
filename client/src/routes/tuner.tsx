import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { TunerUI } from '@/components/ui/TunerUI';
import { AuroraBackground } from '@/components/ui/AuroraBackground';
import { NeonButton } from '@/components/ui/NeonButton';
import { ArrowLeft } from 'lucide-react';

export const Route = createFileRoute('/tuner')({
  component: TunerPageRoute,
});

function TunerPageRoute() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050510]">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <AuroraBackground
          speed={0.4}
          intensity={0.6}
          vibrancy={0.7}
          frequency={0.8}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 px-8 py-6 flex items-center justify-between">
        <NeonButton
          variant="cyan"
          size="sm"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate({ to: '/' })}
        >
          Main Menu
        </NeonButton>
        <div className="text-right">
          <h1 className="text-2xl font-black text-white tracking-widest italic uppercase">Tuner</h1>
          <p className="text-[10px] text-cyan-400 font-bold tracking-[0.3em] uppercase">Calibration Suite</p>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 container mx-auto px-4 py-12 flex flex-col items-center">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black text-white mb-2 underline decoration-cyan-500/50 decoration-4 underline-offset-8">
            Precision Tuning
          </h2>
          <p className="text-white/40 max-w-md mx-auto">
            Ensure your Kalimba is in perfect harmony for the best gaming experience and recording accuracy.
          </p>
        </div>

        <TunerUI />
      </main>

      {/* Footer Decoration */}
      <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cyan-500/5 to-transparent pointer-events-none z-0" />
    </div>
  );
}
