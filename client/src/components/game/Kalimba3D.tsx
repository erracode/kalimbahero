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

// Individual tine component
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
  const groupRef = useRef<THREE.Group>(null)

  const length = getTineLength(keyIndex)
  const baseColor = getKeyColor(keyIndex)
  const label = getKeyDisplayLabel(keyIndex)
  const xPosition = getLaneXPosition(keyIndex, 0.75, 0.15)
  const isCenterKey = keyIndex === 10

  useFrame((state) => {
    if (groupRef.current) {
      // Rotation vibration when active
      if (isActive) {
        const time = state.clock.elapsedTime * 40
        groupRef.current.rotation.x = Math.sin(time) * 0.05
      } else {
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.1)
      }

      if (meshRef.current) {
        const material = meshRef.current.material as THREE.MeshStandardMaterial
        const targetIntensity = isActive ? 0.8 : 0.1
        material.emissiveIntensity = THREE.MathUtils.lerp(
          material.emissiveIntensity,
          targetIntensity,
          0.1
        )
      }
    }
  })

  return (
    <group position={[xPosition, 0.12, 0]} ref={groupRef}>
      {/* Tine Body (The actual metal key) */}
      <mesh ref={meshRef} position={[0, 0, length / 2]} castShadow>
        <boxGeometry args={[0.5, 0.08, length]} />
        <meshStandardMaterial
          color="#CCCCCC"
          metalness={0.9}
          roughness={0.1}
          emissive={baseColor}
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Glow highlight on top of the tine */}
      {isActive && (
        <mesh position={[0, 0.05, length / 2]}>
          <boxGeometry args={[0.52, 0.02, length]} />
          <meshBasicMaterial color={baseColor} transparent opacity={0.4} />
        </mesh>
      )}

      {/* Label at the end */}
      {showLabel && (
        <Html
          position={[0, 0.2, length * 0.9]}
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
              fontFamily: "Outfit, sans-serif",
              fontWeight: "bold",
              textShadow: "0 0 10px rgba(0,0,0,0.8)",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: isCenterKey ? "#FF6B6B" : "#fff", fontSize: "14px", opacity: 0.9 }}>
              {label.degree}
            </span>
            <span style={{ color: "#fff", fontSize: "12px", opacity: 0.7 }}>
              {label.note}
            </span>
          </div>
        </Html>
      )}
    </group>
  )
}

const KalimbaBody = () => {
  return (
    <group position={[0, -0.4, 3.5]}>
      {/* Wooden Body */}
      <mesh receiveShadow castShadow>
        <boxGeometry args={[18, 1, 9]} />
        <meshStandardMaterial
          color="#3d2b1f"
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* Sound Hole */}
      <mesh position={[0, 0.51, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 32]} />
        <meshBasicMaterial color="#111" />
      </mesh>

      {/* Top Bridge Bar (Metal) */}
      <mesh position={[0, 0.55, -3.5]}>
        <boxGeometry args={[17.5, 0.15, 0.1]} />
        <meshStandardMaterial color="#888" metalness={0.8} />
      </mesh>

      {/* Pressure Bar (The one that holds the tines down) */}
      <mesh position={[0, 0.7, -2.5]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 17.5, 12]} />
        <meshStandardMaterial color="#666" metalness={1} />
      </mesh>
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
      <KalimbaBody />
      {/* All 21 tines */}
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
