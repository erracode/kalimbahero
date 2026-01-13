// ============================================
// Kalimba Hero - 3D Kalimba Component
// ============================================
import { useRef, useState, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import { Html } from "@react-three/drei"
import * as THREE from "three"
import {
  getKalimbaConfig,
  getKeyColor,
  getKeyDisplayLabel,
  getLaneXPosition,
} from "@/utils/frequencyMap"
import { HARDWARE_PRESETS } from "@/utils/hardwarePresets"
import { useGameStore } from "@/stores/gameStore"
import type { DetectedPitch, KalimbaKey } from "@/types/game"

interface Kalimba3DProps {
  activeKeyIndices?: number[]
  position?: [number, number, number]
  rotation?: [number, number, number]
  currentPitch?: DetectedPitch | null
  showNumbers?: boolean
  onTineClick?: (index: number) => void
}

// Calculate tine length - center (index 10) is LONGEST, decreases towards edges
// Calculate tine length - center is LONGEST, decreases towards edges
const getTineLength = (keyIndex: number, totalTines: number): number => {
  const center = Math.floor(totalTines / 2)
  const distanceFromCenter = Math.abs(keyIndex - center)
  const maxLength = 6.0
  const minLength = 2.0
  // Scale based on distance from center relative to total tines
  return maxLength - (distanceFromCenter * (maxLength - minLength)) / Math.max(center, 1)
}

// Individual tine component
const Tine = ({
  tineKey,
  totalTines,
  isActive,
  showLabel = true,
  onClick,
}: {
  tineKey: KalimbaKey
  totalTines: number
  isActive: boolean
  showLabel?: boolean
  onClick?: () => void
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)

  const length = getTineLength(tineKey.index, totalTines)
  const baseColor = getKeyColor(tineKey.index, totalTines)
  const label = getKeyDisplayLabel(tineKey)
  const xPosition = getLaneXPosition(tineKey.index, totalTines, 0.75, 0.15)
  const isCenterKey = tineKey.index === Math.floor(totalTines / 2)

  // Animation logic
  useFrame((state) => {
    if (groupRef.current) {
      // Rotation vibration when active
      if (isActive) {
        const time = state.clock.elapsedTime * 40
        groupRef.current.rotation.x = Math.sin(time) * 0.005
      } else {
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.1)
      }

      if (meshRef.current) {
        const material = meshRef.current.material as THREE.MeshStandardMaterial
        // Highlight if active or hovered
        const targetIntensity = isActive ? 0.8 : hovered ? 0.3 : 0.1
        material.emissiveIntensity = THREE.MathUtils.lerp(
          material.emissiveIntensity,
          targetIntensity,
          0.1
        )
      }
    }
  })

  return (
    <group
      position={[xPosition, 0.12, 0]}
      ref={groupRef}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
    >
      {/* Tine Body (The actual metal key) */}
      <mesh ref={meshRef} position={[0, 0, length / 2]} castShadow>
        <boxGeometry args={[0.5, 0.08, length]} />
        <meshStandardMaterial
          color={hovered ? "#EEEEEE" : "#CCCCCC"}
          metalness={0.9}
          roughness={0.1}
          emissive={baseColor}
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Glow highlight on top of the tine */}
      {(isActive || hovered) && (
        <mesh position={[0, 0.05, length / 2]}>
          <boxGeometry args={[0.52, 0.02, length]} />
          <meshBasicMaterial color={baseColor} transparent opacity={isActive ? 0.4 : 0.2} />
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

const KalimbaBody = ({ tinesCount }: { tinesCount: number }) => {
  // Scale body width based on tines
  const bodyWidth = Math.max(10, tinesCount * 0.9)

  return (
    <group position={[0, -0.4, 3.5]}>
      {/* Wooden Body */}
      <mesh receiveShadow castShadow>
        <boxGeometry args={[bodyWidth, 1, 9]} />
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
        <boxGeometry args={[bodyWidth - 0.5, 0.15, 0.1]} />
        <meshStandardMaterial color="#888" metalness={0.8} />
      </mesh>

      {/* Pressure Bar (The one that holds the tines down) */}
      <mesh position={[0, 0.7, -2.5]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, bodyWidth - 0.5, 12]} />
        <meshStandardMaterial color="#666" metalness={1} />
      </mesh>
    </group>
  )
}

export const Kalimba3D = ({
  activeKeyIndices = [],
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  showNumbers = true,
  onTineClick,
}: Kalimba3DProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const { settings } = useGameStore()

  // Calculate keys dynamically based on settings
  const kalimbaKeys = useMemo(() => {
    const preset = HARDWARE_PRESETS[settings.hardwarePresetId] || HARDWARE_PRESETS['17']
    return getKalimbaConfig(preset.tinesCount, settings.userTuning)
  }, [settings.hardwarePresetId, settings.userTuning])

  // Ensure activeKeyIndices is always an array (defensive)
  const safeActiveKeys = Array.isArray(activeKeyIndices) ? activeKeyIndices : []

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <KalimbaBody tinesCount={kalimbaKeys.length} />
      {/* All tines based on current config */}
      {kalimbaKeys.map((k, index) => (
        <Tine
          key={`tine-${k.index}`}
          tineKey={k}
          totalTines={kalimbaKeys.length}
          isActive={safeActiveKeys.includes(index)}
          showLabel={showNumbers}
          onClick={() => onTineClick?.(index)}
        />
      ))}
    </group>
  )
}
