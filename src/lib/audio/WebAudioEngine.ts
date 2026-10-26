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

const MAX_PREVIEW_BUFFERS = 16;

class WebAudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private activeSource: AudioBufferSourceNode | null = null;
  private activeTrackGain: GainNode | null = null;

  // Real-time progressive HTML5 audio stream element + single WebAudio MediaElementSourceNode
  private audioElement: HTMLAudioElement | null = null;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;

  // Memory cache for decoded preview buffers
  private previewBufferCache = new Map<string, AudioBuffer>();
  private pendingPreviewFetches = new Set<string>();

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
      this.masterGain.gain.value = 0.32;

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
      this.fftData = new Uint8Array(this.analyser.frequencyBinCount);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    // Lazy instantiate HTMLAudioElement and connect once to the WebAudio graph
    if (!this.audioElement && typeof Audio !== 'undefined' && this.masterGain) {
      try {
        const audio = new Audio();
        audio.crossOrigin = 'anonymous';
        audio.preload = 'auto';
        audio.loop = true;

        audio.onplaying = () => {
          this.playing = true;
          this.currentFrame.isPlaying = true;
          this.notify();
        };

        audio.onpause = () => {
          if (this.playing && this.audioElement?.paused) {
            this.playing = false;
            this.currentFrame.isPlaying = false;
            this.notify();
          }
        };

        audio.onerror = () => {
          this.pendingPreviewFetches.delete(this.currentTrackId || '');
        };

        this.mediaSourceNode = this.ctx.createMediaElementSource(audio);
        this.mediaSourceNode.connect(this.masterGain);
        this.audioElement = audio;
      } catch (err) {
        console.warn('[WebAudioEngine] Audio streaming initialization:', err);
      }
    }

    return this.ctx;
  }

  /**
   * Explicitly stops and disconnects active audio streams and releases nodes.
   */
  public stopCurrentSource(): void {
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch {
        // Ignore
      }
    }

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

  /**
   * Plays a track dynamically with 0ms instant auditory and FFT feedback:
   * - Streams real audio preview immediately via progressive HTMLAudioElement
   *   without waiting for a 30s buffer to decode or playing disconnected generic synth loops.
   * - Feeds the live audio directly through AnalyserNode for real-time visualizer reaction.
   */
  public playTrack(
    trackId: string,
    _seedString: string,
    _affinity = 0.9,
    previewUrl?: string
  ): void {
    void _seedString;
    void _affinity;
    const ctx = this.ensureContext();
    if (!this.masterGain) return;

    // If already playing this exact track in active stream, don't restart
    if (
      this.playing &&
      this.currentTrackId === trackId &&
      this.audioElement &&
      !this.audioElement.paused
    ) {
      return;
    }

    this.stopCurrentSource();

    this.currentTrackId = trackId;
    this.playing = true;
    this.currentFrame.isPlaying = true;
    this.currentFrame.trackId = trackId;
    this.notify();

    // 1. Play real audio preview immediately via progressive streaming HTMLAudioElement
    if (this.audioElement && previewUrl) {
      try {
        this.audioElement.src = previewUrl;
        this.audioElement.currentTime = 0;
        const playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            // AbortError is normal during rapid star selection
            if (err?.name !== 'AbortError') {
              console.warn('[WebAudioEngine] Audio playback notice:', err);
            }
          });
        }
        return;
      } catch (err) {
        console.warn('[WebAudioEngine] Error initiating stream:', err);
      }
    }

    // 2. Play cached AudioBuffer if available
    const cachedPreview = this.previewBufferCache.get(trackId);
    if (cachedPreview) {
      this.startBufferSource(ctx, cachedPreview, trackId);
      return;
    }

    // 3. Background fetch fallback if previewUrl exists and HTMLAudioElement wasn't available
    if (previewUrl && !this.pendingPreviewFetches.has(trackId)) {
      this.pendingPreviewFetches.add(trackId);

      fetch(previewUrl)
        .then((res) => {
          if (!res.ok) throw new Error('Preview fetch failed');
          return res.arrayBuffer();
        })
        .then((arrBuf) => ctx.decodeAudioData(arrBuf))
        .then((decodedBuffer) => {
          this.pendingPreviewFetches.delete(trackId);

          if (this.previewBufferCache.size >= MAX_PREVIEW_BUFFERS) {
            const oldestKey = this.previewBufferCache.keys().next().value;
            if (oldestKey) this.previewBufferCache.delete(oldestKey);
          }
          this.previewBufferCache.set(trackId, decodedBuffer);

          if (this.playing && this.currentTrackId === trackId) {
            this.startBufferSource(ctx, decodedBuffer, trackId);
          }
        })
        .catch(() => {
          this.pendingPreviewFetches.delete(trackId);
        });
    }
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
      cachedBuffers: this.previewBufferCache.size,
    };
  }

  /**
   * Full teardown of all audio nodes, cached AudioBuffers, streaming elements, and AudioContext.
   */
  public dispose(): void {
    this.stopCurrentSource();
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.src = '';
      } catch {}
      this.audioElement = null;
    }
    if (this.mediaSourceNode) {
      try {
        this.mediaSourceNode.disconnect();
      } catch {}
      this.mediaSourceNode = null;
    }
    this.previewBufferCache.clear();
    this.pendingPreviewFetches.clear();
    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {}
      this.masterGain = null;
    }
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {}
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
