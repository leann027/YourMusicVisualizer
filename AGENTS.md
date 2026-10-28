# Novafy

## Context
Novafy es una aplicación web interactiva para oyentes de música que transforma su biblioteca y afinidad musical (incluyendo el análisis en vivo de canciones en "Me gusta" de Spotify) en un cosmos 3D navegable y cinematográfico con nebulosas de gas estilo Vía Láctea, derivas orbitales vivas, trayectorias de cámara en arco, interfaz flotante de cristal minimalista y previews de audio reactivos por FFT.

## Stack
- **Framework UI & Routing:** Next.js 16 (App Router) con TypeScript y Tailwind CSS
- **Integración Musical:** Spotify Web API (OAuth 2.0 PKCE en cliente, scope `user-library-read`, análisis de hasta 500 *Saved Tracks* y previews de audio on-demand)
- **Motor Gráfico 3D:** Three.js a través de `@react-three/fiber` y `@react-three/drei`
- **Post-procesado (Glow/Bloom):** `UnrealBloomPass` (`three/examples/jsm/postprocessing`)
- **Renderer de Nebulosas (por defecto):** `nebulaV3/` (gas en un draw call, profundidad, estrellas luminosas, choques entre géneros); el renderer clásico vive en `canvas/classic/`
- **Clasificación y Layout:** géneros dinámicos por tags (Spotify + Last.fm) y layouts puros deterministas (`lib/music/`, `lib/layout/`)
- **Animación de Cámara:** `camera-controls` + `GSAP` (trayectorias parabólicas en arco y secuencia de entrada hiperespacial)
- **Estado y Audio:** `Zustand` + **Web Audio API** (análisis FFT reactivo de 64 bandas sobre streaming de previews de audio)

## Expensive Decisions
- Multi-tenant / Multi-org: Ninguno
- Roles / Permisos: Ninguno (usuario único en cliente)
- Offline / Sync: Ninguno (MVP enfocado en cliente web)
- Multi-idioma / Multi-moneda: Ninguno

## Estado y Backlog
Hitos cerrados y pendientes en `PROJECT.md` (tabla de hitos). Pendiente manual: calibrar estrellas y niebla y medir FPS en GPU real y celular (`?starTune`, `?fogTune`, `?fps`), y probar el login real de Spotify.

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
