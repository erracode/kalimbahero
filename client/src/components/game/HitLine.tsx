// ============================================
// Kalimba Hero - Hit Line Component
// ============================================
// Bright white horizontal line marking the hit zone

import { useMemo } from 'react';
import * as THREE from 'three';
import { getLaneXPosition, TOTAL_LANES } from '@/utils/frequencyMap';

interface HitLineProps {
  z: number;
  laneWidth?: number;
}

export const HitLine: React.FC<HitLineProps> = ({ z, laneWidth = 0.75 }) => {
  // Calculate total width of all lanes (matching the lane span exactly)
  const totalWidth = useMemo(() => {
    const leftmostX = getLaneXPosition(0);
    const rightmostX = getLaneXPosition(TOTAL_LANES - 1);
    return (rightmostX - leftmostX) + laneWidth;
  }, [laneWidth]);

  return (
    <group position={[0, 0.15, z]}>
      {/* Outer glow - wide and soft */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[totalWidth, 0.8]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Middle glow layer */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[totalWidth, 0.4]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Inner bright glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[totalWidth, 0.15]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Main bright white hit line - solid core */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <boxGeometry args={[totalWidth, 0.05, 0.08]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={3}
        />
      </mesh>
      
      {/* Point lights for extra glow effect */}
      <pointLight position={[0, 0.2, 0]} color="#ffffff" intensity={0.8} distance={3} />
    </group>
  );
};

export default HitLine;

