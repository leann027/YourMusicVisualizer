# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Audiófilos, melómanos y usuarios de plataformas de streaming (Spotify, Last.fm) que desean explorar, redescubrir y escuchar su catálogo musical personal transformado en un universo tridimensional interactivo, estético y envolvente.

## Product Purpose

YourMusicVisualizer transforma colecciones de canciones y hábitos de escucha en un cosmos 3D navegable a 60 FPS. Mapea la taxonomía musical jerárquicamente: los géneros son constelaciones y cúmulos galácticos, los artistas son cuerpos estelares (gigantes y supergigantes según densidad de catálogo) y las pistas son satélites orbitales interactivos. El éxito significa ofrecer una experiencia sensorial donde el descubrimiento sonoro y la belleza visual convergen con alta fidelidad y respuesta auditiva en tiempo real.

## Positioning

A diferencia de los visualizadores de música convencionales basados en osciloscopios o túneles de partículas genéricos, YourMusicVisualizer genera una cartografía astronómica personalizada basada en datos reales de afinidad, metadatos y frecuencia de escucha, fusionando simulación de polvo cósmico (estilo James Webb / Hubble) con reproducción de audio nativa mediante Web Audio API.

## Operating Context

Navegadores web modernos de escritorio y dispositivos con aceleración WebGL. Interacción fluida mediante controles orbitales de cámara (CameraControls + GSAP), selector de constelaciones en el HUD, preajustes de escala cósmica (50, 150 y 300 pistas), atajos de teclado y reproducción de audio interactiva con análisis FFT de subgraves.

## Capabilities and Constraints

- **Visualización WebGL 60 FPS**: Renderizado eficiente en un único canvas Three.js utilizando mallas compartidas, sistemas de partículas con shaders GLSL personalizados y billboard SDF text para evitar colisiones DOM.
- **Fidelidad Cósmica Etérea**: Niebla galáctica difusa en flujo fluido continuo (rotación kepleriana diferencial y ondas senoidales 3D), nebulosas volumétricas cuya masa y zarcillos escalan con la cantidad de canciones del género, y estrellas nítidas sin encandilamiento ni saltos bruscos de brillo.
- **Jerarquía y Evolución Visual**: Hitos visuales para artistas destacados (anillos planetarios sinusoidales suaves, satélites orbitales, picos de difracción óptica de 4 puntas) y géneros dominantes (jets de energía polar relativistas).
- **Seguridad Fotosensible (WCAG 2.3)**: Prohibición estricta de parpadeos estroboscópicos o ráfagas repentinas de luz; transiciones suaves mediante amortiguación (lerp) temporal.
- **Privacidad y Conexión Híbrida**: Soporte para perfiles curados instantáneos sin login, además de integración con API de Spotify / Last.fm con resiliencia ante límites de tasa (429 rate limit).

## Brand Commitments

- **Identidad**: YourMusicVisualizer — Cosmos Musical 3D.
- **Estética Nuclear**: Cian espacial `#00F5D4`, magenta cósmico `#FF2A85`, lima iónica `#CCFF00`, violeta estelar `#A855F7`, sobre fondo de vacío profundo `#050508`.
- **Tipografía**: Fuentes monoespaciadas y sans-serif de precisión instrumental (`Space Grotesk`, `JetBrains Mono`).

## Evidence on Hand

- Código base Next.js 16 (App Router, Turbopack) con React 19 y Three.js.
- Motor de audio procedural y streaming [`WebAudioEngine.ts`](src/lib/audio/WebAudioEngine.ts).
- Preajustes deterministas de galaxias de 50, 150 y 300 pistas en [`galaxyPresets.ts`](src/data/galaxyPresets.ts).
- Pipeline de post-procesamiento [`PostProcessingPipeline.tsx`](src/components/canvas/PostProcessingPipeline.tsx) con Bloom calibrado.

## Product Principles

1. **La Música Manda en la Geometría**: Cada elemento visual (tamaño estelar, radio de la nebulosa, satélites) debe reflejar directamente datos musicales reales (afinidad, pistas, densidad de artistas).
2. **Fidelidad Astronómica antes que Artificios**: Priorizar polvo cósmico etéreo, fluidez de fluidos y luz suave sobre efectos invasivos o geométricos rígidos.
3. **Claridad y Serenidad Óptica**: Nunca sacrificar la legibilidad de títulos ni cegar al usuario con destellos o cambios violentos de iluminación al interactuar.
4. **Respuesta Rítmica Orgánica**: Las pulsaciones y expansiones con el audio deben respirar con el ritmo natural de la música sin interrumpir la navegación.
