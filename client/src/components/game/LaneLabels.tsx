// ============================================
// Kalimba Hero - Lane Labels Component
// ============================================
// Shows note labels at the end of each lane in an inverted triangle pattern

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { Html, RoundedBox } from "@react-three/drei"
import * as THREE from "three"
import {
  KALIMBA_KEYS,
  getKeyColor,
  getKeyDisplayLabel,
  getLaneXPosition,
  TOTAL_LANES,
} from "@/utils/frequencyMap"

interface LaneLabelsProps {
  position?: [number, number, number]
  activeKeyIndices?: number[]
  showLabels?: boolean
}

// Calculate tine height for inverted triangle pattern
// Center key (index 10) is tallest, decreasing towards edges
const getTineHeight = (index: number): number => {
  const center = 10 // F 4° is at index 10
  const distanceFromCenter = Math.abs(index - center)
  const maxHeight = 2.0
  const minHeight = 0.8
  // Inverted triangle: tallest at center
  return maxHeight - (distanceFromCenter * (maxHeight - minHeight)) / center
}

// Individual label tine
const LabelTine = ({
  keyIndex,
  isActive,
}: {
  keyIndex: number
  isActive: boolean
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  const height = getTineHeight(keyIndex)
  const baseColor = getKeyColor(keyIndex)
  const label = getKeyDisplayLabel(keyIndex)
  const xPosition = getLaneXPosition(keyIndex)

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
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 8) * 0.15
        glowRef.current.scale.set(pulse, 1, pulse)
      } else {
        glowRef.current.scale.set(1, 1, 1)
      }
    }
  })

  return (
    <group position={[xPosition, height / 2, 0]}>
      {/* Glow effect behind tine */}
      <mesh ref={glowRef} position={[0, 0, -0.02]}>
        <boxGeometry args={[0.65, height, 0.01]} />
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={isActive ? 0.6 : 0.1}
        />
      </mesh>

      {/* Main tine body */}
      <RoundedBox
        ref={meshRef}
        args={[0.6, height, 0.06]}
        radius={0.02}
        smoothness={4}
      >
        <meshStandardMaterial
          color={isCenterKey ? "#1a1a2e" : baseColor}
          emissive={baseColor}
          emissiveIntensity={0.15}
          metalness={0.7}
          roughness={0.3}
        />
      </RoundedBox>

      {/* HTML Labels */}
      <Html
        position={[0, -height / 2 + 0.25, 0.1]}
        center
        distanceFactor={8}
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
            gap: "1px",
            fontFamily: "Arial, sans-serif",
            fontWeight: "bold",
            textShadow: "0 0 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.6)",
          }}
        >
          {/* Note letter */}
          <span
            style={{
              color: "#fff",
              fontSize: "12px",
              lineHeight: 1,
            }}
          >
            {label.note}
          </span>
          {/* Scale degree */}
          <span
            style={{
              color: isCenterKey ? "#FF6B6B" : baseColor,
              fontSize: "10px",
              lineHeight: 1,
            }}
          >
            {label.degree}
          </span>
        </div>
      </Html>

      {/* Active indicator - point light when playing */}
      {isActive && (
        <pointLight
          position={[0, 0, 0.1]}
          color={baseColor}
          intensity={1.5}
          distance={1}
        />
      )}
    </group>
  )
}

export const LaneLabels: React.FC<LaneLabelsProps> = ({
  position = [0, 0, 0],
  activeKeyIndices = [],
  showLabels = true,
}) => {
  // Ensure activeKeyIndices is always an array
  const safeActiveKeys = Array.isArray(activeKeyIndices) ? activeKeyIndices : []

  if (!showLabels) return null

  return (
    <group position={position}>
      {/* All 21 label tines */}
      {KALIMBA_KEYS.map((_, index) => (
        <LabelTine
          key={`label-${index}`}
          keyIndex={index}
          isActive={safeActiveKeys.includes(index)}
        />
      ))}
    </group>
  )
}

export default LaneLabels
