'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { TelemetryHUD } from '../components/hud/TelemetryHUD';
import {
  fetchSpotifyLikedSongsGalaxy,
  getStoredAccessToken,
} from '../lib/spotify/spotifyClient';
import { parseRendererParam, useGalaxyStore } from '../store/useGalaxyStore';
import { readStoredRenderer, resolveInitialRenderer } from '../lib/rendererPreference';

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
  const setRendererMode = useGalaxyStore((s) => s.setRendererMode);

  // Development only: expose the store so Playwright flows can drive selections (e.g. collisions)
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (window as unknown as { __galaxyStore?: typeof useGalaxyStore }).__galaxyStore = useGalaxyStore;
  }, []);

  // Renderer on mount: ?renderer=classic|nebula, else the HUD preference, else nebula (M8.4).
  // window avoids a Suspense boundary for useSearchParams.
  useEffect(() => {
    const param = parseRendererParam(new URLSearchParams(window.location.search).get('renderer'));
    setRendererMode(resolveInitialRenderer(param, readStoredRenderer()));
  }, [setRendererMode]);

  // Auto-restore active Spotify session if token is still valid in localStorage
  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token || spotifyUser) return;

    fetchSpotifyLikedSongsGalaxy(token)
      .then(({ galaxy, user, analyzedCount, totalAvailable }) => {
        loadCustomGalaxyData(
          galaxy,
          `Spotify · ${user.displayName} (${analyzedCount} de ${totalAvailable} Me gusta)`,
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
