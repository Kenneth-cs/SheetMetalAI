import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Center } from '@react-three/drei';
import * as THREE from 'three';
import { SheetMetalParams, PartType, Hole } from '../types';

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

// Component to create a panel with holes
const PanelWithHoles: React.FC<{ 
  width: number, 
  height: number, 
  thickness: number, 
  holes?: Hole[],
  position?: [number, number, number],
  rotation?: [number, number, number]
}> = ({ width, height, thickness, holes, position, rotation }) => {
  
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    // Draw the main rectangle (centered at 0,0 for easier rotation later)
    // Actually, let's draw it from -w/2, -h/2 to w/2, h/2
    shape.moveTo(-width / 2, -height / 2);
    shape.lineTo(width / 2, -height / 2);
    shape.lineTo(width / 2, height / 2);
    shape.lineTo(-width / 2, height / 2);
    shape.lineTo(-width / 2, -height / 2);

    // Add holes
    if (holes) {
      holes.forEach(hole => {
        // Hole coordinates are usually from bottom-left (0,0) in our params
        // Convert to center-relative
        const hx = hole.x - width / 2;
        const hy = hole.y - height / 2;

        const holePath = new THREE.Path();
        if (hole.type === 'CIRCLE' && hole.diameter) {
          const r = hole.diameter / 2;
          holePath.absarc(hx, hy, r, 0, Math.PI * 2, false);
        } else if (hole.type === 'RECTANGLE' && hole.width && hole.height) {
          const hw = hole.width;
          const hh = hole.height;
          holePath.moveTo(hx - hw/2, hy - hh/2);
          holePath.lineTo(hx + hw/2, hy - hh/2);
          holePath.lineTo(hx + hw/2, hy + hh/2);
          holePath.lineTo(hx - hw/2, hy + hh/2);
          holePath.lineTo(hx - hw/2, hy - hh/2);
        }
        shape.holes.push(holePath);
      });
    }

    const extrudeSettings = {
      depth: thickness,
      bevelEnabled: false
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [width, height, thickness, holes]);

  return (
    <mesh 
      geometry={geometry} 
      position={position ? new THREE.Vector3(...position) : undefined} 
      rotation={rotation ? new THREE.Euler(...rotation) : undefined}
    >
      <Material />
      <lineSegments>
         <edgesGeometry args={[geometry]} />
         <lineBasicMaterial color="#334155" linewidth={1} />
      </lineSegments>
    </mesh>
  );
};

const PartGeometry: React.FC<{ params: SheetMetalParams }> = ({ params }) => {
  const { type, width, height, depth, flangeLength, materialThickness, holes } = params;
  const t = materialThickness || 1; 

  switch (type) {
    case PartType.FLAT_PANEL:
      // Center the panel
      return <PanelWithHoles width={width} height={height} thickness={t} holes={holes} position={[0, 0, -t/2]} />;

    case PartType.L_BRACKET:
      // Vertical Leg (Height) - Main Face with holes
      // Horizontal Leg (Flange) - No holes for now
      return (
        <group>
          {/* Main Leg (Vertical) */}
          <PanelWithHoles width={width} height={height} thickness={t} holes={holes} position={[0, height / 2, -t/2]} />
          
          {/* Flange (Horizontal, bent at bottom) */}
          {/* Note: Flange is usually just a solid rect unless we map holes to it too. 
              For now, assume holes are on main face. */}
          <PanelWithHoles width={width} height={flangeLength} thickness={t} position={[0, 0, flangeLength / 2]} rotation={[Math.PI / 2, 0, 0]} />
        </group>
      );

    case PartType.U_CHANNEL:
      return (
        <group>
          {/* Base (Width x Height) - Main Face */}
          <PanelWithHoles 
            width={width} 
            height={height} 
            thickness={t} 
            holes={holes?.filter(h => !h.face || h.face === 'MAIN')} 
            position={[0, 0, -t/2]} 
          />
          
          {/* Left Flange */}
          <PanelWithHoles 
            width={depth} 
            height={height} 
            thickness={t} 
            holes={holes?.filter(h => h.face === 'FLANGE_LEFT')}
            position={[-width / 2 + t / 2, 0, depth / 2]} 
            rotation={[0, Math.PI/2, 0]} 
          />
          
          {/* Right Flange */}
          <PanelWithHoles 
            width={depth} 
            height={height} 
            thickness={t} 
            holes={holes?.filter(h => h.face === 'FLANGE_RIGHT')}
            position={[width / 2 - t / 2, 0, depth / 2]} 
            rotation={[0, Math.PI/2, 0]} 
          />
        </group>
      );

    case PartType.BOX_PANEL:
      return (
        <group>
          {/* Base */}
          <PanelWithHoles width={width} height={height} thickness={t} holes={holes} position={[0, 0, -t/2]} />
          
          {/* Left Flange */}
          <PanelWithHoles width={depth} height={height} thickness={t} position={[-width / 2 + t / 2, 0, depth / 2]} rotation={[0, Math.PI/2, 0]} />
          
          {/* Right Flange */}
          <PanelWithHoles width={depth} height={height} thickness={t} position={[width / 2 - t / 2, 0, depth / 2]} rotation={[0, Math.PI/2, 0]} />
          
          {/* Top Flange */}
          <PanelWithHoles width={width - 2*t} height={depth} thickness={t} position={[0, height / 2 - t / 2, depth / 2]} rotation={[Math.PI/2, 0, 0]} />
          
          {/* Bottom Flange */}
          <PanelWithHoles width={width - 2*t} height={depth} thickness={t} position={[0, -height / 2 + t / 2, depth / 2]} rotation={[Math.PI/2, 0, 0]} />
        </group>
      );

    default:
      return <PanelWithHoles width={width} height={height} thickness={t} holes={holes} />;
  }
};

export const ThreeDViewer: React.FC<Props> = ({ params }) => {
  // Use params.type + key dimensions as Canvas key so it remounts when part type changes,
  // ensuring the 3D scene fully refreshes after AI analysis.
  const canvasKey = `${params.type}-${params.width}-${params.height}-${params.depth}`;

  return (
    <div className="w-full h-full bg-slate-900 rounded-lg overflow-hidden border border-slate-700 relative">
      <div className="absolute top-0 left-0 z-10 bg-slate-800/80 px-4 py-2 rounded-br-lg border-b border-r border-slate-700 backdrop-blur-sm">
        <h3 className="text-industrial-100 font-semibold flex items-center gap-2 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          3D 预览 (Folded View)
        </h3>
      </div>

      {/* key prop forces a full remount of the Canvas when part dimensions change */}
      <Canvas key={canvasKey} shadows camera={{ position: [200, 200, 200], fov: 45 }}>
        <color attach="background" args={['#0f172a']} />
        <fog attach="fog" args={['#0f172a', 500, 2000]} />

        {/* Use direct lights instead of Stage+HDR to avoid downloading a large environment map */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[200, 300, 200]} intensity={1.2} castShadow />
        <directionalLight position={[-150, 200, -100]} intensity={0.5} />
        <pointLight position={[0, 300, 0]} intensity={0.4} />

        <Center>
          <PartGeometry params={params} />
        </Center>

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
