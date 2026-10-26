# YourMusicVisualizer

## Context
YourMusicVisualizer es una aplicación web interactiva para oyentes de música que transforma su biblioteca y afinidad musical (incluyendo el análisis en vivo de canciones en "Me gusta" de Spotify) en un cosmos 3D navegable y cinematográfico con nebulosas de gas estilo Vía Láctea, derivas orbitales vivas, trayectorias de cámara en arco, interfaz flotante de cristal minimalista y previews de audio reactivos por FFT.

## Stack
- **Framework UI & Routing:** Next.js 16 (App Router) con TypeScript y Tailwind CSS
- **Integración Musical:** Spotify Web API (OAuth 2.0 PKCE en cliente, scope `user-library-read`, análisis de hasta 500 *Saved Tracks* y previews de audio on-demand)
- **Motor Gráfico 3D:** Three.js a través de `@react-three/fiber` y `@react-three/drei`
- **Post-procesado (Glow/Bloom):** `UnrealBloomPass` (`three/examples/jsm/postprocessing`)
- **Efectos Volumétricos:** `NebulaClusters` (polvo cósmico y gas nebular con rotación y turbulencia procedural)
- **Motor de Físicas de Grafo:** Distribución galáctica espiral determinista con derivas orbitales en tiempo real
- **Animación de Cámara:** `camera-controls` + `GSAP` (trayectorias parabólicas en arco y secuencia de entrada hiperespacial)
- **Estado y Audio:** `Zustand` + **Web Audio API** (análisis FFT reactivo de 64 bandas sobre streaming de previews de audio)

## Expensive Decisions
- Multi-tenant / Multi-org: Ninguno
- Roles / Permisos: Ninguno (usuario único en cliente)
- Offline / Sync: Ninguno (MVP enfocado en cliente web)
- Multi-idioma / Multi-moneda: Ninguno

## Backlog Actual (Cinemática, Dinámica de Fluidos y Rediseño de UI)
1. [x] Cinemática de entrada hiperespacial ("Warp-in") hacia el interior de la galaxia al cargar la página con trazas estelares en GPU (`WarpTunnelMesh`) y fade-in de HUD.
2. [x] Dinamismo continuo: movimiento orgánico de humo cósmico en nebulosas, ondas de marea gravitacional acústicas (FFT) en el disco de polvo y rotación orbital suave.
3. [x] Etiquetas de texto WebGL Billboard SDF nativas, LOD inteligente por distancia/cámara y selección directa sin colisiones DOM.
4. [x] Rediseño de interfaz minimalista: cápsula flotante de cristal ("Glassmorphism Dock") perimetral con drawer de constelaciones y control de Client ID.
5. [x] Vuelos de cámara cinemáticos en arco parabólico (`power3.inOut` / `power4.out`) y paneo orbital al seleccionar constelaciones y artistas.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
