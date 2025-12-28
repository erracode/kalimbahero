// ============================================
// Kalimba Hero - 3D Kalimba Component
// ============================================
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { KALIMBA_KEYS, getKeyColor, getTineHeight, getKeyDisplayLabel } from '@/utils/frequencyMap';
import type { DetectedPitch } from '@/types/game';

interface Kalimba3DProps {
  activeKeyIndices?: number[];
  position?: [number, number, number];
  currentPitch?: DetectedPitch | null;
  showNumbers?: boolean;
}

// Individual tine component
const Tine = ({ 
  keyIndex, 
  isActive,
  xPosition,
  showLabel = true
}: { 
  keyIndex: number; 
  isActive: boolean;
  xPosition: number;
  showLabel?: boolean;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  const key = KALIMBA_KEYS[keyIndex];
  const height = getTineHeight(key.physicalPosition);
  const baseColor = getKeyColor(keyIndex);
  const label = getKeyDisplayLabel(keyIndex);
  
  // Center key (F/4° at position 10) is special
  const isCenterKey = keyIndex === 10;
  
  useFrame((state) => {
    if (meshRef.current && glowRef.current) {
      const targetEmissive = isActive ? 0.8 : 0.1;
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = THREE.MathUtils.lerp(
        material.emissiveIntensity,
        targetEmissive,
        0.15
      );
      
      // Pulsing glow when active
      if (isActive) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 8) * 0.1;
        glowRef.current.scale.set(pulse, 1, pulse);
      } else {
        glowRef.current.scale.set(1, 1, 1);
      }
    }
  });
  
  return (
    <group position={[xPosition, height / 2, 0]}>
      {/* Glow effect behind tine */}
      <mesh ref={glowRef} position={[0, 0, -0.03]}>
        <boxGeometry args={[0.7, height, 0.02]} />
        <meshBasicMaterial 
          color={baseColor} 
          transparent 
          opacity={isActive ? 0.5 : 0.08}
        />
      </mesh>
      
      {/* Main tine body */}
      <RoundedBox
        ref={meshRef}
        args={[0.65, height, 0.08]}
        radius={0.02}
        smoothness={4}
      >
        <meshStandardMaterial
          color={isCenterKey ? '#1a1a2e' : baseColor}
          emissive={baseColor}
          emissiveIntensity={0.1}
          metalness={0.7}
          roughness={0.3}
        />
      </RoundedBox>
      
      {/* HTML Labels - guaranteed to render */}
      {showLabel && (
        <Html
          position={[0, -height / 2 + 0.3, 0.1]}
          center
          distanceFactor={8}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div 
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              fontFamily: 'Arial, sans-serif',
              fontWeight: 'bold',
              textShadow: '0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)',
            }}
          >
            {/* Note letter */}
            <span style={{ 
              color: '#fff', 
              fontSize: '14px',
              lineHeight: 1,
            }}>
              {label.note}
            </span>
            {/* Scale degree */}
            <span style={{ 
              color: isCenterKey ? '#FF6B6B' : baseColor, 
              fontSize: '12px',
              lineHeight: 1,
            }}>
              {label.degree}
            </span>
          </div>
        </Html>
      )}
      
      {/* Active indicator - point light when playing */}
      {isActive && (
        <pointLight
          position={[0, 0, 0.15]}
          color={baseColor}
          intensity={2}
          distance={1.5}
        />
      )}
    </group>
  );
};

export const Kalimba3D = ({ 
  activeKeyIndices = [], 
  position = [0, -1.5, 8],
  showNumbers = true
}: Kalimba3DProps) => {
  const groupRef = useRef<THREE.Group>(null);
  
  const tineWidth = 0.75;
  const totalWidth = tineWidth * 21;
  const startX = -totalWidth / 2 + tineWidth / 2;
  
  // Ensure activeKeyIndices is always an array (defensive)
  const safeActiveKeys = Array.isArray(activeKeyIndices) ? activeKeyIndices : [];
  
  return (
    <group ref={groupRef} position={position}>
      {/* Kalimba body base */}
      <RoundedBox
        args={[totalWidth + 1, 0.4, 1.5]}
        position={[0, -0.2, 0.5]}
        radius={0.1}
        smoothness={4}
      >
        <meshStandardMaterial
          color="#0a0a1a"
          metalness={0.3}
          roughness={0.7}
        />
      </RoundedBox>
      
      {/* Sound hole */}
      <mesh position={[0, -0.15, 1]}>
        <circleGeometry args={[1.2, 32]} />
        <meshStandardMaterial
          color="#050510"
          metalness={0.1}
          roughness={0.9}
        />
      </mesh>
      
      {/* Decorative ring around sound hole */}
      <mesh position={[0, -0.15, 0.99]}>
        <ringGeometry args={[1.15, 1.3, 32]} />
        <meshStandardMaterial
          color="#00E5FF"
          emissive="#00E5FF"
          emissiveIntensity={0.3}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Tine holder bar */}
      <RoundedBox
        args={[totalWidth + 0.5, 0.15, 0.3]}
        position={[0, 0, -0.1]}
        radius={0.03}
        smoothness={4}
      >
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.6}
          roughness={0.4}
        />
      </RoundedBox>
      
      {/* All 21 tines */}
      {KALIMBA_KEYS.map((_, index) => (
        <Tine
          key={`tine-${index}`}
          keyIndex={index}
          isActive={safeActiveKeys.includes(index)}
          xPosition={startX + index * tineWidth}
          showLabel={showNumbers}
        />
      ))}
    </group>
  );
};
