# Migración a Nebulosas v3

Plan para llevar el modelo de `docs/reference/nebulosas-v3.html` a Novafy sin perder funcionalidades.
Sigue el formato de milestones de `PROJECT.md` (continúa desde M3).

## Principios

1. **El store es el contrato.** El HUD (`TelemetryHUD`, `StellarSearchBar`, `ArtistSleeveCard`, `FFTSpectrumDock`, `DataSourceModal`) no se toca hasta M7. Todo lo nuevo lee y escribe `useGalaxyStore` igual que lo actual.
2. **Las posiciones viven en los datos.** La cámara (`useArcFlight`, `useOrbitalTracking`), la búsqueda y los labels usan `node.position`. Si el layout nuevo escribe posiciones nuevas en `MusicGalaxyData`, todas esas funciones siguen andando sin cambios.
3. **Convivencia con flag.** `rendererMode: 'classic' | 'nebula'` en el store; `classic` es el default hasta M8.
4. **Cada milestone deja CI en verde:** `npm run lint`, `npm run test`, `npm run build`.
5. **La referencia HTML no se copia tal cual.** Es Three r128 con globals y escala ~200 u. Novafy usa R3F + Three 0.186 y escala ~30 u. Se porta la lógica, no el archivo.

## Datos clave del repo (leer antes de empezar)

| Tema | Dónde | Qué implica |
|---|---|---|
| Posiciones calculadas dentro del importer | `src/lib/importers/libraryImporter.ts` (`getDynamicSectorPlacement`, ~líneas 395–430) | Hay que extraer el layout a un módulo puro antes de cambiarlo (M5) |
| Escala del mundo | Géneros en radio 18–34; nebulosa exterior hasta ~17 u; `cameraDistance` 33.1 | Factor de la referencia → Novafy: `WORLD_SCALE ≈ 0.14` |
| Relaciones entre géneros ya existen | Cada track tiene `secondaryGenre` (del `genreClassifier`); el importer crea links `influence` artista → género secundario | Las colisiones salen de datos que ya tenés. Falta guardar `secondaryGenreId` en `SongNode` |
| Contenedor que rota | `GalaxyScene` rota `celestial-galaxy-cosmos`; la cámara convierte `node.position` con `matrixWorld` | Todo lo nuevo va dentro de ese `group` |
| Nodos interactivos estáticos | `StarNodeMesh` + seguimiento orbital de cámara | Las órbitas en shader solo para polvo decorativo. Las canciones seleccionables no orbitan |
| Bloom | `PostProcessingPipeline`: strength 0.08, threshold 0.92, modulado por FFT | El gas aditivo nuevo puede saturar. Calibrar en M6 |
| FFT | `webAudioEngine.sampleFFT()` cacheado por frame (`subBass`, `midHarmonic`, `highShimmer`, `energy`) | Pasarlo como uniforms; se puede llamar desde varios componentes |
| Filtro de afinidad | `minAffinityFilter` se aplica en star, nebula, links y song cloud | El campo de partículas nuevo necesita `aAffinity` + `uMinAffinity` |
| Tests | Scripts `tsx` con `assert` propio en `tests/verification/` | Los tests nuevos siguen ese patrón y se suman al script `test` de `package.json` |

## Inventario de funcionalidades (checklist de no-regresión)

Correr esta lista al cerrar cada milestone, en los dos modos.

- [ ] Warp-in de entrada (`WarpTunnelMesh`, `useWarpSequence`) y skip
- [ ] Vuelos en arco al seleccionar género / artista / canción (`useArcFlight`)
- [ ] Seguimiento orbital del nodo seleccionado mientras rota la galaxia (`useOrbitalTracking`)
- [ ] Drawer de Constelaciones → `selectSector`
- [ ] Próxima → `flyToNeighborSector`
- [ ] Ficha del artista (`ArtistSleeveCard`) y colapso
- [ ] Buscador (`StellarSearchBar`) → `selectNode`
- [ ] Filtros & Brillo → `minAffinityFilter`, `stellarBrightness`
- [ ] Bloom ON/OFF
- [ ] Pulso FFT: dock de espectro, pulsar de la estrella que suena, respiración de nebulosas
- [ ] Presets 50p / 150p / 300p
- [ ] Conectar Spotify / Datos (`DataSourceModal`, callback OAuth, `/api/enrich-tracks`, `/api/track-preview`)
- [ ] Líneas de constelación (`linksVisible`)
- [ ] Labels con LOD (`StarLabel`)
- [ ] Telemetría de rendimiento (`usePerformanceMonitor`)
- [ ] `prefers-reduced-motion`

