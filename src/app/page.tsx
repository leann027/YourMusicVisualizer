'use client';

import dynamic from 'next/dynamic';
import { TelemetryHUD } from '../components/hud/TelemetryHUD';

// Dynamic import for 3D Canvas to disable SSR cleanly
const MusicVisualizerCanvas = dynamic(
  () =>
    import('../components/canvas/MusicVisualizerCanvas').then(
      (mod) => mod.MusicVisualizerCanvas
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[100dvh] bg-[#050508] flex items-center justify-center font-mono text-[#00F5D4] text-xs tracking-widest">
        CARGANDO MOTOR 3D...
      </div>
    ),
  }
);

export default function HomePage() {
  return (
    <main className="relative w-full h-[100dvh] overflow-hidden bg-[#050508]">
      {/* 3D WebGL Canvas Layer */}
      <MusicVisualizerCanvas />

      {/* Floating 2D Telemetry HUD Layer */}
      <TelemetryHUD />
    </main>
  );
}
