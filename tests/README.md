# Tests

## Verificación (`npm run test`)

`tests/run-verification.ts` corre cada `tests/verification/*.test.ts` en su propio proceso y al final lista **todas** las suites que fallaron. Con argumentos filtra por nombre de archivo:

```bash
npm run test               # todas las suites
npm run test -- dg_ m7_    # solo las que contienen "dg_" o "m7_"
npx tsx tests/verification/dg_star_field.test.ts   # una suite suelta
```

Cada suite es un script con el patrón `assert(condición, nombre, detalle)`: imprime `[PASS]` / `[FAIL]` y termina con `process.exit(1)` si algo falla. Una suite nueva solo tiene que estar en `tests/verification/` con el sufijo `.test.ts`; el runner la encuentra solo.

| Prefijo | Qué cubre |
|---|---|
| `m2_` | Modularización del canvas: exports de `star/` y `galaxy/`, geometrías, shaders y cache keys |
| `m4_` | `rendererMode` (`classic` / `nebula`) |
| `m5_` | Layout clásico (fixture de posiciones), géneros secundarios, relaciones entre géneros, layout nebula y store |
| `m6_` | Campo de gas: geometría, shaders, targets de foco y calibración |
| `m7_` | Choques, hilos puente, cámara de choque, HUD de choques y marea |
| `m8_` | Encuadre de la vista general, etiquetas y modo por defecto |
| `dg_` | Clasificación dinámica (modelo de tags, agrupamiento, importer, Spotify + Last.fm), cosmos compacto, estrellas luminosas, profundidad y tuning en previews |

`fixtures/`: bibliotecas sintéticas con verdad de terreno (`syntheticLibraries.ts`), payloads de casos borde (`syntheticPayloads.ts`) y el fixture de posiciones del layout clásico (`classic_positions.json`, se regenera con `npx tsx tests/verification/fixtures/generateClassicPositions.ts` solo cuando el cambio es intencional).

## Visuales (`tests/visual/`, necesitan `npm run dev` salvo los de shaders)

| Script | Para qué |
|---|---|
| `npm run test:visual` | Captura el modo clásico (presets 50 y 300) y lo compara con el baseline de `test-results/visual/baseline-classic` |
| `npm run test:visual:baseline` | Regenera ese baseline (solo con un cambio visual intencional y revisado) |
| `npm run test:visual:flows` | Checklist de flujos en los dos modos (selección, cámara, choques, preferencias) |
| `npm run test:visual:shaders` | Compila y renderiza todos los shaders de Nebulosas en WebGL2 (SwiftShader); no necesita el servidor |
| `npm run test:visual:clash` | Grilla de calibración de los choques |
| `node tests/visual/calibrateGas.mjs` | Grilla de calibración del gas (`?nebulaTune`) |

`captureScenes.mjs` y `compareScenes.mjs` también sirven para comparar el modo nebula a mano (`--renderer nebula`). Las escenas de nebula tienen animación: entre corridas pueden diferir un poco sin que haya cambios.
