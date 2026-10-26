'use client';

import React, { useSyncExternalStore } from 'react';
import { Canvas } from '@react-three/fiber';
import { GalaxyScene } from './GalaxyScene';

const emptySubscribe = () => () => {};

export const MusicVisualizerCanvas: React.FC = () => {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

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
        camera={{ position: [12, 46, 295], fov: 52, near: 0.1, far: 800 }}
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
