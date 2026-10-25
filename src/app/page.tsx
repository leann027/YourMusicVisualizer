'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { TelemetryHUD } from '../components/hud/TelemetryHUD';
import {
  fetchSpotifyLikedSongsGalaxy,
  getStoredAccessToken,
} from '../lib/spotify/spotifyClient';
import { useGalaxyStore } from '../store/useGalaxyStore';

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
  const spotifyUser = useGalaxyStore((s) => s.spotifyUser);
  const loadCustomGalaxyData = useGalaxyStore((s) => s.loadCustomGalaxyData);

  // Auto-restore active Spotify session if token is still valid in localStorage
  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token || spotifyUser) return;

    fetchSpotifyLikedSongsGalaxy(token)
      .then(({ galaxy, user, analyzedCount }) => {
        loadCustomGalaxyData(
          galaxy,
          `Spotify · ${user.displayName} (${analyzedCount} Me gusta)`,
          user
        );
      })
      .catch(() => {
        // Ignore expired token silently on boot
      });
  }, [spotifyUser, loadCustomGalaxyData]);

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden bg-[#050508]">
      {/* 3D WebGL Canvas Layer */}
      <MusicVisualizerCanvas />

      {/* Floating 2D Telemetry HUD Layer */}
      <TelemetryHUD />
    </main>
  );
}
