@AGENTS.md
@PROJECT.md

# Reglas para la migración a Nebulosas v3

- Plan vigente: `docs/MIGRATION_NEBULOSAS.md`. Trabajá un milestone (o sub-paso) por vez y no adelantes trabajo de otros.
- Referencia visual: `docs/reference/nebulosas-v3.html`. Es Three r128 con globals y escala ~200 u: portá la lógica a R3F + Three 0.186 con `WORLD_SCALE ≈ 0.14`. No copies el archivo.
- No modifiques ni borres el renderer clásico (`src/components/canvas/nebula/`, `classicLayout`) hasta M8.
- Todo lo nuevo va detrás de `rendererMode === 'nebula'` en `useGalaxyStore`. Con `classic`, la app tiene que verse y comportarse igual que antes.
- El HUD (`src/components/hud/`) no se toca antes de M7.
- Los nodos interactivos (`StarNodeMesh`) no se animan en shader: la cámara los sigue por `node.position`.
- Cada material nuevo define `customProgramCacheKey` determinista.
- Tests nuevos: patrón `assert` de `tests/verification/`, sumados al script `test` de `package.json`.
- Antes de dar un paso por terminado: `npx eslint . --max-warnings 0`, `npm run test`, `npm run build`.
- Mostrá el plan y esperá aprobación antes de editar archivos.
