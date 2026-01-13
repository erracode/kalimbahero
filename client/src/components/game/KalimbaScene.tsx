// ============================================
// Kalimba Hero - Main 3D Scene
// ============================================
// Complete game scene with lanes, notes, and kalimba

import { Suspense, useMemo } from "react"
import { Canvas } from "@react-three/fiber"
import { PerspectiveCamera } from "@react-three/drei"
import { EffectComposer, Bloom } from "@react-three/postprocessing"
import * as THREE from "three"
import { NoteLane } from "./NoteLane"
import { NoteSystem } from "./NoteSystem"
import { Kalimba3D } from "./Kalimba3D"
import { HitLine } from "./HitLine"
import { generateLaneConfigs } from "@/utils/frequencyMap"
import type { SongNote, DetectedPitch } from "@/types/game"
import { useGameStore } from "@/stores/gameStore"

interface KalimbaSceneProps {
  notes?: SongNote[]
  progress?: number
  currentPitch?: DetectedPitch | null
  isPlaying?: boolean
}

// Scene content component (inside Canvas)
const SceneContent: React.FC<KalimbaSceneProps> = ({
  notes = [],
  progress = 0,
}) => {
  const settings = useGameStore((state) => state.settings)
  const activeNotes = useGameStore((state) => state.activeNotes)

  // Get total lanes from hardware preset
  const totalLanes = parseInt(settings.hardwarePresetId) || 17

  // Generate lane configurations - lanes are 25 units long
  const laneLength = 25
  const laneConfigs = useMemo(
    () => generateLaneConfigs(totalLanes),
    [totalLanes]
  )

  // Hit zone Z position - exactly at the front end of lanes where notes reach the kalimba
  // Lane centers are at Z = -laneLength/2, so front edge is at Z = 0
  const hitZoneZ = 0

  // Get active lane indices from active notes
  const activeLaneIndices = useMemo(() => {
    return new Set(activeNotes.map((note) => note.keyIndex))
  }, [activeNotes])

  return (
    <>
      {/* Camera - positioned to show full kalimba and lanes */}
      <PerspectiveCamera
        makeDefault
        position={[0, 10, 14]}
        rotation={[-0.42, 0, 0]}
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

      {/* Ground plane - transparent to show Aurora background */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.1, 0]}
        receiveShadow
      >
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial
          transparent
          opacity={0}
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

      {/* Hit line - bright white line marking the hit zone */}
      <HitLine z={hitZoneZ} />

      {/* Notes */}
      <NoteSystem
        notes={notes}
        progress={progress}
        noteSpeed={settings.noteSpeed}
        laneLength={laneLength}
        hitZoneZ={hitZoneZ}
      />

      {/* Kalimba tines - starting exactly at the hit line, extending forward */}
      <Kalimba3D
        position={[0, 0, hitZoneZ]}
        activeKeyIndices={Array.from(activeLaneIndices)}
        showNumbers={settings.showNotation}
      />

      {/* Post-processing effects */}
      <EffectComposer>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur={false}
        />
      </EffectComposer>
    </>
  )
}

// Loading fallback
const LoadingFallback = () => (
  <mesh>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="#333" />
  </mesh>
)

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
          alpha: true, // Enable transparency
          premultipliedAlpha: false, // Better transparency handling
        }}
        style={{ background: "transparent" }}
        onCreated={({ gl }) => {
          gl.setClearColor("#000000", 0) // Transparent clear color
        }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <SceneContent {...props} />
        </Suspense>
      </Canvas>
    </div>
  )
}

export default KalimbaScene
