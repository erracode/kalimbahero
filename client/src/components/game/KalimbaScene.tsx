// ============================================
// Kalimba Hero - Main 3D Scene
// ============================================
// Complete game scene with lanes, notes, and kalimba

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  PerspectiveCamera,
  Stars,
} from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { NoteLane } from './NoteLane';
import { NoteSystem } from './NoteSystem';
import { Kalimba3D } from './Kalimba3D';
import { generateLaneConfigs } from '@/utils/frequencyMap';
import type { SongNote, DetectedPitch } from '@/types/game';
import { useGameStore } from '@/stores/gameStore';

interface KalimbaSceneProps {
  notes?: SongNote[];
  progress?: number;
  currentPitch?: DetectedPitch | null;
  isPlaying?: boolean;
}

// Scene content component (inside Canvas)
const SceneContent: React.FC<KalimbaSceneProps> = ({
  notes = [],
  progress = 0,
  currentPitch,
}) => {
  const settings = useGameStore(state => state.settings);
  const activeNotes = useGameStore(state => state.activeNotes);
  
  // Generate lane configurations
  const laneConfigs = useMemo(() => generateLaneConfigs(0.75, 0.15, 25), []);
  
  // Get active lane indices from active notes
  const activeLaneIndices = useMemo(() => {
    return new Set(activeNotes.map(note => note.keyIndex));
  }, [activeNotes]);

  return (
    <>
      {/* Camera */}
      <PerspectiveCamera
        makeDefault
        position={[0, 8, 18]}
        rotation={[-0.35, 0, 0]}
        fov={60}
      />
      
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#00E5FF" />
      <pointLight position={[-10, 5, 5]} intensity={0.3} color="#FF6B6B" />
      <pointLight position={[10, 5, 5]} intensity={0.3} color="#6BCB77" />
      
      {/* Environment */}
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />
      
      {/* Ground plane with gradient */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial
          color="#0a0a12"
          metalness={0.8}
          roughness={0.4}
        />
      </mesh>
      
      {/* Lanes */}
      <group position={[0, 0, 0]}>
        {laneConfigs.map((config) => (
          <NoteLane
            key={config.index}
            index={config.index}
            position={config.position}
            isActive={activeLaneIndices.has(config.index)}
            showNumber={settings.showLaneNumbers}
          />
        ))}
      </group>
      
      {/* Notes */}
      <NoteSystem
        notes={notes}
        progress={progress}
        noteSpeed={settings.noteSpeed}
        laneLength={25}
      />
      
      {/* Kalimba at hit zone */}
      <Kalimba3D
        position={[0, 0, 12]}
        currentPitch={currentPitch}
        activeKeyIndices={Array.from(activeLaneIndices)}
        showNumbers={settings.showNotation}
      />
      
      {/* Post-processing effects */}
      <EffectComposer>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
};

// Loading fallback
const LoadingFallback = () => (
  <mesh>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="#333" />
  </mesh>
);

// Main exported component
export const KalimbaScene: React.FC<KalimbaSceneProps> = (props) => {
  return (
    <div className="w-full h-full absolute inset-0">
      <Canvas
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <SceneContent {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default KalimbaScene;

