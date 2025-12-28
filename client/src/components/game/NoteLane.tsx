// ============================================
// Kalimba Hero - Note Lane Component
// ============================================
// Individual lane for notes to fall through

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LANE_COLORS } from '@/utils/frequencyMap';

interface NoteLaneProps {
  index: number;
  position: [number, number, number];
  width?: number;
  length?: number;
  isActive?: boolean;
  showNumber?: boolean;
}

export const NoteLane: React.FC<NoteLaneProps> = ({
  index,
  position,
  width = 0.75,
  length = 25,
  isActive = false,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const hitZoneRef = useRef<THREE.Mesh>(null);
  
  const color = LANE_COLORS[index];
  
  // Animate glow when active
  useFrame((_, delta) => {
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      const targetOpacity = isActive ? 0.6 : 0.15;
      material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, delta * 10);
    }
    
    if (hitZoneRef.current) {
      const material = hitZoneRef.current.material as THREE.MeshBasicMaterial;
      const targetOpacity = isActive ? 0.8 : 0.3;
      material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, delta * 10);
    }
  });
  
  // Create gradient texture for lane
  const laneTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Create gradient from transparent to visible
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.05)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  return (
    <group position={position}>
      {/* Lane track (subtle guide) */}
      <mesh ref={meshRef} position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, length]} />
        <meshBasicMaterial
          map={laneTexture}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Lane border lines */}
      <mesh position={[-width / 2, 0, 0]}>
        <boxGeometry args={[0.02, 0.02, length]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>
      <mesh position={[width / 2, 0, 0]}>
        <boxGeometry args={[0.02, 0.02, length]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>
      
      {/* Hit zone glow at bottom */}
      <mesh
        ref={hitZoneRef}
        position={[0, 0.01, length / 2 - 0.5]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[width, 1]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Hit zone line */}
      <mesh position={[0, 0.02, length / 2 - 0.5]}>
        <boxGeometry args={[width, 0.05, 0.1]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      
      {/* Glow effect under active lane */}
      <mesh
        ref={glowRef}
        position={[0, -0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[width * 1.5, length]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

export default NoteLane;






