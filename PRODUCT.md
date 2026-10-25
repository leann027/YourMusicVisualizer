# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- **Framework UI & Routing:** Next.js 15+ (App Router) with TypeScript and Tailwind CSS (for the overlay HUD).
- **3D Graphics Engine:** Three.js via `@react-three/fiber` and `@react-three/drei`.
- **Post-Processing:** `@react-three/postprocessing` (`UnrealBloomPass` for stellar glow and nebulae).
- **Graph Physics Engine:** `d3-force-3d` or `3d-force-graph` running inside a Web Worker to keep the main thread unblocked.
- **Camera Animation:** `camera-controls` (Three.js) + `GSAP` for cinematic camera interpolations toward selected sectors and nodes.
- **State & Audio Analysis:** `Zustand` (reactive selection/zoom state) + **Web Audio API** (FFT frequency analysis so star nodes pulse and react to music playback in real time).

## Users

Music listeners and enthusiasts who want to explore, visualize, and interact with their personal musical universe—discovering how their favorite artists, tracks, and musical genres connect spatially rather than browsing flat lists or static tables.

## Product Purpose

YourMusicVisualizer transforms a listener's music library and taste profile into an interactive 3D celestial graph. Artists, songs, and musical styles appear as star-like nodes arranged in relational constellations and sectors, where node scale and luminosity reflect user affinity and song count, and selecting any sector or star triggers smooth cinematic camera flights into that cluster while audio frequencies animate the cosmos in real time.

## Positioning

Unlike flat streaming dashboards or static annual summary cards, YourMusicVisualizer renders music taste as a navigable 3D force-directed starfield where topology encodes genre/artist/song relationships, star scale encodes affinity and track volume, and Web Audio FFT analysis drives live visual resonance across the constellation.

## Operating Context

- **Primary environment:** Desktop and modern web browsers capable of WebGL2 / 3D canvas rendering with stereo audio output.
- **Core flow:** Overview of the entire musical galaxy -> filtering or hovering over genre/style sectors -> cinematic camera fly-to (`camera-controls` + `GSAP`) into a sector or artist node -> inspecting related tracks/artists and triggering audio playback with live FFT reactivity.
- **Data source (open decision / inferred default):** Streaming account integration (e.g., Spotify / Last.fm) paired with an immediate interactive sample/demo dataset so the visualizer is playable out of the box.

## Capabilities and Constraints

- **Relational Node Graph:** Three node types—Artists, Songs, and Musical Styles/Genres—connected by shared authorship, style, and listener affinity.
- **Data-Driven Star Sizing:** Node radius, corona intensity, and bloom scale dynamically from user affinity weight and song count.
- **Off-Thread Physics:** Force-directed 3D layout calculation (`d3-force-3d` / `3d-force-graph`) must execute in a Web Worker to preserve 60fps camera motion and rendering.
- **Cinematic Sector Navigation:** Smooth, non-jarring camera transitions zooming from macro galaxy view into micro local clusters and individual nodes.
- **Audio-Reactive Visuals:** Real-time Web Audio API FFT spectrum data modulates node brightness, bloom intensity, and connection pulses.
- **HUD Overlay:** Lightweight Tailwind CSS interface floating over the 3D WebGL canvas for search, sector jumping, audio controls, and node inspection without obstructing the starfield.

## Brand Commitments

- **Name:** YourMusicVisualizer
- **Core Metaphor (User-Pinned):** Musical entities (artists, songs, genres) represented as stars and celestial clusters whose size and glow depend on user affinity and song count, navigated via dynamic camera zoom animations into each sector.

## Evidence on Hand

- Greenfield repository (`PRODUCT.md`, `README.md`). No real user streaming credentials or audio assets committed yet; initial implementation requires a rich, realistic mock/demo musical graph dataset and royalty-free/synthesized or preview audio sources clearly labeled as demo data when no account is connected.

## Product Principles

1. **Spatial Truth Over Flat Lists:** Every visual property of a star (size, brightness, clustering distance, orbital links) must encode real musical data—affinity, track volume, and stylistic proximity—never arbitrary decoration.
2. **Unbroken 60fps Immersion:** Physics calculations stay in Web Workers and HUD state updates stay isolated in Zustand so camera flights and audio-reactive bloom never stutter.
3. **The HUD Serves the Cosmos:** 2D interface overlays act as precision telemetry instruments—translucent, unobtrusive, and subordinate to the 3D starfield canvas.
4. **Dynamic Multi-Scale Exploration:** Moving between the macro galaxy view (genres/constellations), mid-range sector view (artists), and micro view (songs/audio playback) must feel like a continuous cinematic journey rather than page reloads.
