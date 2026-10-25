# YourMusicVisualizer

## Context
YourMusicVisualizer es una aplicación web interactiva para oyentes de música que transforma su biblioteca y afinidad musical en un cosmos 3D navegable de estrellas interconectadas por géneros, artistas y canciones.

## Stack
- **Framework UI & Routing:** Next.js 15+ (App Router) con TypeScript y Tailwind CSS
- **Motor Gráfico 3D:** Three.js a través de `@react-three/fiber` y `@react-three/drei`
- **Post-procesado (Glow/Bloom):** `@react-three/postprocessing` (`UnrealBloomPass`)
- **Motor de Físicas de Grafo:** `d3-force-3d` en Web Worker
- **Animación de Cámara:** `camera-controls` + `GSAP`
- **Estado y Audio:** `Zustand` + **Web Audio API** (análisis FFT reactivo)

## Expensive Decisions
- Multi-tenant / Multi-org: Ninguno
- Roles / Permisos: Ninguno (usuario único en cliente)
- Offline / Sync: Ninguno (MVP enfocado en cliente web)
- Multi-idioma / Multi-moneda: Ninguno
