import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stage, Grid, Center, Text } from '@react-three/drei';
import * as THREE from 'three';
import { SheetMetalParams, PartType } from '../types';

interface Props {
  params: SheetMetalParams;
}

const Material = () => (
  <meshStandardMaterial
    color="#94a3b8"
    metalness={0.6}
    roughness={0.4}
    side={THREE.DoubleSide}
  />
);

const PartGeometry: React.FC<{ params: SheetMetalParams }> = ({ params }) => {
  const { type, width, height, depth, flangeLength, materialThickness } = params;
  const t = materialThickness || 1; // Default thickness if 0

  // Helper to create a box mesh
  const Box = ({ args, position, rotation }: { args: [number, number, number], position?: [number, number, number], rotation?: [number, number, number] }) => (
    <mesh position={position ? new THREE.Vector3(...position) : undefined} rotation={rotation ? new THREE.Euler(...rotation) : undefined}>
      <boxGeometry args={args} />
      <Material />
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...args)]} />
        <lineBasicMaterial color="#334155" linewidth={1} />
      </lineSegments>
    </mesh>
  );

  switch (type) {
    case PartType.FLAT_PANEL:
      return <Box args={[width, height, t]} />;

    case PartType.L_BRACKET:
      // Vertical Leg (Height)
      // Horizontal Leg (Flange)
      return (
        <group>
          {/* Main Leg (Vertical) */}
          <Box args={[width, height, t]} position={[0, height / 2, 0]} />
          {/* Flange (Horizontal, bent at bottom) */}
          <Box args={[width, flangeLength, t]} position={[0, 0, flangeLength / 2]} rotation={[Math.PI / 2, 0, 0]} />
        </group>
      );

    case PartType.U_CHANNEL:
      // Base (Width)
      // Two Flanges (Depth)
      return (
        <group>
          {/* Base */}
          <Box args={[width, height, t]} position={[0, 0, 0]} />
          {/* Left Flange */}
          <Box args={[t, height, depth]} position={[-width / 2 + t / 2, 0, depth / 2]} />
          {/* Right Flange */}
          <Box args={[t, height, depth]} position={[width / 2 - t / 2, 0, depth / 2]} />
        </group>
      );

    case PartType.BOX_PANEL:
      // Base (Width x Height)
      // 4 Flanges (Depth)
      return (
        <group>
          {/* Base */}
          <Box args={[width, height, t]} position={[0, 0, 0]} />
          
          {/* Left Flange */}
          <Box args={[t, height, depth]} position={[-width / 2 + t / 2, 0, depth / 2]} />
          
          {/* Right Flange */}
          <Box args={[t, height, depth]} position={[width / 2 - t / 2, 0, depth / 2]} />
          
          {/* Top Flange */}
          <Box args={[width - 2 * t, t, depth]} position={[0, height / 2 - t / 2, depth / 2]} />
          
          {/* Bottom Flange */}
          <Box args={[width - 2 * t, t, depth]} position={[0, -height / 2 + t / 2, depth / 2]} />
        </group>
      );

    default:
      return <Box args={[width, height, t]} />;
  }
};

export const ThreeDViewer: React.FC<Props> = ({ params }) => {
  return (
    <div className="w-full h-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700 relative">
      <div className="absolute top-0 left-0 z-10 bg-slate-800/80 px-4 py-2 rounded-br-lg border-b border-r border-slate-700 backdrop-blur-sm">
        <h3 className="text-industrial-100 font-semibold flex items-center gap-2 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          3D 预览 (Folded View)
        </h3>
      </div>
      
      <Canvas shadows camera={{ position: [200, 200, 200], fov: 45 }}>
        <color attach="background" args={['#0f172a']} />
        <fog attach="fog" args={['#0f172a', 500, 2000]} />
        
        <Stage environment="city" intensity={0.5} adjustCamera={1.2}>
          <Center>
            <PartGeometry params={params} />
          </Center>
        </Stage>
        
        <Grid 
          infiniteGrid 
          fadeDistance={500} 
          sectionColor="#1e293b" 
          cellColor="#334155" 
          position={[0, -50, 0]} 
        />
        
        <OrbitControls makeDefault autoRotate autoRotateSpeed={0.5} />
      </Canvas>
      
      <div className="absolute bottom-4 right-4 text-xs text-slate-500 bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
        Left Click: Rotate • Right Click: Pan • Scroll: Zoom
      </div>
    </div>
  );
};
