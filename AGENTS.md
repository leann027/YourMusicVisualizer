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
1. Cinemática de entrada hiperespacial ("Warp-in") hacia el interior de la galaxia al cargar la página.
2. Dinamismo continuo: movimiento orgánico de humo cósmico en nebulosas y rotación orbital suave de artistas y canciones.
3. Etiquetas de texto con escala por distancia (`distanceFactor`), LOD lejana y selección directa con clic.
4. Rediseño de interfaz minimalista: cápsula flotante de cristal ("Glassmorphism Dock") para evitar la sobrecarga visual.
5. Vuelos de cámara cinemáticos en arco parabólico y paneo orbital al seleccionar constelaciones y artistas.
