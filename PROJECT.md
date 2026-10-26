# Project: YourMusicVisualizer

## Architecture
YourMusicVisualizer is an interactive 3D WebGL music universe powered by Next.js 16 (App Router), React 19, `@react-three/fiber`, `@react-three/drei`, Three.js, GSAP, and Web Audio API.
The 3D canvas is refactored from monolithic components into single-responsibility submodules:
- `src/components/canvas/star/`: Star core, accretion rings, features, conditional playback pulsar, LOD labels, unit geometries, star shaders.
- `src/components/canvas/nebula/`: Sector nebula cluster, procedural geometry generators, cloud shaders (with pinprick sparks and volumetric gas).
- `src/components/canvas/galaxy/`: Supermassive black hole, spiral stardust points, stardust geometry, relativistic shaders.
- `src/components/canvas/hooks/`: Flight dynamic hooks (`useWarpSequence`, `useArcFlight`, `useOrbitalTracking`, `usePerformanceMonitor`).
- `src/components/canvas/GalaxyScene.tsx`: Top-level composition scene mounting galaxy elements conditionally.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Constellation Lines Default Disabled | Set `linksVisible: false` by default in `useGalaxyStore.ts` and conditionally mount `{linksVisible && <ConstellationLinks />}` in `GalaxyScene.tsx` | M1 | Survey (Explorer 1 & 2) |
| 2 | Nebula Micro-Flash Pinprick Sparks | Fix micro-flashes in nebula shaders to be tiny, sharp optical pinpricks (`exp(-dist*dist*160.0)`) eliminating circular stamp discs and vertex size inflation | M1 | Survey (Explorer 1 & 2) |
| 3 | Volumetric Nebulae Opacity Restoration | Recalibrate proximity fade to `smoothstep(3.5, 12.0, vCamDist)` and raise base brightness to 0.12–0.24, restoring rich, deep luminous gas clouds | M1 | Survey (Explorer 1 & 2) |
| 4 | NebulaClusters Modularization | Split `NebulaClusters.tsx` into `SectorNebulaCluster`, `nebulaGeometry.ts`, `shaders/nebulaShaders.ts`, and index root coordinator | M1 | Survey (Explorer 2) |
| 5 | StarNodeMesh Modularization | Split `StarNodeMesh.tsx` into `StarCoreMesh`, `StarAccretionRings`, `StarFeatures`, `StarPlaybackPulsar`, `StarLabel`, `starGeometries.ts`, `shaders/starShaders.ts`, and index coordinator | M2 | Survey (Explorer 2) |
| 6 | GalacticDustDisc Modularization | Split `GalacticDustDisc.tsx` into `SupermassiveBlackHole`, `SpiralStardustPoints`, `spiralStardustGeometry.ts`, `shaders/blackHoleShaders.ts`, `shaders/spiralDustShaders.ts`, and index coordinator | M2 | Survey (Explorer 2) |
| 7 | CameraFlightController Modularization | Extract hooks (`useWarpSequence`, `useArcFlight`, `useOrbitalTracking`, `usePerformanceMonitor`) into `src/components/canvas/hooks/` | M2 | Survey (Explorer 2) |
| 8 | React 19 Purity & 0 Lint/Build Errors | Ensure strict React 19 hook purity, customProgramCacheKey on materials, 0 ESLint warnings (`npx eslint . --max-warnings 0`), and 0 build errors (`npm run build`) | M2 | Survey (Explorer 2) |
| 9 | Graphify Structural Relationship Validation | Run `graphify update .` to verify clean module extraction, low coupling, and no broken dependency paths | M3 | Survey (Explorer 3) |
| 10 | Playwright Automated Visual Validation | Run automated Playwright visual capture script on `http://localhost:3000` verifying Galaxy Overview, Sector Focus, and Active Playback screenshots | M3 | Survey (Explorer 3) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Visual Refinements & Nebula Modularization | Features 1, 2, 3, 4: Disable constellation lines by default, fix micro-flashes to pinprick sparks, restore volumetric nebulae, and modularize `NebulaClusters` into `src/components/canvas/nebula/` | None | DONE |
| M2 | Canvas Core Modularization & React 19 Purity | Features 5, 6, 7, 8: Modularize `StarNodeMesh`, `GalacticDustDisc`, and `CameraFlightController` into clean submodules; verify React 19 purity, customProgramCacheKeys, 0 lint warnings, and 0 build errors | M1 | DONE |
| M3 | Automated Structural & Visual Verification | Features 9, 10: Run Graphify AST update and relationship analysis; run Playwright test suite capturing Galaxy Overview, Sector Focus, and Active Playback at `http://localhost:3000`; publish `TEST_READY.md` | M2 | DONE |

