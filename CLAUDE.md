@AGENTS.md
@PROJECT.md

# Reglas de trabajo

- Mostrá el plan y esperá aprobación antes de editar archivos. Trabajá un paso por vez, cada uno en su rama (`<tema>/<paso>`) que sale de una rama de integración; mergeá a la integración solo con OK.
- Push, PRs y deploys solo con OK explícito. `main` despliega a producción en Vercel.
- `nebula` es el renderer por defecto y `classic` sigue siendo una opción: con `rendererMode === 'classic'` la app tiene que verse igual (baseline de `npm run test:visual`). Lo nuevo de un solo modo va detrás de `rendererMode`.
- Los nodos interactivos (`StarNodeMesh`) no se animan en shader: la estrella, la esfera de selección y la cámara comparten `node.position`.
- Cada material nuevo define un `customProgramCacheKey` constante; el estado por frame va en uniforms.
- La clasificación de géneros es dinámica por tags (`lib/music/`): nunca asignaciones al azar.
- Referencia visual de Nebulosas: `docs/reference/nebulosas-v3.html` (Three r128, escala ~200 u; se porta a R3F con `WORLD_SCALE ≈ 0.14`, no se copia).
- Tests nuevos: patrón `assert` en `tests/verification/<prefijo>_<tema>.test.ts`; el runner los encuentra solo (ver `tests/README.md`).
- Antes de dar un paso por terminado: `npx eslint . --max-warnings 0`, `npm run test`, `npm run build`; si toca lo visual, también `npm run test:visual`, `npm run test:visual:flows` y `npm run test:visual:shaders`, con capturas antes/después.
