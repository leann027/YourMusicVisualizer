'use client';

/**
 * Memory-safe Web Audio API synthesizer & real-time FFT analyzer (`WebAudioEngine`).
 *
 * Designed specifically to prevent AudioContext, AudioBuffer, and AudioNode leaks
 * when switching tracks repeatedly:
 * - Lazy single AudioContext instantiation (deferred until user interaction so LCP & main thread are never blocked).
 * - Single shared AnalyserNode (`fftSize = 128`, 64 frequency bins) with a pre-allocated `Uint8Array` buffer (0 per-frame allocations).
 * - Bounded LRU cache (`MAX_CACHED_BUFFERS = 4`) for synthesized harmonic track buffers.
 * - Explicit `stop()` and `disconnect()` on every `AudioBufferSourceNode` and `GainNode` via `onended` and track transitions.
 */

export interface AudioFFTFrame {
  isPlaying: boolean;
  trackId: string | null;
  subBass: number;     // 0.0 - 1.0 (20 - 140 Hz)
  midHarmonic: number; // 0.0 - 1.0 (140 - 2000 Hz)
  highShimmer: number; // 0.0 - 1.0 (2000 - 12000 Hz)
  energy: number;      // 0.0 - 1.0 weighted RMS energy
  bins: Uint8Array;    // 24 downsampled bars (0 - 255) for HUD visualizer
}

const MAX_CACHED_BUFFERS = 4;

class WebAudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private activeSource: AudioBufferSourceNode | null = null;
  private activeTrackGain: GainNode | null = null;

  private bufferCache = new Map<string, AudioBuffer>();
  private fftData = new Uint8Array(64);
  private hudBars = new Uint8Array(24);

  private currentTrackId: string | null = null;
  private playing = false;
  private listeners = new Set<() => void>();
  private lastSampleTimestamp = 0;

  private currentFrame: AudioFFTFrame = {
    isPlaying: false,
    trackId: null,
    subBass: 0,
    midHarmonic: 0,
    highShimmer: 0,
    energy: 0,
    bins: this.hudBars,
  };

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioCtx();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128; // 64 frequency bins
      this.analyser.smoothingTimeConstant = 0.78;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.28;

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.fftData = new Uint8Array(this.analyser.frequencyBinCount);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /**
   * Explicitly stops and disconnects the active AudioBufferSourceNode and GainNode
   * so V8 / Blink WebAudio graph releases all references immediately.
   */
  public stopCurrentSource(): void {
    if (this.activeSource) {
      try {
        this.activeSource.onended = null;
        this.activeSource.stop();
      } catch {
        // Ignore if already stopped
      }
      try {
        this.activeSource.disconnect();
      } catch {
        // Ignore if already disconnected
      }
      this.activeSource = null;
    }

    if (this.activeTrackGain) {
      try {
        this.activeTrackGain.disconnect();
      } catch {
        // Ignore
      }
      this.activeTrackGain = null;
    }

    this.playing = false;
    this.currentFrame.isPlaying = false;
    this.currentFrame.subBass = 0;
    this.currentFrame.midHarmonic = 0;
    this.currentFrame.highShimmer = 0;
    this.currentFrame.energy = 0;
    this.hudBars.fill(0);
    this.notify();
  }

  /**
   * Generates a deterministic, multi-layered harmonic loop for a given song/artist star
   * (sub-bass pulse + chord pad + arpeggio harmonics) and stores it in a bounded LRU cache.
   */
  private getOrCreateTrackBuffer(
    ctx: AudioContext,
    trackId: string,
    seedString: string,
    affinity: number
  ): AudioBuffer {
    const existing = this.bufferCache.get(trackId);
    if (existing) {
      // Refresh LRU order
      this.bufferCache.delete(trackId);
      this.bufferCache.set(trackId, existing);
      return existing;
    }

    // Evict oldest AudioBuffer if cache exceeds MAX_CACHED_BUFFERS
    if (this.bufferCache.size >= MAX_CACHED_BUFFERS) {
      const oldestKey = this.bufferCache.keys().next().value;
      if (oldestKey) {
        this.bufferCache.delete(oldestKey);
      }
    }

    const durationSec = 4.0;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let hash = 0;
    for (let i = 0; i < seedString.length; i++) {
      hash = (hash * 31 + seedString.charCodeAt(i)) | 0;
    }
    const absHash = Math.abs(hash);

    const rootNotes = [55.0, 65.41, 73.42, 82.41, 98.0, 110.0]; // A1, C2, D2, E2, G2, A2
    const rootFreq = rootNotes[absHash % rootNotes.length];
    const bpm = 105 + (absHash % 28);
    const beatFreq = bpm / 60;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;

      // Rhythmic kick / sub-bass envelope
      const beatPhase = (t * beatFreq) % 1;
      const kickEnv = Math.exp(-beatPhase * 7.5);
      const kickPitch = rootFreq * (1 + 1.4 * Math.exp(-beatPhase * 28));
      const subWave = Math.sin(2 * Math.PI * kickPitch * t) * kickEnv * 0.52;

      // Warm fifth & octave synth pad
      const padMod = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.5 * t);
      const padWave =
        (Math.sin(2 * Math.PI * (rootFreq * 2) * t) * 0.22 +
          Math.sin(2 * Math.PI * (rootFreq * 3) * t) * 0.16 +
          Math.sin(2 * Math.PI * (rootFreq * 4) * t) * 0.1) *
        padMod;

      // High harmonic arpeggio shimmer (drives high-frequency FFT bins)
      const arpStep = Math.floor(t * beatFreq * 4) % 4;
      const arpMultipliers = [4, 5, 6, 8];
      const arpFreq = rootFreq * arpMultipliers[arpStep];
      const arpPhase = (t * beatFreq * 4) % 1;
      const arpEnv = Math.exp(-arpPhase * 9.0) * (0.18 + affinity * 0.14);
      const shimmerWave =
        (Math.sin(2 * Math.PI * arpFreq * t) +
          0.4 * Math.sin(2 * Math.PI * (arpFreq * 1.5) * t)) *
        arpEnv;

      // Smooth fade at loop boundaries to prevent clicks
      const loopFade =
        t < 0.04
          ? t / 0.04
          : t > durationSec - 0.04
          ? (durationSec - t) / 0.04
          : 1.0;

      data[i] = Math.max(
        -0.95,
        Math.min(0.95, (subWave + padWave + shimmerWave) * loopFade)
      );
    }

    this.bufferCache.set(trackId, buffer);
    return buffer;
  }

  public toggleTrack(
    trackId: string,
    seedString: string,
    affinity = 0.9,
    previewUrl?: string
  ): boolean {
    if (this.playing && this.currentTrackId === trackId) {
      this.stopCurrentSource();
      this.currentTrackId = null;
      this.currentFrame.trackId = null;
      this.notify();
      return false;
    }

    this.playTrack(trackId, seedString, affinity, previewUrl);
    return true;
  }

  public playTrack(
    trackId: string,
    seedString: string,
    affinity = 0.9,
    previewUrl?: string
  ): void {
    const ctx = this.ensureContext();
    if (!this.masterGain) return;

    // Always dispose previous source before starting a new one
    this.stopCurrentSource();

    this.currentTrackId = trackId;
    this.playing = true;
    this.currentFrame.isPlaying = true;
    this.currentFrame.trackId = trackId;
    this.notify();

    // If a real Spotify preview MP3 URL is available, fetch & decode it into our LRU cache
    if (previewUrl && !this.bufferCache.has(trackId)) {
      fetch(previewUrl)
        .then((res) => {
          if (!res.ok) throw new Error('Preview fetch failed');
          return res.arrayBuffer();
        })
        .then((arrBuf) => ctx.decodeAudioData(arrBuf))
        .then((decodedBuffer) => {
          if (this.bufferCache.size >= MAX_CACHED_BUFFERS) {
            const oldestKey = this.bufferCache.keys().next().value;
            if (oldestKey) this.bufferCache.delete(oldestKey);
          }
          this.bufferCache.set(trackId, decodedBuffer);
          // Only swap in the decoded preview if the user is still on this track
          if (this.playing && this.currentTrackId === trackId) {
            this.startBufferSource(ctx, decodedBuffer, trackId);
          }
        })
        .catch(() => {
          // Fallback to synthesized harmonic buffer if preview fetch/decode fails
          if (this.playing && this.currentTrackId === trackId) {
            const fallback = this.getOrCreateTrackBuffer(
              ctx,
              trackId,
              seedString,
              affinity
            );
            this.startBufferSource(ctx, fallback, trackId);
          }
        });
      return;
    }

    const buffer = this.getOrCreateTrackBuffer(
      ctx,
      trackId,
      seedString,
      affinity
    );
    this.startBufferSource(ctx, buffer, trackId);
  }

  private startBufferSource(
    ctx: AudioContext,
    buffer: AudioBuffer,
    trackId: string
  ): void {
    if (!this.masterGain) return;

    // Clean up any existing buffer source before starting the new one
    if (this.activeSource) {
      try {
        this.activeSource.onended = null;
        this.activeSource.stop();
        this.activeSource.disconnect();
      } catch {
        // Ignore
      }
      this.activeSource = null;
    }
    if (this.activeTrackGain) {
      try {
        this.activeTrackGain.disconnect();
      } catch {
        // Ignore
      }
      this.activeTrackGain = null;
    }

    const source = ctx.createBufferSource();
    const trackGain = ctx.createGain();
    source.buffer = buffer;
    source.loop = true;

    trackGain.gain.setValueAtTime(0.01, ctx.currentTime);
    trackGain.gain.exponentialRampToValueAtTime(1.0, ctx.currentTime + 0.08);

    source.connect(trackGain);
    trackGain.connect(this.masterGain);

    source.onended = () => {
      try {
        source.disconnect();
        trackGain.disconnect();
      } catch {
        // Ignore
      }
    };

    source.start(0);

    this.activeSource = source;
    this.activeTrackGain = trackGain;
    this.currentTrackId = trackId;
    this.playing = true;
    this.currentFrame.isPlaying = true;
    this.currentFrame.trackId = trackId;
    this.notify();
  }

  /**
   * Samples the real-time FFT spectrum in-place without allocating new arrays.
   * Safe to call inside a 60 FPS `useFrame` loop.
   */
  public sampleFFT(): AudioFFTFrame {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // Cache sampled frame if called multiple times within the same animation frame (~10ms)
    if (now - this.lastSampleTimestamp < 10 && this.lastSampleTimestamp > 0) {
      return this.currentFrame;
    }
    this.lastSampleTimestamp = now;

    if (!this.playing || !this.analyser) {
      // Smooth decay to zero when paused
      for (let i = 0; i < 24; i++) {
        this.hudBars[i] = Math.max(0, Math.round(this.hudBars[i] * 0.86));
      }
      this.currentFrame.subBass *= 0.85;
      this.currentFrame.midHarmonic *= 0.85;
      this.currentFrame.highShimmer *= 0.85;
      this.currentFrame.energy *= 0.85;
      return this.currentFrame;
    }

    this.analyser.getByteFrequencyData(this.fftData);

    let subSum = 0;
    for (let i = 0; i < 6; i++) subSum += this.fftData[i];
    const subBass = subSum / (6 * 255);

    let midSum = 0;
    for (let i = 6; i < 24; i++) midSum += this.fftData[i];
    const midHarmonic = midSum / (18 * 255);

    let highSum = 0;
    for (let i = 24; i < 56; i++) highSum += this.fftData[i];
    const highShimmer = highSum / (32 * 255);

    // Downsample 64 frequency bins into 24 high-resolution HUD spectrum bars in-place
    for (let b = 0; b < 24; b++) {
      const idx = Math.min(62, Math.floor(b * 2.5));
      this.hudBars[b] = Math.min(
        255,
        Math.round((this.fftData[idx] + this.fftData[idx + 1]) / 2)
      );
    }

    const energy = Math.min(
      1.0,
      subBass * 0.5 + midHarmonic * 0.35 + highShimmer * 0.25
    );

    this.currentFrame.isPlaying = this.playing;
    this.currentFrame.trackId = this.currentTrackId;
    this.currentFrame.subBass = subBass;
    this.currentFrame.midHarmonic = midHarmonic;
    this.currentFrame.highShimmer = highShimmer;
    this.currentFrame.energy = energy;

    return this.currentFrame;
  }

  public getState(): {
    isPlaying: boolean;
    trackId: string | null;
    cachedBuffers: number;
  } {
    return {
      isPlaying: this.playing,
      trackId: this.currentTrackId,
      cachedBuffers: this.bufferCache.size,
    };
  }

  /**
   * Full teardown of all audio nodes, cached AudioBuffers, and AudioContext.
   */
  public dispose(): void {
    this.stopCurrentSource();
    this.bufferCache.clear();
    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        // Ignore
      }
      this.masterGain = null;
    }
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {
        // Ignore
      }
      this.analyser = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.currentTrackId = null;
    this.notify();
  }
}

export const webAudioEngine = new WebAudioEngine();