## Interface Contracts
### `src/components/canvas/nebula/`
- `NebulaClusters` (root export):
  - Props: `{ data?: MusicGalaxyData; stellarBrightness?: number }`
  - Internal components:
    - `SectorNebulaCluster`: Renders individual sector ionized gas clouds and starbursts.
    - `nebulaGeometry.ts`: `generateSectorNebulaGeometry(options)` returning inner & outer buffer geometries.
    - `shaders/nebulaShaders.ts`: `createNebulaMaterial(isInner, baseColor)` with pinprick spark GLSL and volumetric falloff.

### `src/components/canvas/star/`
- `StarNodeMesh` (root export):
  - Props: `{ node: GalaxyNode; position: [number, number, number]; onSelect: (node: GalaxyNode) => void }`
  - Internal components:
    - `StarCoreMesh`: Hit sphere, core sphere with limb darkening.
    - `StarAccretionRings`: Primary & secondary rings, equatorial dust.
    - `StarFeatures`: Polar jets, diffraction cross, micro-satellites.
    - `StarPlaybackPulsar`: Conditionally mounted during active audio playback to handle acoustic waves and revolving sparks.
    - `StarLabel`: SDF WebGL Billboard text with intelligent LOD.
    - `starGeometries.ts`: Shared static unit geometries.
    - `shaders/starShaders.ts`: Shaders with `customProgramCacheKey`.

### `src/components/canvas/galaxy/`
- `GalacticDustDisc` (root export):
  - Props: `{ stellarBrightness?: number }`
  - Internal components:
    - `SupermassiveBlackHole`: Central event horizon, photon ring, relativistic lensing arches.
    - `SpiralStardustPoints`: 5,600 procedural stardust particles across bulge, arms, and halo.
    - `spiralStardustGeometry.ts`: Procedural particle buffer generator.
    - `shaders/blackHoleShaders.ts`: Accretion disk and lensing shaders.
    - `shaders/spiralDustShaders.ts`: Stardust injection shaders.

### `src/components/canvas/hooks/`
- `useWarpSequence`: Initial hyperspace camera entrance transition.
- `useArcFlight`: Parabolic arc flights to selected stars/sectors.
- `useOrbitalTracking`: Following selected stars as galaxy rotates.
- `usePerformanceMonitor`: Frame-rate and camera telemetry monitoring.

### `src/store/useGalaxyStore.ts`
- `linksVisible`: Defaults to `false`.
- `toggleLinksVisible`: Toggles `linksVisible` boolean.

## Code Layout
- `src/components/canvas/nebula/`:
  - `SectorNebulaCluster.tsx`
  - `nebulaGeometry.ts`
  - `shaders/nebulaShaders.ts`
  - `index.ts` (re-exports `NebulaClusters`)
- `src/components/canvas/star/`:
  - `StarCoreMesh.tsx`
  - `StarAccretionRings.tsx`
  - `StarFeatures.tsx`
  - `StarPlaybackPulsar.tsx`
  - `StarLabel.tsx`
  - `starGeometries.ts`
  - `shaders/starShaders.ts`
  - `index.ts` (re-exports `StarNodeMesh`)
- `src/components/canvas/galaxy/`:
  - `SupermassiveBlackHole.tsx`
  - `SpiralStardustPoints.tsx`
  - `spiralStardustGeometry.ts`
  - `shaders/blackHoleShaders.ts`
  - `shaders/spiralDustShaders.ts`
  - `index.ts` (re-exports `GalacticDustDisc`)
- `src/components/canvas/hooks/`:
  - `useWarpSequence.ts`
  - `useArcFlight.ts`
  - `useOrbitalTracking.ts`
  - `usePerformanceMonitor.ts`
- `src/store/`: `useGalaxyStore.ts`
- `src/components/canvas/GalaxyScene.tsx`
- `.agents/teamwork/`: Agent coordination metadata
