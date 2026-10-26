'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Activity, Volume2, VolumeX } from 'lucide-react';
import { webAudioEngine } from '../../lib/audio/WebAudioEngine';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { SongNode } from '../../types/music';

/**
 * Cyber-Galactic High-Fidelity 24-Band FFT Audio Visualizer Dock (`FFTSpectrumDock`).
 *
 * Renders in the persistent bottom floating dock with:
 * - 24-band frequency spectrum (Sub-Bass, Bass, Low-Mid, High-Mid, Presence, Brilliance).
 * - Analog-style peak-hold physics with gravity-accelerated falling transient caps.
 * - Ethereal ambient cosmic radiation wave when idle.
 * - Direct interactive click-to-toggle audio playback.
 */
export const FFTSpectrumDock: React.FC = () => {
  const isAudioPlaying = useGalaxyStore((s) => s.isAudioPlaying);
  const selectedNode = useGalaxyStore((s) => s.selectedNode);
  const data = useGalaxyStore((s) => s.data);
  const setAudioPlayback = useGalaxyStore((s) => s.setAudioPlayback);

  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const peakRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const peakValues = useRef<number[]>(new Array(24).fill(0));
  const [rmsEnergy, setRmsEnergy] = useState<number>(0);

  const activeTitle = selectedNode
    ? 'name' in selectedNode
      ? selectedNode.name
      : selectedNode.title
    : 'Cosmos Sonoro';

  useEffect(() => {
    let animId: number;
    let t = 0;

    const updateBars = () => {
      t += 0.045;
      const fft = webAudioEngine.sampleFFT();
      const bins = fft.bins;
      const isPlaying = fft.isPlaying;

      if (isPlaying) {
        setRmsEnergy(Math.round(fft.energy * 100));
      } else {
        setRmsEnergy(0);
      }

      for (let i = 0; i < 24; i++) {
        let heightPct: number;

        if (isPlaying) {
          const raw = bins[i] || 0;
          heightPct = Math.min(100, Math.max(8, (raw / 255) * 100));
        } else {
          // Subtle breathing cosmic background wave when idle
          const wave = Math.sin(t + i * 0.32) * 0.5 + 0.5;
          heightPct = 8 + wave * 14;
        }

        // Peak-hold with gravity decay
        if (heightPct >= peakValues.current[i]) {
          peakValues.current[i] = heightPct;
        } else {
          peakValues.current[i] = Math.max(
            heightPct,
            peakValues.current[i] - (isPlaying ? 1.6 : 0.8)
          );
        }

        const barEl = barRefs.current[i];
        if (barEl) {
          barEl.style.height = `${heightPct}%`;
        }

        const peakEl = peakRefs.current[i];
        if (peakEl) {
          peakEl.style.bottom = `${Math.min(96, peakValues.current[i] + 4)}%`;
        }
      }

      animId = requestAnimationFrame(updateBars);
    };

    animId = requestAnimationFrame(updateBars);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleToggleAudio = () => {
    if (isAudioPlaying) {
      webAudioEngine.stopCurrentSource();
      setAudioPlayback(null, false);
      return;
    }

    // Find playable track from current focus (prioritizing random selection for artists/genres)
    let matchSong: SongNode | undefined;
    if (selectedNode?.type === 'song') {
      matchSong = selectedNode;
    } else if (selectedNode?.type === 'artist') {
      const artistSongs = data.songs.filter((s) => s.artistId === selectedNode.id);
      const withPreview = artistSongs.filter((s) => s.previewUrl);
      const candidates = withPreview.length > 0 ? withPreview : artistSongs;
      matchSong = candidates[Math.floor(Math.random() * candidates.length)];
    } else if (selectedNode?.type === 'genre') {
      const genreSongs = data.songs.filter((s) => s.genreId === selectedNode.id);
      const withPreview = genreSongs.filter((s) => s.previewUrl);
      const candidates = withPreview.length > 0 ? withPreview : genreSongs;
      matchSong = candidates[Math.floor(Math.random() * candidates.length)];
    }
    if (!matchSong) {
      matchSong = data.songs.find((s) => s.previewUrl) || data.songs[0];
    }

    if (matchSong) {
      webAudioEngine.playTrack(
        matchSong.id,
        matchSong.title,
        matchSong.affinity,
        matchSong.previewUrl
      );
      setAudioPlayback(matchSong.id, true);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleToggleAudio}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleToggleAudio();
        }
      }}
      aria-label={
        isAudioPlaying
          ? 'Espectro de audio FFT activo. Haz clic para pausar audio'
          : 'Espectro de audio FFT en espera. Haz clic para reproducir pulso cósmico'
      }
      title={
        isAudioPlaying
          ? 'Audio estelar activo (Haz clic para pausar)'
          : 'Pulso FFT en reposo (Haz clic para reproducir)'
      }
      className="group hidden sm:flex items-center gap-3.5 px-3 py-1 rounded-xl border border-[#00F5D4]/25 bg-[#050508]/90 hover:border-[#00F5D4] hover:bg-[#00F5D4]/10 transition-all duration-200 cursor-pointer select-none"
    >
      {/* Left Icon & Meta Information */}
      <div className="flex items-center gap-2">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-lg border transition-colors ${
            isAudioPlaying
              ? 'border-[#CCFF00] bg-[#CCFF00]/15 text-[#CCFF00] shadow-[0_0_10px_rgba(204,255,0,0.35)]'
              : 'border-[#00F5D4]/30 bg-[#050508] text-[#00F5D4]'
          }`}
        >
          {isAudioPlaying ? (
            <Volume2 className="h-3.5 w-3.5 animate-pulse" strokeWidth={2.5} />
          ) : (
            <VolumeX className="h-3.5 w-3.5 text-[#B8DCE8]" strokeWidth={2} />
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-wider uppercase">
            <Activity
              className={`h-2.5 w-2.5 ${
                isAudioPlaying ? 'text-[#CCFF00]' : 'text-[#00F5D4]'
              }`}
              strokeWidth={2.5}
            />
            <span
              className={isAudioPlaying ? 'text-[#CCFF00]' : 'text-[#F2F4F8]'}
            >
              FFT {isAudioPlaying ? 'EN VIVO' : 'ESPERA'}
            </span>
          </div>
          <span className="font-mono text-[9px] text-[#B8DCE8] tabular-nums max-w-[110px] md:max-w-[140px] truncate">
            {isAudioPlaying ? activeTitle : '20Hz — 16kHz'}
          </span>
        </div>
      </div>

      {/* 24-Band Visualizer Graphic with Floating Peak-Hold Caps */}
      <div
        aria-hidden="true"
        className="relative flex h-7 w-32 md:w-44 items-end gap-[2px] md:gap-[3px] px-1 py-0.5 rounded bg-[#080A14]/80 border border-[#00F5D4]/15 overflow-hidden"
      >
        {Array.from({ length: 24 }, (_, i) => {
          // High-contrast chromatic palette across frequency spectrum
          const barColorClass =
            i < 4
              ? 'bg-[#FF2A85] shadow-[0_0_8px_rgba(255,42,133,0.5)]' // Sub-bass (20-80 Hz)
              : i < 9
              ? 'bg-[#A855F7] shadow-[0_0_8px_rgba(168,85,247,0.4)]' // Bass (80-350 Hz)
              : i < 16
              ? 'bg-[#00F5D4] shadow-[0_0_8px_rgba(0,245,212,0.4)]'  // Mids (350-2.5 kHz)
              : i < 21
              ? 'bg-[#38BDF8] shadow-[0_0_8px_rgba(56,189,248,0.4)]' // High Mids (2.5-6 kHz)
              : 'bg-[#CCFF00] shadow-[0_0_8px_rgba(204,255,0,0.5)]'; // Brilliance (6-16 kHz)

          const peakColorClass =
            i < 4
              ? 'bg-[#FF2A85]'
              : i < 9
              ? 'bg-[#A855F7]'
              : i < 16
              ? 'bg-[#00F5D4]'
              : i < 21
              ? 'bg-[#38BDF8]'
              : 'bg-[#CCFF00]';

          return (
            <div
              key={i}
              className="relative flex-1 h-full flex items-end justify-center"
            >
              {/* Dynamic Equalizer Bar */}
              <span
                ref={(el) => {
                  barRefs.current[i] = el;
                }}
                style={{ height: '10%' }}
                className={`w-full rounded-t-[1px] transition-[height] duration-75 ${barColorClass}`}
              />

              {/* Peak-Hold Falling Cap */}
              <span
                ref={(el) => {
                  peakRefs.current[i] = el;
                }}
                style={{ bottom: '12%' }}
                className={`absolute w-full h-[2px] rounded-full transition-[bottom] duration-100 ${peakColorClass}`}
              />
            </div>
          );
        })}
      </div>

      {/* Right Telemetry Badge */}
      <div className="hidden lg:flex items-center font-mono text-[9px] tabular-nums text-[#00F5D4] border-l border-[#00F5D4]/20 pl-2.5">
        <span>{isAudioPlaying ? `${rmsEnergy}% RMS` : '44.1kHz'}</span>
      </div>
    </div>
  );
};
