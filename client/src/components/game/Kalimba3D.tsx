// ============================================
// Kalimba Hero - 3D Kalimba Component
// ============================================
import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { Html } from "@react-three/drei"
import * as THREE from "three"
import {
  KALIMBA_KEYS,
  getKeyColor,
  getKeyDisplayLabel,
  getLaneXPosition,
} from "@/utils/frequencyMap"
import type { DetectedPitch } from "@/types/game"

interface Kalimba3DProps {
  activeKeyIndices?: number[]
  position?: [number, number, number]
  currentPitch?: DetectedPitch | null
  showNumbers?: boolean
}

// Calculate tine length - center (index 10) is LONGEST, decreases towards edges
// Forms inverted V shape like a real kalimba (center longest, edges shortest)
// Each tine has different length, labels are at the end of each tine
// Triangle: base at hit line (Z=0), point towards labels (further Z)
const getTineLength = (keyIndex: number): number => {
  const center = 10 // F 4° is at index 10
  const distanceFromCenter = Math.abs(keyIndex - center)
  // Center tine is longest, edges are shortest - creates inverted V (triangle) shape
  // Center extends furthest forward (towards labels), edges are shorter
  const maxLength = 6.0 // Center tine is longest - extends furthest forward
  const minLength = 1.5 // Edge tines are shortest - less forward
  // Center is longest, edges are shortest - creates clear inverted V (triangle) shape
  return maxLength - (distanceFromCenter * (maxLength - minLength)) / center
}

// Individual tine component - hangs DOWN from top
const Tine = ({
  keyIndex,
  isActive,
  showLabel = true,
}: {
  keyIndex: number
  isActive: boolean
  showLabel?: boolean
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  const length = getTineLength(keyIndex)
  const baseColor = getKeyColor(keyIndex)
  const label = getKeyDisplayLabel(keyIndex)
  // Use same lane width and gap as lanes in the scene (0.75, 0.15)
  const xPosition = getLaneXPosition(keyIndex, 0.75, 0.15)

  // Center key (F/4° at position 10) is special
  const isCenterKey = keyIndex === 10

  useFrame((state) => {
    if (meshRef.current && glowRef.current) {
      const targetEmissive = isActive ? 0.8 : 0.15
      const material = meshRef.current.material as THREE.MeshStandardMaterial
      material.emissiveIntensity = THREE.MathUtils.lerp(
        material.emissiveIntensity,
        targetEmissive,
        0.15
      )

      // Pulsing glow when active
      if (isActive) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 8) * 0.12
        glowRef.current.scale.set(pulse, 1, pulse)
      } else {
        glowRef.current.scale.set(1, 1, 1)
      }
    }
  })

  // Tine extends forward in Z direction ONLY (positive Z), starting exactly at the white bar (Z=0)
  // Position: X from getLaneXPosition, Y=0 (same as lanes), Z starts at 0 and extends forward ONLY
  // The planeGeometry's second arg is the length along Z axis - it extends from 0 to length
  return (
    <group position={[xPosition, 0, 0]}>
      {/* Glow effect behind tine - same orientation as lanes, extends forward only */}
      <mesh
        ref={glowRef}
        position={[0, 0, length / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[0.7, length]} />
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={isActive ? 0.7 : 0.12}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Main tine body - flat plane like lanes, extending from Z=0 to Z=length (forward only, no backward) */}
      <mesh
        ref={meshRef}
        position={[0, 0, length / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[0.65, length]} />
        <meshStandardMaterial
          color={baseColor}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          emissive={baseColor}
          emissiveIntensity={0.2}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* HTML Labels at the END of each tine - positioned ABOVE the tines (higher Y) at Z=length */}
      {showLabel && (
        <Html
          position={[0, 0.15, length]}
          center
          scale={0.5}
          style={{
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
              fontFamily: "Arial, sans-serif",
              fontWeight: "bold",
              textShadow: "0 0 4px rgba(0,0,0,1), 0 0 8px rgba(0,0,0,0.9)",
              whiteSpace: "nowrap",
            }}
          >
            {/* Scale degree on top */}
            <span
              style={{
                color: isCenterKey ? "#FF6B6B" : "#fff",
                fontSize: "14px",
                lineHeight: 1,
                fontWeight: 700,
              }}
            >
              {label.degree}
            </span>
            {/* Note letter below */}
            <span
              style={{
                color: "#fff",
                fontSize: "16px",
                lineHeight: 1,
                fontWeight: 700,
              }}
            >
              {label.note}
            </span>
          </div>
        </Html>
      )}

      {/* Active indicator - point light when playing */}
      {isActive && (
        <pointLight
          position={[0, 0.2, length / 2]}
          color={baseColor}
          intensity={2}
          distance={2}
        />
      )}
    </group>
  )
}

export const Kalimba3D = ({
  activeKeyIndices = [],
  position = [0, 0, 0],
  showNumbers = true,
}: Kalimba3DProps) => {
  const groupRef = useRef<THREE.Group>(null)

  // Ensure activeKeyIndices is always an array (defensive)
  const safeActiveKeys = Array.isArray(activeKeyIndices) ? activeKeyIndices : []

  return (
    <group ref={groupRef} position={position}>
      {/* All 21 tines - starting exactly at the white bar, extending forward in Z */}
      {KALIMBA_KEYS.map((_, index) => (
        <Tine
          key={`tine-${index}`}
          keyIndex={index}
          isActive={safeActiveKeys.includes(index)}
          showLabel={showNumbers}
        />
      ))}
    </group>
  )
}
