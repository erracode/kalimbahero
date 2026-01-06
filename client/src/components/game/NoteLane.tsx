// ============================================
// Kalimba Hero - Note Lane Component
// ============================================
// Individual lane for notes to fall through

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { LANE_COLORS } from "@/utils/frequencyMap"

interface NoteLaneProps {
  index: number
  position: [number, number, number]
  width?: number
  length?: number
  isActive?: boolean
  showNumber?: boolean
}

// Create a gradient texture for lane fade
const createGradientTexture = () => {
  const canvas = document.createElement("canvas")
  canvas.width = 1
  canvas.height = 256
  const ctx = canvas.getContext("2d")!

  // Gradient from transparent (far end) to opaque (near)
  const gradient = ctx.createLinearGradient(0, 0, 0, 256)
  gradient.addColorStop(0, "rgba(255,255,255,0)") // Far end - transparent
  gradient.addColorStop(0.3, "rgba(255,255,255,0.3)") // Start fading in
  gradient.addColorStop(1, "rgba(255,255,255,1)") // Near end - full opacity

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1, 256)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

export const NoteLane: React.FC<NoteLaneProps> = ({
  index,
  position,
  width = 0.75,
  length = 25,
  isActive = false,
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  const color = LANE_COLORS[index]
  const colorObj = useMemo(() => new THREE.Color(color), [color])

  // Create gradient texture for fade effect
  const alphaMap = useMemo(() => createGradientTexture(), [])

  // Animate glow when active
  useFrame((_, delta) => {
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial
      const targetOpacity = isActive ? 0.6 : 0.15
      material.opacity = THREE.MathUtils.lerp(
        material.opacity,
        targetOpacity,
        delta * 10
      )
    }
  })

  return (
    <group position={position}>
      {/* Lane track with gradient fade at far end */}
      <mesh ref={meshRef} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial
          color={colorObj}
          transparent
          opacity={0.35}
          alphaMap={alphaMap}
          metalness={0.8}
          roughness={0.2}
          side={THREE.DoubleSide}
          emissive={colorObj}
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Lane border lines - subtle edges */}
      <mesh position={[-width / 2, 0.01, 0]}>
        <boxGeometry args={[0.02, 0.02, length]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>
      <mesh position={[width / 2, 0.01, 0]}>
        <boxGeometry args={[0.02, 0.02, length]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>

      {/* Glow effect under active lane */}
      <mesh
        ref={glowRef}
        position={[0, -0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[width * 1.5, length]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15}
          alphaMap={alphaMap}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

export default NoteLane