---

## M4 · Red de seguridad (sin cambios visuales)

**Objetivo:** poder comparar y revertir.

- Rama `feat/nebulosas-v3`.
- `useGalaxyStore`: agregar `rendererMode: 'classic' | 'nebula'` (default `'classic'`) y `setRendererMode`. Leer `?renderer=nebula` al montar en `src/app/page.tsx`.
- `GalaxyScene`: todavía no ramifica; solo lee el flag.
- Capturas base de Galaxy Overview, Sector Focus y Active Playback (reusar el script de Playwright de M3) para los presets 50 y 300.
- Anotar FPS en el celular con el preset 300.

**Listo cuando:** CI verde, cero cambios visuales en `classic`.

## M5 · Layout desacoplado y relaciones entre géneros

**Objetivo:** que el modo `nebula` muestre la distribución nueva con los componentes actuales, y que todo siga funcionando.

1. **Extraer el layout clásico** a `src/lib/layout/classicLayout.ts`:
   `applyClassicLayout(data: MusicGalaxyData): MusicGalaxyData`. El importer lo llama.
   Test: las posiciones de los presets 50/150/300 son idénticas antes y después.
2. **Guardar el género secundario:** `SongNode.secondaryGenreId?: string` (opcional, no rompe nada). Lo completa el importer cuando el `secondaryGenre` existe como bucket.
3. **Relaciones:** `src/lib/layout/genreRelations.ts`

   ```ts
   export interface GenreRelation {
     a: string;              // genreId
     b: string;              // genreId
     sharedSongs: number;    // canciones con primario en uno y secundario en el otro
     bridgeSongIds: string[]; // hasta 3, ordenadas por affinity
   }
   export function computeGenreRelations(data: MusicGalaxyData, minShared = 2): GenreRelation[];
   ```

   Fuentes, en orden: `secondaryGenreId` de canciones, links `influence` artista → género, y tags compartidos entre artistas de géneros distintos (con poco peso).
4. **Layout nebulosa:** `src/lib/layout/nebulaLayout.ts`, portando `layout()` de la referencia:
   - Centros en esfera de Fibonacci con dos capas de radio, escalados con `WORLD_SCALE`.
   - Relajación (320 iteraciones): resorte para pares relacionados, `dist = (Sa+Sb)·(0.95 − 0.35·n/nMax)`; repulsión `(Sa+Sb)·1.3` para el resto; recentrar.
   - `S` (radio de nebulosa) = `f(songCount)` con `sqrt`, en la escala actual (~5–9 u).
   - Artistas por filotaxis dentro de su nebulosa; canciones con el ángulo dorado actual alrededor del artista (mismos radios mínimos, para no pisar la corona).
   - Canciones puente (`bridgeSongIds`) reubicadas en el disco de contacto del par.
   - Exportar también `relations` con `m` (punto de contacto), `dir` y `radius` para M7.
5. **Store:** aplicar el layout según `rendererMode` en `setPresetScale`, `loadCustomGalaxyData` y `setRendererMode`. Al cambiar de modo, remapear `selectedNode` por `id` para que tenga la posición nueva.

**Tests nuevos** (`tests/verification/m5_layout.test.ts`): determinismo (mismo input → mismas posiciones), cero NaN/Infinity, pares sin relación separados ≥ `(Sa+Sb)·1.2`, pares relacionados solapados en proporción a `sharedSongs`, toda canción puente a menos de `radius` del punto de contacto.

**Listo cuando:** con `?renderer=nebula` se ven las nebulosas, estrellas y canciones actuales en las posiciones nuevas, y toda la checklist pasa.

## M6 · Campo de nebulosas v3

**Objetivo:** reemplazar `NebulaClusters` por el gas con filamentos, solo en modo `nebula`.

