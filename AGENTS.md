# YourMusicVisualizer

## Context
YourMusicVisualizer es una aplicación web interactiva para oyentes de música que transforma su biblioteca y afinidad musical (incluyendo el análisis en vivo de sus últimas 50 canciones en "Me gusta" mediante inicio de sesión con Spotify) en un cosmos 3D navegable de estrellas interconectadas por géneros, artistas y canciones con previews de audio reactivos por FFT.

## Stack
- **Framework UI & Routing:** Next.js 16 (App Router) con TypeScript y Tailwind CSS
- **Integración Musical:** Spotify Web API (OAuth 2.0 PKCE en cliente, scope `user-library-read`, análisis de *Saved Tracks* y previews de audio)
- **Motor Gráfico 3D:** Three.js a través de `@react-three/fiber` y `@react-three/drei`
- **Post-procesado (Glow/Bloom):** `UnrealBloomPass` (`three/examples/jsm/postprocessing`)
- **Motor de Físicas de Grafo:** `d3-force-3d` / distribución espacial determinista
- **Animación de Cámara:** `camera-controls` + `GSAP`
- **Estado y Audio:** `Zustand` + **Web Audio API** (análisis FFT reactivo sobre previews de Spotify con respaldo sintetizado)

## Expensive Decisions
- Multi-tenant / Multi-org: Ninguno
- Roles / Permisos: Ninguno (usuario único en cliente)
- Offline / Sync: Ninguno (MVP enfocado en cliente web)
- Multi-idioma / Multi-moneda: Ninguno
