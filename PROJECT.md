# Project: YourMusicVisualizer (Novafy)

Interactive 3D music universe: a listener's library (Spotify liked songs, JSON, or curated presets) becomes a cosmos of genre nebulae, artist and song stars, collisions between related genres and bridge songs. Next.js 16 (App Router), React 19, `@react-three/fiber` + `drei`, Three 0.186, Zustand, GSAP, Web Audio API. Full reference in Spanish: `docs/arquitectura.md`.

## Data flow

```
Spotify (spotifyClient) ──► /api/enrich-tracks (Last.fm tags) ──► spotifyPayload ─┐
JSON import (DataSourceModal) ────────────────────────────────────────────────────┤
Curated presets (data/galaxyPresets: curated tags) ───────────────────────────────┤
                                                                                   ▼
        importers/libraryImporter  ── classifyLibrary (music/dynamicGenres + tagModel)
             │  genres, artists, songs, links, bridges (secondaryGenreId); classic positions
             ▼
        store/useGalaxyStore: baseData ──► layoutForMode(rendererMode)
             │                     classic → layout/classicLayout   nebula → layout/nebulaLayout
             ▼
        canvas/GalaxyScene ── classic/ (per-sector clusters)   or   nebulaV3/ (gas, depth, stars, collisions)
                           └─ star/ (interactive nodes) · galaxy/ (black hole, stardust) · hooks/ (camera)
        hud/ reads the store (cards, search, collisions, spectrum dock)
```

## Module map

| Path | Role |
|---|---|
| `src/app/` | Shell (`page.tsx`, `layout.tsx`), OAuth `callback/`, API routes `api/enrich-tracks` (raw Last.fm tags) and `api/track-preview` (audio proxy) |
| `src/lib/music/` | `tagModel` (canonical tags, weighted profiles), `dynamicGenres` (tag clustering, naming, bridges), `tfidf`, `lastfmTags`, `taxonomy` (HUD subgenre labels), `genreClassifier` (keyword prior only) |
| `src/lib/importers/libraryImporter.ts` | Raw tracks → `MusicGalaxyData` (classification, buckets, affinity, links) |
| `src/lib/spotify/` | `spotifyClient` (PKCE, queue, retries, artist cache), `spotifyPayload` (pure: Spotify + Last.fm → importer input) |
| `src/lib/layout/` | Pure layouts: `classicLayout`, `nebulaLayout` (cores, compaction, black hole void, nodes, bridges), `genreRelations`, `collisionModel` |
| `src/lib/math/`, `src/lib/audio/` | Deterministic PRNG and noise; `WebAudioEngine` (64-band FFT, streaming) |
| `src/store/useGalaxyStore.ts` | Single Zustand store: data per renderer mode, selection, camera mode, collisions, playback, perf |
| `src/components/canvas/nebulaV3/` | Default renderer: `NebulaField` (gas), `NebulaDepth` (fog, knots, dust lanes), `StarField` (luminous stars), `NebulaCollisions`, `BridgeThreads`, `CollisionMarkers`, overview / collision cameras, `nebulaTune` (preview-only look overrides) |
| `src/components/canvas/classic/` | Classic renderer (`rendererMode: 'classic'`): per-sector nebula clusters, `DistantSongsCloud` |
| `src/components/canvas/star/` | `StarNodeMesh`: hit sphere, label, playback pulsar, bridge ring (classic also draws core, corona, rings, features) |
| `src/components/canvas/galaxy/`, `hooks/` | Black hole and spiral stardust; warp-in, arc flights, orbital tracking, perf monitor |
| `src/components/hud/` | Glass HUD: data source modal, artist card, collision card and row, search, telemetry, FFT dock |
| `tests/` | `npm run test` runs every `tests/verification/*.test.ts`; visual scripts in `tests/visual/` (see `tests/README.md`) |

## Invariants

- `nebula` is the default renderer; `classic` stays selectable and must keep its look (`npm run test:visual` baseline).
- Classification is dynamic: nebula count and names come from tags; artists without data go to `OTRAS ÓRBITAS`, never to a random genre.
- Layouts are pure and deterministic (seeded by ids); the black hole always sits in ≥ 3.3 u of free space.
- Interactive nodes are never animated in a shader: stars, hit spheres and the camera share `node.position`.
- Every custom material has a constant `customProgramCacheKey`; per-frame state goes through uniforms.
- Look overrides (`?nebulaTune`, `?clashTune`, `?starTune`, `?fogTune`, `?fps`) work in development and Vercel previews only.

## Milestones

| # | Name | Scope | Status |
|---|------|-------|--------|
| M1–M3 | Canvas modularization & verification | Split nebula, star, galaxy and camera code into submodules; React 19 purity; lint/build at zero; Playwright captures | DONE |
| M4 | Nebulosas v3 · Safety net | `rendererMode` flag, classic visual baseline, Playwright harness | DONE |
| M5 | Nebulosas v3 · Layout & relations | `classicLayout` extracted, `secondaryGenreId`, `computeGenreRelations`, `nebulaLayout`, layout per mode in the store | DONE |
| M6 | Nebulosas v3 · Gas field | Single-draw-call gas field, calibrated look, nebula bloom, adaptive density | DONE |
| M7 | Nebulosas v3 · Collisions | Collision particles, bridge threads and rings, collision camera and HUD, tide boost | DONE |
| M8 | Nebulosas v3 · Polish & default | Black hole void, overview framing, label LOD, `nebula` as default with a per-viewer selector | DONE |
| A1–A4 | Dynamic genres | Tag model, tag clustering with naming and bridges, importer + curated preset tags, Spotify + Last.fm raw tags (no hash fallback) | DONE |
| C1 | Compact cosmos | Compaction phase (overview camera ~30% closer); C1b black hole void for 1–2 nebula cosmos | DONE |
| B1–B3 | Stars & nebula depth | Luminous `StarField` (690 → 100 draw calls with B2), `NebulaDepth`, look overrides and `?fps` on previews | DONE (GPU / phone calibration pending) |
| R | Reorganization | Dead code and template files removed, `canvas/classic/`, suite runner, docs and rules refreshed | DONE |

History: `docs/historial/MIGRATION_NEBULOSAS.md` (M4–M8 plan) and git log.
