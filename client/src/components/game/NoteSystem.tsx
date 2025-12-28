// ============================================
// Kalimba Hero - Note System (InstancedMesh)
// ============================================
// Renders falling notes using InstancedMesh for performance

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SongNote } from '@/types/game';
import { LANE_COLORS, getLaneXPosition } from '@/utils/frequencyMap';
import { useGameStore } from '@/stores/gameStore';

interface NoteSystemProps {
  notes: SongNote[];
  progress: number;
  noteSpeed?: number;
  laneLength?: number;
}

const MAX_NOTES = 200; // Maximum concurrent notes

// Create a rounded rectangle shape for note geometry
const createNoteGeometry = () => {
  const shape = new THREE.Shape();
  const width = 0.6;
  const height = 0.15;
  const radius = 0.07;
  
  shape.moveTo(-width / 2 + radius, -height / 2);
  shape.lineTo(width / 2 - radius, -height / 2);
  shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
  shape.lineTo(width / 2, height / 2 - radius);
  shape.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
  shape.lineTo(-width / 2 + radius, height / 2);
  shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
  shape.lineTo(-width / 2, -height / 2 + radius);
  shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);
  
  const extrudeSettings = {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 3,
  };
  
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
};

export const NoteSystem: React.FC<NoteSystemProps> = ({
  notes,
  progress,
  noteSpeed = 5,
  laneLength = 25,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const glowMeshRef = useRef<THREE.InstancedMesh>(null);
  const hitNotes = useGameStore(state => state.hitNotes);
  
  // Pre-create objects for matrix updates
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  
  // Create geometry
  const noteGeometry = useMemo(() => createNoteGeometry(), []);
  const glowGeometry = useMemo(() => new THREE.PlaneGeometry(0.8, 0.3), []);
  
  // Create materials
  const noteMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      metalness: 0.3,
      roughness: 0.4,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.5,
    });
  }, []);
  
  const glowMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, []);
  
  // Convert time to Z position
  const timeToZ = (noteTime: number, currentProgress: number): number => {
    // Notes start at back (negative Z) and move toward camera (positive Z)
    // The hit zone is at laneLength/2 - 0.5
    const hitZoneZ = laneLength / 2 - 0.5;
    const secondsPerUnit = 0.5 / noteSpeed; // How many seconds per unit of Z
    const timeDiff = noteTime - currentProgress;
    return hitZoneZ - (timeDiff / secondsPerUnit);
  };
  
  // Update note positions and visibility each frame
  useFrame(() => {
    if (!meshRef.current || !glowMeshRef.current) return;
    
    let visibleCount = 0;
    
    for (let i = 0; i < MAX_NOTES; i++) {
      if (i < notes.length) {
        const note = notes[i];
        const isHit = hitNotes.has(note.id);
        
        // Calculate Z position
        const z = timeToZ(note.time, progress);
        
        // Check if note is visible (within lane bounds)
        const isVisible = z > -laneLength / 2 && z < laneLength / 2 + 2 && !isHit;
        
        if (isVisible) {
          // Get X position for this lane
          const x = getLaneXPosition(note.keyIndex);
          const color = LANE_COLORS[note.keyIndex];
          
          // Update note transform
          tempObject.position.set(x, 0.15, z);
          tempObject.rotation.set(-Math.PI / 2, 0, 0);
          
          // Pulse effect as note approaches hit zone
          const hitZoneZ = laneLength / 2 - 0.5;
          const distToHitZone = Math.abs(z - hitZoneZ);
          const pulseScale = distToHitZone < 2 ? 1 + (1 - distToHitZone / 2) * 0.2 : 1;
          tempObject.scale.set(pulseScale, pulseScale, 1);
          
          tempObject.updateMatrix();
          meshRef.current.setMatrixAt(i, tempObject.matrix);
          
          // Set note color
          tempColor.set(color);
          meshRef.current.setColorAt(i, tempColor);
          
          // Update glow
          tempObject.position.set(x, 0.05, z);
          tempObject.rotation.set(-Math.PI / 2, 0, 0);
          tempObject.scale.set(pulseScale * 1.5, pulseScale * 1.5, 1);
          tempObject.updateMatrix();
          glowMeshRef.current.setMatrixAt(i, tempObject.matrix);
          glowMeshRef.current.setColorAt(i, tempColor);
          
          visibleCount++;
        } else {
          // Hide note by scaling to zero
          tempObject.scale.set(0, 0, 0);
          tempObject.updateMatrix();
          meshRef.current.setMatrixAt(i, tempObject.matrix);
          glowMeshRef.current.setMatrixAt(i, tempObject.matrix);
        }
      } else {
        // No more notes, hide remaining instances
        tempObject.scale.set(0, 0, 0);
        tempObject.updateMatrix();
        meshRef.current.setMatrixAt(i, tempObject.matrix);
        glowMeshRef.current.setMatrixAt(i, tempObject.matrix);
      }
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
    
    glowMeshRef.current.instanceMatrix.needsUpdate = true;
    if (glowMeshRef.current.instanceColor) {
      glowMeshRef.current.instanceColor.needsUpdate = true;
    }
  });
  
  // Initialize all instances as hidden
  useEffect(() => {
    if (!meshRef.current || !glowMeshRef.current) return;
    
    tempObject.scale.set(0, 0, 0);
    tempObject.updateMatrix();
    
    for (let i = 0; i < MAX_NOTES; i++) {
      meshRef.current.setMatrixAt(i, tempObject.matrix);
      glowMeshRef.current.setMatrixAt(i, tempObject.matrix);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    glowMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [tempObject]);

  return (
    <group>
      {/* Glow layer (rendered first, behind notes) */}
      <instancedMesh
        ref={glowMeshRef}
        args={[glowGeometry, glowMaterial, MAX_NOTES]}
        frustumCulled={false}
      />
      
      {/* Main notes */}
      <instancedMesh
        ref={meshRef}
        args={[noteGeometry, noteMaterial, MAX_NOTES]}
        frustumCulled={false}
      />
    </group>
  );
};

export default NoteSystem;






