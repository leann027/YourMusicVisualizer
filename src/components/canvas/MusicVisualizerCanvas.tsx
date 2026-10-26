'use client';

import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { GalaxyScene } from './GalaxyScene';

export const MusicVisualizerCanvas: React.FC = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-[100dvh] bg-[#050508] flex items-center justify-center font-mono text-[#00F5D4] text-sm tracking-widest">
        INICIALIZANDO COSMOS 3D...
      </div>
    );
  }

  return (
    <div className="relative w-full h-[100dvh] bg-[#050508] overflow-hidden select-none">
      <Canvas
        camera={{ position: [0, 8, 32], fov: 55, near: 0.1, far: 500 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        raycaster={{
          params: {
            Points: { threshold: 0.15 },
            Line: { threshold: 1 },
            LOD: {},
            Sprite: {},
            Mesh: {},
          },
        }}
      >
        <color attach="background" args={['#050508']} />
        <GalaxyScene />
      </Canvas>
    </div>
  );
};