- Nuevo `src/components/canvas/nebulaV3/`:
  - `nebulaFieldGeometry.ts`: un solo `BufferGeometry` para todos los géneros (1 draw call). Gas con fbm "ridged", frente de ionización, polvo de Plummer alrededor de cada artista. Atributos: `color`, `size`, `alpha`, `kind`, `gid`, `aid`, `anchor`, `axis`, `spin`, `seed`, `aAffinity`.
  - `shaders/nebulaFieldShaders.ts`: `ShaderMaterial` con `customProgramCacheKey = 'nebula-field-v3'`. Mantener los pinprick sparks actuales (`exp(-d²·160)` + cruz) para el gas, disparados por `uHighShimmer`.
  - `NebulaField.tsx`: uniforms desde el store y la FFT:

    | Uniform | Fuente |
    |---|---|
    | `uGain` | `stellarBrightness` × `sqrt(base/n)` |
    | `uMinAffinity` | `minAffinityFilter` |
    | `uFocus`, `uFocusAmt` | `selectedSectorId` + `cameraMode !== 'galaxy'` |
    | `uArtist`, `uArtistAmt` | `selectedNode` si es artista |
    | `uSubBass` | respiración del gas, más fuerte en el género que suena |
    | `uHighShimmer` | frecuencia de sparks |
    | `uTime` | 0 con `prefers-reduced-motion` |

- `GalaxyScene`: `{rendererMode === 'nebula' ? <NebulaField /> : <NebulaClusters />}` dentro del `group` que rota.
- Órbitas solo para el polvo decorativo (`kind` polvo). `StarNodeMesh` de canciones queda fijo.
- Bloom en modo nebula: probar threshold 0.95 y strength 0.06. Si satura, bajar el alpha del gas, no el bloom.
- `usePerformanceMonitor`: si FPS < 40 por 3 s, bajar densidad (35k → 20k).

**Tests:** geometría finita, conteos por género proporcionales a `songCount`, cache key determinista (como en milestone2).

**Listo cuando:** preset 300 ≥ 50 FPS en el celular y la checklist pasa en los dos modos.

## M7 · Choques entre nebulosas

**Objetivo:** mostrar las relaciones de M5.

- `src/components/canvas/nebulaV3/NebulaCollisions.tsx`: frente de choque (disco curvo con color mezclado y cortes de ruido), corrientes de marea (Bézier núcleo A → núcleo B animada en shader) y gas mixto. Un solo `Points`.
- Canciones puente: ya están ubicadas por M5. Agregar en `StarFeatures` un anillo con el color mezclado si `secondaryGenreId` está en el par. Agregar hilos artista → canción puente → núcleo B como tipo `'bridge'` en `MusicLink` (lo dibuja `ConstellationLinks`, visible aunque `linksVisible` sea false cuando hay foco en el choque).
- Store: `selectedCollision: { a: string; b: string } | null`, `selectCollision()`, `cameraMode: 'collision'`. `useArcFlight`: destino = punto de contacto, cámara perpendicular a `dir`.
- HUD (primer cambio de UI): en la ficha del género, fila "Choca con" con `∩ n`; ficha de choque con canciones puente. Marcadores `∩ n` como `StarLabel` en el punto de contacto, con el mismo LOD.
- FFT: si suena una canción puente, las mareas de ese par aceleran con `energy`.

**Listo cuando:** se puede navegar universo → choque → canción puente → reproducir, y la checklist pasa.

## M8 · Pulido y cambio de default

- Labels: máximo 5 géneros + 4 choques visibles por cercanía.
- Revisar warp-in con el layout nuevo (destino de cámara final).
- `rendererMode` default → `'nebula'`. `classic` queda una versión como opción en el HUD.
- Versión siguiente: borrar `nebula/` clásico, `classicLayout` si ya no se usa, y actualizar `PROJECT.md` y los tests de milestone2.

---

## Cómo pedírselo a Claude Code

Una sesión por milestone (M6 y M7 se pueden partir en sub-pasos). Empezar siempre en plan mode.

```
Leé CLAUDE.md, PROJECT.md y docs/MIGRATION_NEBULOSAS.md.
Vamos con M5, paso 1: extraer el layout clásico a src/lib/layout/classicLayout.ts.
Alcance: libraryImporter.ts, el módulo nuevo y su test. Nada más.
Criterio: posiciones idénticas para los presets 50/150/300, lint/test/build en verde.
Mostrame el plan antes de editar.
```

Al cerrar cada paso: commit chico, checklist de no-regresión, y si cambió algo visual, captura en los dos modos.
