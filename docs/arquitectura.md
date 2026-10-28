# Documentación Técnica y Guía de Arquitectura de Novafy (YourMusicVisualizer)

**Versión del Proyecto:** 1.1.0  
**Fecha de Publicación:** 27 de Octubre de 2026  
**Audiencia:** Desarrolladores de software, ingenieros de gráficos WebGL, arquitectos web y nuevos colaboradores.  
**Estado del Repositorio:** Producción / Estable. Migración a Nebulosas v3 completa en `feat/nebulosas-v3` (M4–M8; `nebula` es el modo por defecto y `classic` queda como opción). Pendiente: validación en hardware real (ver `docs/MIGRATION_NEBULOSAS.md`).

---

## Índice General

1. [Propósito del Proyecto](#1-propósito-del-proyecto)
2. [Stack Tecnológico y Versiones Exactas](#2-stack-tecnológico-y-versiones-exactas)
   - 2.1 [Tabla de Dependencias Declaradas e Instaladas](#21-tabla-de-dependencias-declaradas-e-instaladas)
   - 2.2 [APIs Nativas de Plataforma y Protocolos Web](#22-apis-nativas-de-plataforma-y-protocolos-web)
   - 2.3 [Configuración del Compilador, Bundler y Entorno](#23-configuración-del-compilador-bundler-y-entorno)
3. [Estructura de Directorios y Roles Arquitectónicos](#3-estructura-de-directorios-y-roles-arquitectónicos)
   - 3.1 [Árbol Global del Repositorio](#31-árbol-global-del-repositorio)
   - 3.2 [Detalle y Responsabilidad por Carpeta](#32-detalle-y-responsabilidad-por-carpeta)
4. [Puntos de Entrada y Flujo de Operación de Punta a Punta](#4-puntos-de-entrada-y-flujo-de-operación-de-punta-a-punta)
   - 4.1 [Puntos de Entrada de la Aplicación](#41-puntos-de-entrada-de-la-aplicación)
   - 4.2 [Flujo Operacional Paso a Paso (End-to-End User Journey)](#42-flujo-operacional-paso-a-paso-end-to-end-user-journey)
5. [Dependencias Externas y Persistencia](#5-dependencias-externas-y-persistencia)
   - 5.1 [Servicios y APIs Externas](#51-servicios-y-apis-externas)
   - 5.2 [Tipografías y Recursos Estáticos](#52-tipografías-y-recursos-estáticos)
   - 5.3 [Almacenamiento en Cliente (localStorage)](#53-almacenamiento-en-cliente-localstorage)
   - 5.4 [Ausencia de Bases de Datos y Cookies](#54-ausencia-de-bases-de-datos-y-cookies)
6. [Instrucciones de Ejecución Local](#6-instrucciones-de-ejecución-local)
   - 6.1 [Requisitos del Sistema](#61-requisitos-del-sistema)
   - 6.2 [Variables de Entorno y Configuración de Spotify](#62-variables-de-entorno-y-configuración-de-spotify)
   - 6.3 [Scripts de npm y Guía Paso a Paso](#63-scripts-de-npm-y-guía-paso-a-paso)
7. [Zonas Frágiles Identificadas](#7-zonas-frágiles-identificadas)
   - 7.1 [Inventario de Código Sin Pruebas Automatizadas](#71-inventario-de-código-sin-pruebas-automatizadas)
   - 7.2 [Archivos de Gran Tamaño (> 250 - 300 Líneas)](#72-archivos-de-gran-tamaño--250---300-líneas)
   - 7.3 [Auditoría de Comentarios de Deuda Técnica (TODOs / FIXMEs)](#73-auditoría-de-comentarios-de-deuda-técnica-todos--fixmes)
   - 7.4 [Duplicación de Código y Lógica Redundante](#74-duplicación-de-código-y-lógica-redundante)
   - 7.5 [Riesgos de Memoria WebGL, Ciclo de Vida de Audio y Almacenamiento](#75-riesgos-de-memoria-webgl-ciclo-de-vida-de-audio-y-almacenamiento)
8. [Gestión de Dudas y Aspectos No Deducibles (`PREGUNTA:`)](#8-gestión-de-dudas-y-aspectos-no-deducibles-pregunta)

---

## 1. Propósito del Proyecto

> **Novafy (YourMusicVisualizer)** es una aplicación web interactiva que transforma bibliotecas musicales y hábitos de escucha —incluyendo la sincronización en vivo de canciones en "Me gusta" de Spotify mediante OAuth 2.0 PKCE— en una galaxia tridimensional navegable en tiempo real, modelando géneros como constelaciones nebulares, artistas como estrellas gigantes con discos de acreción y canciones como satélites orbitales que rotan alrededor de un agujero negro central supermasivo.
> 
> Diseñada para melómanos y audiófilos, la plataforma ofrece una experiencia cinematográfica de descubrimiento sonoro mediante trayectorias de cámara en arco parabólico, transiciones hiperespaciales, una interfaz perimetral de cristal minimalista y un motor de audio reactivo con análisis espectral FFT de 64 bandas en el navegador sin requerir infraestructura de servidor compleja.

---

## 2. Stack Tecnológico y Versiones Exactas

El stack ha sido analizado e inspeccionado de manera empírica a través de los manifiestos `package.json`, `package-lock.json` y la ejecución del comando `npm list --depth=0`.

### 2.1 Tabla de Dependencias Declaradas e Instaladas

| Dependencia / Paquete | Versión Declarada (`package.json`) | Versión Exacta Instalada (`lockfile` / `npm list`) | Categoría Arquitectónica | Rol Técnico en Novafy |
| :--- | :--- | :--- | :--- | :--- |
| **next** | `16.4.3` | `16.4.3` | Framework Web & Routing | App Router, Server Components, Route Handlers (`/api`), optimización de tipografía (`next/font`) y Turbopack bundler. |
| **react** | `19.3.0` | `19.3.0` | UI Core Library | Biblioteca base para la gestión de interfaces declarativas y ciclo de vida; base de R3F v9. |
| **react-dom** | `19.3.0` | `19.3.0` | Renderizador DOM | Montaje y reconciliación de la interfaz de usuario en el árbol DOM del navegador. |
| **three** | `^0.186.1` | `0.186.1` | Motor Gráfico 3D | Renderizado WebGL 2.0, geometrías de buffer (`BufferGeometry`), materiales personalizados y shaders GLSL con `onBeforeCompile`. |
| **@react-three/fiber** | `^9.8.2` | `9.8.2` | Reconciliador 3D R3F | Puente declarativo entre React 19 y Three.js; administra el canvas WebGL y el bucle continuo a 60 FPS (`useFrame`). |
| **@react-three/drei** | `^10.7.9` | `10.7.9` | Colección de Helpers R3F | Componentes de utilidad: `<Billboard>`, tipografía GPU Signed Distance Field (`<Text>`), `<Stars>` y contenedor de cámara. |
| **camera-controls** | `^3.1.2` | `3.1.2` | Control Cinemático de Cámara | Manipulación matemática orbital (azimut, inclinación, dolly, pan) y límites euclidianos en el espacio 3D. |
| **gsap** | `^3.15.0` | `3.15.0` | Motor de Animación | Interpolaciones temporales no lineales (`power4.out`, `power3.inOut`) para cinemática Warp-In y vuelos de cámara en arco parabólico. |
| **zustand** | `^5.0.16` | `5.0.16` | Gestión de Estado Global | Store reactivo desacoplado (`useGalaxyStore`) con selector granular sin re-renderizados innecesarios del lienzo 3D. |
| **tailwindcss** | `^4` | `4.3.3` | Framework de Estilos | Estilos utilitarios para el HUD perimetral de cristal, utilizando el motor nativo de Tailwind v4. |
| **@tailwindcss/turbopack**| `^4` | `4.3.3` | Integración Bundler | Plugin de transformación directa de hojas de estilo en el pipeline de desarrollo y build de Turbopack. |
| **lucide-react** | `^1.61.0` | `1.61.0` | Iconografía Vectorial | Iconos minimalistas SVG embebidos en el HUD, reproductor y modales de configuración. |
| **@vercel/analytics** | `^2.0.1` | `2.0.1` | Telemetría Web | Captura anónima de métricas Core Web Vitals en despliegues sobre la plataforma Vercel. |
| **typescript** | `^5` | `5.9.3` | Lenguaje & Tipado Estático | Tipado riguroso en todo el proyecto (`strict: true`), con target `ES2017` y resolución de módulos `bundler`. |
| **eslint** | `^9` | `9.39.5` | Linter de Código Fuente | Análisis estático de calidad de código mediante configuración plana (`eslint.config.mjs`). |
| **eslint-config-next** | `16.4.3` | `16.4.3` | Reglas de Linter Next.js | Conjunto de reglas oficiales para App Router, optimización de fuentes y directivas de React. |
| **tsx** | `^4.23.15` | `4.23.15` | Ejecutor de Pruebas | Entorno de ejecución directa de scripts TypeScript sin paso previo de compilación (`npm test`). |
| **@types/three** | `^0.186.0` | `0.186.0` | Tipado TypeScript | Definiciones de tipos para el motor Three.js. |
| **@types/node** | `^20` | `20.19.43` | Tipado TypeScript | Definiciones del entorno de ejecución de Node.js (Route Handlers y scripts). |
| **@types/react** | `^19` | `19.3.0` | Tipado TypeScript | Definiciones de tipos para React 19. |
| **@types/react-dom** | `^19` | `19.3.0` | Tipado TypeScript | Definiciones de tipos para React DOM 19. |

### 2.2 APIs Nativas de Plataforma y Protocolos Web

- **Web Audio API (`AudioContext`):**
  - Instanciación singleton perezosa vinculada a la primera interacción del usuario.
  - Grafo de procesamiento: `MediaElementAudioSourceNode` $\to$ `GainNode` $\to$ `AnalyserNode` (`fftSize = 128`, 64 bandas espectrales) $\to$ `ctx.destination`.
  - Extracción en tiempo real de bandas: Sub-graves (20-140 Hz), Medios armónicos (140-2000 Hz), Agudos (2000-12000 Hz) y Energía RMS.
  - Sintetizador procedimental armónico en cliente como respaldo ante pistas sin preview.
- **WebGL 2.0:**
  - Contexto gráfico acelerado por hardware montado sobre `<canvas>`.
  - Inyección de shaders GLSL mediante hooks `onBeforeCompile` en materiales `MeshStandardMaterial` y `PointsMaterial`.
  - Mecanismo unificado de clave de programa (`customProgramCacheKey`) para impedir la recompilación de shaders idénticos en la GPU.
- **OAuth 2.0 Authorization Code con PKCE:**
  - Flujo de autenticación sin secreto de cliente (`client_secret`), generando criptográficamente en el navegador una clave `code_verifier` (64 caracteres) y derivando su hash SHA-256 Base64URL (`code_challenge`).
- **Almacenamiento Local (`localStorage`):**
  - Persistencia de tokens de sesión y caché local de metadatos de artistas (TTL 7 días).

### 2.3 Configuración del Compilador, Bundler y Entorno

- **`next.config.ts`**:
  - Habilita `cacheComponents: true` (compilación incremental en Next.js 16).
  - Habilita `partialPrefetching: true` (hibridación estática y dinámica).
  - Define `allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.0.4", "*.local"]` para autorizar conexiones seguras de desarrollo.
  - Configura reglas de Turbopack para transformar archivos `*.css` mediante `@tailwindcss/turbopack`.
- **`tsconfig.json`**:
  - Modo estricto activado (`"strict": true`).
  - Target: `"ES2017"`, Module: `"esnext"`, Module Resolution: `"bundler"`.
  - Alias de importación: `"@/*": ["./src/*"]`.
- **`eslint.config.mjs`**:
  - Configuración plana de ESLint 9 (`defineConfig`), ignorando directorios `.next/`, `out/`, `build/`, `.agents/`, `.playwright-cli/` y `test-results/`.

---

## 3. Estructura de Directorios y Roles Arquitectónicos

### 3.1 Árbol Global del Repositorio

```
YourMusicVisualizer/
├── .agents/                      # Metadatos del equipo de subagentes (solo lectura para la app)
├── .github/                      # Automatización de integración continua y despliegue
│   └── workflows/
├── .impeccable/                  # Artefactos y configuración de diseño UI Impeccable
├── .playwright-cli/              # Capturas y logs de auditorías visuales E2E
├── docs/                         # Documentación de arquitectura y guías del sistema
│   ├── arquitectura.md
│   ├── MIGRATION_NEBULOSAS.md    # Plan de migración a Nebulosas v3 (milestones M4–M8)
│   └── reference/
│       └── nebulosas-v3.html     # Referencia visual (Three r128) que se porta, no se copia
├── graphify-out/                 # Análisis visual del grafo de dependencias del código
├── public/                       # Recursos estáticos servidos en la raíz HTTP
├── src/                          # Código fuente de la aplicación (Next.js 16 + R3F)
│   ├── app/                      # Enrutamiento App Router, layouts y Route Handlers API
│   │   ├── api/
│   │   │   ├── enrich-tracks/
│   │   │   └── track-preview/
│   │   └── callback/
│   ├── components/               # Componentes de interfaz de usuario y renderizado 3D
│   │   ├── canvas/               # Escena WebGL Three.js, shaders y controladores 3D
│   │   │   ├── galaxy/           # Núcleo galáctico, agujero negro y disco de polvo
│   │   │   ├── hooks/            # Controladores cinemáticos y telemetría de cámara
│   │   │   ├── nebula/           # Cúmulos volumétricos de gas interestelar (renderer clásico)
│   │   │   ├── nebulaV3/         # Campo de gas Nebulosas v3: 1 draw call, solo con rendererMode 'nebula'
│   │   │   └── star/             # Nodos celestes, anillos, pulsars acústicos y shaders
│   │   └── hud/                  # Interfaz perimetral 2D estilo cristal (Glassmorphism Dock)
│   ├── data/                     # Presets cósmicos precalculados estáticos
│   ├── lib/                      # Lógica de dominio desacoplada, audio, importadores y red
│   │   ├── audio/                # Motor singleton de Web Audio API y FFT
│   │   ├── importers/            # Ingesta de pistas y construcción del grafo (sin posiciones desde M5.1)
│   │   ├── layout/               # Layouts espaciales puros: clásico, relaciones entre géneros y Nebulosas v3
│   │   ├── math/                 # PRNG determinista compartido por el código nuevo (mulberry32, gauss, Fibonacci)
│   │   ├── music/                # Clasificador universal de géneros y taxonomía cósmica
│   │   └── spotify/              # Cliente de red Spotify PKCE y cola de rate limiting
│   ├── store/                    # Almacén de estado global reactivo (Zustand)
│   └── types/                    # Definiciones e interfaces TypeScript de dominio
├── test-results/                 # Evidencias visuales de pruebas end-to-end (ignorado por git)
│   └── visual/                   # Baseline y corridas del arnés visual (baseline-classic/, latest-classic/)
└── tests/                        # Suites de verificación y validación matemática
    ├── verification/             # Aserciones tsx ejecutadas por `npm test` y CI
    │   └── fixtures/             # Snapshot de posiciones clásicas y payloads sintéticos (M5)
    └── visual/                   # Arnés Playwright de capturas y comparación (fuera de CI)
```

### 3.2 Detalle y Responsabilidad por Carpeta

#### Raíz del Repositorio (`/`)
- `package.json` y `package-lock.json`: Definición de metadatos del proyecto, dependencias y scripts de ejecución (`dev`, `build`, `lint`, `test`).
- `next.config.ts`: Configuración principal de compilación, loaders de Turbopack y orígenes permitidos.
- `tsconfig.json`: Configuración del compilador TypeScript y resolución de rutas alias `@/*`.
- `eslint.config.mjs`: Reglas de linting plano para ESLint 9.
- `.env.example` y `.env.local`: Especificación de variables de entorno públicas requeridas para Spotify OAuth.
- `README.md`, `PRODUCT.md`, `PROJECT.md`, `DESIGN.md`, `TEST_READY.md`, `AGENTS.md`: Documentos de diseño, visión de producto, reglas de agentes y reportes de validación.
- `CLAUDE.md`: Reglas de trabajo para la migración a Nebulosas v3 (importa `AGENTS.md` y `PROJECT.md`).

#### `src/app/` — Enrutamiento y Cascarón de Aplicación (Next.js App Router)
- `layout.tsx`: Server Component raíz (`RootLayout`). Inyecta las tipografías locales optimizadas `Syne` y `JetBrains Mono` vía variables CSS, define metadatos HTML, aplica fondo base `#050508` y monta el componente `<Analytics />` de Vercel.
- `page.tsx`: Client Component principal (`HomePage`). Desactiva el renderizado del lado del servidor (SSR) del lienzo 3D mediante `dynamic(..., { ssr: false })` para evitar discrepancias de hidratación con WebGL. Verifica en `useEffect` la existencia de una sesión de Spotify en `localStorage` y monta la vista dividida en dos capas: `<MusicVisualizerCanvas />` (fondo 3D) y `<TelemetryHUD />` (interfaz 2D flotante). Al montar resuelve el modo de render: `?renderer=classic|nebula` (validado con `parseRendererParam`), si no la preferencia guardada (`ymv_renderer_mode` en `localStorage`, `src/lib/rendererPreference.ts`), si no `nebula` (M8.4), y lo aplica con `setRendererMode`; se evita `useSearchParams` para que `/` siga prerenderizada sin un límite `<Suspense>`.
- `globals.css`: Directivas de Tailwind CSS v4, animaciones de pulso y reseteo de márgenes y barras de desplazamiento.

#### `src/app/callback/` — Endpoint de Retorno OAuth
- `page.tsx`: Client Component que captura la redirección de autorización de Spotify. Lee los parámetros de URL (`code` y `error`), invoca `exchangeSpotifyCodeForToken(code)`, consulta las canciones en Me gusta con `fetchSpotifyLikedSongsGalaxy(token)`, puebla el estado global de Zustand y redirige al usuario a la experiencia 3D en `/`.

#### `src/app/api/` — Route Handlers del Servidor
- `src/app/api/track-preview/route.ts`: Endpoint `GET /api/track-preview`. Resuelve y transmite el audio de preescucha de 30 segundos como proxy inverso con cabeceras `Access-Control-Allow-Origin: *`, `Cache-Control` y `Accept-Ranges: bytes`. Consulta de manera escalonada: Spotify fallback $\to$ Caché en memoria RAM binaria (`inMemoryAudioCache`, hasta 60 audios MP3) $\to$ Deezer API $\to$ Apple iTunes Search API.
- `src/app/api/enrich-tracks/route.ts`: Endpoint `POST /api/enrich-tracks`. Recibe lotes de pistas musicales, limpia sufijos de títulos mediante expresiones regulares y consulta la API de Last.fm (`track.getTopTags` / `artist.getTopTags`) con un timeout de 1.8s para mapear subgéneros y etiquetas a la taxonomía cósmica.

#### `src/components/canvas/` — Motor Gráfico 3D (React Three Fiber & Three.js)
- `MusicVisualizerCanvas.tsx`: Contenedor `<Canvas>` de `@react-three/fiber`. Configura cámara con posición inicial `[12, 46, 295]`, `fov: 52`, control de densidad de píxeles `dpr: [1, 1.5]`, antialias y modo de alto rendimiento de WebGL.
- `GalaxyScene.tsx`: Orquestador jerárquico de la escena 3D. Controla la rotación continua del cosmos a `0.007 rad/s` en el eje Y (respetando `prefers-reduced-motion`) y aplica Level of Detail (LOD): delega estrellas distantes a un único draw call de GPU (`DistantSongsCloud`) si la biblioteca supera las 60 canciones, montando mallas interactivas solo para el sector activo.
- `CameraFlightController.tsx`: Controlador desacoplado que integra los 4 hooks cinemáticos sobre `CameraControls` de `@react-three/drei`.
- `ConstellationLinks.tsx`: Filamentos geométricos inter-estelares calculados por similitud TF-IDF y relaciones de afinidad, con modulación lumínica según el espectro FFT.
- `DistantSongsCloud.tsx`: Sistema de partículas masivo en GPU que renderiza miles de pistas lejanas en 1 solo draw call.
- `GalacticDustDisc.tsx`, `NebulaClusters.tsx`, `StarNodeMesh.tsx`: Módulos barril (reexportadores) hacia sus submódulos especializados.
- `WarpTunnelMesh.tsx`: Cilindro procedural de estelas de luz estelar utilizado durante el salto hiperespacial inicial.
- `PostProcessingPipeline.tsx`: Canal de efectos de post-procesado con `UnrealBloomPass`, calibrando dinámicamente la intensidad del resplandor con los sub-graves de audio y atenuándolo por proximidad a estrellas grandes (anti-glare). Desde M6.4 los objetivos salen de `bloomTargets.ts` (`computeBloomTargets`, pura): en `classic` son exactamente los valores previos (strength 0.07/0.08, threshold 0.92) y en `nebula` strength 0.06 y threshold 0.95.

##### Subdirectorios de `src/components/canvas/`:
- `galaxy/`: Módulo del núcleo cósmico (`SupermassiveBlackHole.tsx` con horizonte de sucesos y lente gravitacional Gargantua, `SpiralStardustPoints.tsx` con 5,600 partículas espirales keplerianas, generador determinista `spiralStardustGeometry.ts` y shaders GLSL `blackHoleShaders.ts` y `spiralDustShaders.ts`).
- `nebula/`: Módulo de gas interestelar volumétrico (`SectorNebulaCluster.tsx` con cavidad interior de Stromgren de 3.2 unidades, `nebulaGeometry.ts` y shaders de turbulencia fractal `nebulaShaders.ts`).
- `nebulaV3/`: Gas de Nebulosas v3, montado por `GalaxyScene` en lugar de `NebulaClusters` cuando `rendererMode === 'nebula'`. `nebulaFieldGeometry.ts` genera en un solo `BufferGeometry` el polvo de Plummer alrededor de cada artista (42%), el gas filamentoso por fBm *ridged* (52%) y el frente de ionización (6%), con el 92% del presupuesto (el 8% queda para los choques de M7). `shaders/nebulaFieldShaders.ts` es un `ShaderMaterial` aditivo con cache key fija `nebula-field-v3` y todo el estado en uniforms (brillo, afinidad, foco de género/artista, género que suena, FFT, `uGasSize`/`uGasAlpha`); el aspecto calibrado es `NEBULA_GAS_LOOK = { size: 1.8, alpha: 1 }`. `NebulaField.tsx` actualiza los uniforms por `ref` en cada frame con `computeNebulaFieldTargets` (pura) y reconstruye la geometría a 20k si el store pasa `nebulaFieldDensity` a `reduced`. En desarrollo, `?nebulaTune=<size>,<alpha>` sobrescribe el aspecto del gas.
  - Desde M7, `nebulaV3/` también dibuja los **choques** entre géneros relacionados: `NebulaCollisions` (frente de choque, mareas Bézier animadas en el shader y gas mixto; 15% del presupuesto de partículas, cache key `nebula-collisions-v3`, aspecto `NEBULA_CLASH_LOOK = { size: 2.6, alpha: 1.8 }`), `BridgeThreads` (hilos artista → canción puente → núcleo del otro género, `nebula-bridges-v3`, visibles con "Hilos de constelación" o alrededor del género/choque enfocado), `CollisionMarkers` (marcadores `∩ n` / `≈` en los puntos de contacto, clicables) y el anillo de color mezclado de las canciones puente (`StarFeatures`, prop `bridgeColor`). Con una canción puente sonando, las mareas de su choque aceleran con la energía del audio mediante desfases de fase por choque (`uTideOffset`, `tideBoost.ts`) que nunca saltan.
  - `overviewCamera.ts` (M8.2): encuadre de la vista general y del final del warp-in en modo nebula — misma elevación que el clásico, mirando al eje del agujero negro a media altura del cosmos, a la distancia mínima (55–110 u) en la que todas las nebulosas entran en cualquier rotación y fuera de la cabecera y el dock del HUD. `classic` conserva `[0, 18, 52]`.
  - `CollisionMarkers` también publica en el store (`nebulaGenreLabelIds`) las 5 etiquetas de género más cercanas para la vista general nebula (M8.3); con un género enfocado, los marcadores `∩ n` se corren hacia el otro género para no pisar artistas.
  - `collisionCamera.ts`: pose de cámara de choque (perpendicular a la recta entre núcleos, a `(Sa+Sb)·1.55`) y posición seguida por `useOrbitalTracking`; `useArcFlight` la usa cuando `cameraMode === 'collision'`.
- `star/`: Módulo de cuerpos celestes individuales (`StarCoreMesh.tsx` con oscurecimiento de limbo, `StarAccretionRings.tsx` con anillos de acreción Cassini, `StarFeatures.tsx` con chorros polares relativistas y picos de difracción óptica, `StarPlaybackPulsar.tsx` con ondas de choque acústicas montadas únicamente sobre la pista en reproducción, `StarLabel.tsx` con tipografía GPU SDF en `<Billboard>`, geometrías estáticas compartidas `starGeometries.ts` y shaders `starShaders.ts`).
- `hooks/`: Lógica matemática cinemática desacoplada (`useWarpSequence.ts` para el salto hiperespacial, `useArcFlight.ts` para vuelos parabólicos en arco, `useOrbitalTracking.ts` para seguimiento orbital de estrellas mediante `matrixWorld`, y `usePerformanceMonitor.ts` para muestreo de telemetría a 500ms; en modo nebula, si 6 muestras seguidas quedan bajo 40 FPS, baja una sola vez el gas a 20k partículas).

#### `src/components/hud/` — Interfaz de Usuario 2D (Glassmorphism Dock)
- Panel "Filtros & Brillo" (`TelemetryHUD.tsx`): selector **Render: Nebulosas / Clásico** (M8.4, guarda la elección del espectador) e interruptor "Hilos de constelación" (M7.4).
- `CollisionCard.tsx` (M7.4): ficha que reemplaza a `ArtistSleeveCard` en modo choque: título "A × B", `∩ n` canciones en común (o "≈ afinidad por colaboraciones y estilo"), chips de canciones puente (seleccionan la canción; su ficha habitual la reproduce), "Ir al género" y "Volver".
- `GenreCollisionsRow.tsx` (M7.4): fila "Choca con" dentro de la ficha del género (solo modo nebula); cada chip selecciona el choque.
- `TelemetryHUD.tsx`: Interfaz perimetral flotante (desde M7.4 el panel "Filtros & Brillo" incluye el interruptor "Hilos de constelación", que antes no tenía control en la UI): telemetría en vivo (FPS, draw calls, estrellas activas), selectores de sector, controles de bloom y reseteo de cámara.
- `ArtistSleeveCard.tsx`: Cápsula interactiva deslizable estilo funda de vinilo 3D: biografía, catálogo estelar del artista, medidor de afinidad y controles de reproducción.
- `DataSourceModal.tsx`: Diálogo modal nativo (`<dialog>`) para alternar entre presets de demo, ingreso de Client ID de Spotify y carga de bibliotecas JSON.
- `FFTSpectrumDock.tsx`: Ecualizador perimetral inferior que visualiza las 24 barras del espectro de frecuencias en tiempo real.
- `StellarSearchBar.tsx`: Buscador estelar flotante (activable con `/`), con navegación por teclado y disparo de vuelos hacia la entidad seleccionada.

#### `src/data/` — Presets Cósmicos
- `galaxyPresets.ts`: Grafos cósmicos estáticos completos (`GALAXY_PRESET_50`, `GALAXY_PRESET_150`, `GALAXY_PRESET_300`) con coordenadas 3D precalculadas para operar sin credenciales ni conexión a internet en Modo Demo. Desde M5.2b exporta `ARTIST_DATABASE` y 27 temas llevan un `secondaryGenre` curado (11 pares de géneros) que alimenta los choques entre nebulosas; las variaciones del preset 300 lo heredan.

#### `src/lib/` — Lógica de Dominio Pura y Servicios
- `audio/WebAudioEngine.ts`: Motor singleton Web Audio API: gestión de `AudioContext`, analizador FFT de 64 bandas, streaming HTML5 Audio sin bloqueo CORS y sintetizador armónico polifónico procedural.
- `importers/libraryImporter.ts`: Transformación de pistas en grafos celestes: clasificación, buckets de género/artista, afinidad, links (`genre-artist`, `artist-song`, `influence` por anillo, colaboraciones, género secundario y TF-IDF) y `SongNode.secondaryGenreId`. Desde M5.1 construye los nodos en `[0,0,0]` y termina con `applyClassicLayout(...)`; `getDynamicSectorPlacement` conserva su firma (color de `SECTOR_PALETTE`, centro de `classicSectorCenter`).
- `layout/classicLayout.ts`: Layout clásico como pasada pura (`applyClassicLayout`, `classicSectorCenter`): anillo de constelaciones, espiral de artistas y órbitas doradas de canciones, calculadas por orden de arrays y agrupando por `(genreId, artistId)`. Cubierto por un fixture de posiciones previo al refactor.
- `layout/genreRelations.ts`: `computeGenreRelations(data, minShared = 2)`. Puntúa cada par de géneros con canciones puente (`secondaryGenreId`, peso 1), links `influence` cruzados (peso 0.5; ignora el anillo género↔género) y tags compartidos (0.25, tope 2). Devuelve `sharedSongs`, hasta 3 `bridgeSongIds` y `strength`.
- `layout/nebulaLayout.ts`: Layout de Nebulosas v3 (port de `layout()` de `docs/reference/nebulosas-v3.html` con `WORLD_SCALE = 0.14`). Núcleos en esfera de Fibonacci de dos capas relajados con resortes y repulsión (S = 4.8–9.0 u), marco inclinado por género con semilla por id, artistas por ángulo dorado entre 2.4 u y 0.75·S, canciones en órbitas compactas (0.9–2.0 u) y canciones puente en el disco de contacto. `computeNebulaLayout` devuelve `{ data, cores, relations }` (con `contact`, `dir`, `radius` para M7); `applyNebulaLayout` es el atajo del store.
- `layout/collisionModel.ts` (M7.4): modelos puros del HUD de choques (`genreCollisions`, `collisionCardModel`, `visibleCollisionMarkers`, `collisionBadge`, `collisionSummary`) y, desde M8.3, `collisionMarkerPosition` y `nearestGenreLabelIds`.
- `layout/nebulaLayout.ts` (M8.1): tras la relajación, `findCentralVoid` traslada rígidamente el cosmos para que el agujero negro quede en un hueco (≥ 3.3 u libres) sin cambiar ninguna distancia entre nebulosas.
- `rendererPreference.ts` (M8.4): default `nebula`, lectura/escritura protegida de `ymv_renderer_mode` y orden de resolución URL > preferencia > default.
- `math/prng.ts`: `createRng` (mulberry32), `gauss`, `randDir` y `goldenFibonacci`, usados por el código nuevo.
- `music/genreClassifier.ts`: Clasificador musical universal en memoria (0ms de latencia) que clasifica artistas en 20 constelaciones universales canónicas con reglas fonéticas y palabras clave.
- `music/taxonomy.ts`: Definición de 12 macro-géneros canónicos, normalización de etiquetas musicales y cálculo de enlaces inter-estelares TF-IDF.
- `spotify/spotifyClient.ts`: Cliente de red para la API de Spotify: autenticación PKCE, cola de peticiones con control de concurrencia (`RequestQueue`), reintentos automáticos ante errores HTTP 429 con retroceso exponencial y jitter (`fetchWithRetry`), y caché persistente de artistas en `localStorage`.

#### `src/store/` — Almacén de Estado Global
- `useGalaxyStore.ts`: Almacén creado con Zustand. Centraliza datos galácticos, entidad seleccionada, entidad en hover, sector activo, modo de cámara (`galaxy`, `sector`, `artist`, `song`), versión de vuelo cinemático (`flightVersion`), estado de reproducción de audio, brillo estelar y métricas de rendimiento. Desde M4 incluye `rendererMode: 'classic' | 'nebula'` (default `'nebula'` desde M8.4; mientras dura el warp-in, cambiar de modo no dispara un vuelo) y `setRendererMode`, el flag que separa el renderer clásico del de Nebulosas v3; `GalaxyScene` lo expone en el `userData` del grupo `celestial-galaxy-cosmos`. Desde M7.3 incluye `selectedCollision` y `selectCollision` (modo de cámara `'collision'`, solo con choques reales del layout nebula; cualquier otra selección, preset o el paso a clásico lo limpian). Desde M5.5 guarda `baseData` (lo importado, con posiciones clásicas) y deriva `data = layoutForMode(baseData, rendererMode)`; el layout nebula se cachea por dataset en un `WeakMap`. `setPresetScale`, `loadCustomGalaxyData` y `setRendererMode` lo aplican; al cambiar de modo se remapean `selectedNode`/`hoveredNode` por id y se incrementa `flightVersion` para reencuadrar. Ningún componente cambió: todos siguen leyendo `data`.

#### `src/types/` — Tipos TypeScript del Dominio
- `music.ts`: Interfaces y contratos TypeScript: `GenreNode`, `ArtistNode`, `SongNode` (desde M5.2 con `secondaryGenreId?`), `MusicLink` (desde M7.2 con el tipo `'bridge'`, que solo aparece en `NebulaLayoutResult.bridgeLinks`, nunca en `data.links`), `MusicGalaxyData`, clases espectrales estelares y funciones puras para el cálculo de radios y métricas visuales.

#### Directorios Complementarios
- `public/`: Recursos gráficos estáticos (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`).
- `tests/` y `tests/verification/`: Suites de validación matemática y de shaders ejecutadas con `tsx` (`milestone2.test.ts`, `milestone2_challenger.test.ts` y `m4_renderer_mode.test.ts`).
- `tests/visual/`: Arnés de regresión visual con Playwright. `captureScenes.mjs` captura Galaxy Overview, Sector Focus y Active Playback por renderer y preset (con `prefers-reduced-motion` para saltar el warp y frenar la rotación, y verificando `rendererMode` en la escena vía `__THREE_DEVTOOLS__`); `compareScenes.mjs` compara contra el baseline con umbrales por escena.
- `.github/workflows/`: Pipelines de integración continua (`ci.yml`), releases automáticos (`release.yml`) y auditoría de seguridad (`security.yml`).
- `.playwright-cli/` y `test-results/`: Capturas y logs generados durante verificaciones visuales automatizadas.
- `graphify-out/`: Diagramas de dependencias y reportes generados por la herramienta Graphify.

---

## 4. Puntos de Entrada y Flujo de Operación de Punta a Punta

### 4.1 Puntos de Entrada de la Aplicación

```
                                   [Navegador del Usuario]
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         [GET / (Página Principal)]                     [GET /callback (OAuth PKCE)]
                      │                                               │
             `src/app/layout.tsx`                                     │
                      │                                               │
              `src/app/page.tsx`                                      │
                      │                                               │
         ┌────────────┴────────────┐                                  │
         ▼                         ▼                                  ▼
[Capa 3D: R3F Canvas]     [Capa 2D: Telemetry HUD]        `src/app/callback/page.tsx`
(MusicVisualizerCanvas)      (TelemetryHUD)              (Canje de token y redirección)
         │                         │                                  │
         └────────────┬────────────┘                                  │
                      │                                               │
                      ▼                                               │
            `src/store/useGalaxyStore.ts` <───────────────────────────┘
                      ▲
                      │ (Streaming & Metadatos)
         ┌────────────┴────────────┐
         ▼                         ▼
 `GET /api/track-preview`   `POST /api/enrich-tracks`
   (Proxy Audio 30s)           (Tags Last.fm API)
```

1. **`src/app/layout.tsx` (Root Layout):** Server Component que define las variables CSS de tipografía (`--font-syne`, `--font-jetbrains-mono`), etiquetas HTML base y monta el cliente de analítica `<Analytics />`.
2. **`src/app/page.tsx` (Página Principal):** Client Component que importa `MusicVisualizerCanvas` dinámicamente con `ssr: false`, ejecuta la restauración de sesión previa de Spotify desde `localStorage` y superpone el HUD 2D sobre el Canvas 3D.
3. **`src/app/callback/page.tsx` (Retorno OAuth):** Client Component receptor de la redirección de Spotify. Procesa `code`, canjea el token Bearer, sincroniza las canciones guardadas y redirige a la raíz `/`.
4. **`src/app/api/track-preview/route.ts` (Proxy de Audio):** Route Handler de streaming que evita problemas de CORS y sirve buffers de 30 segundos con caché en memoria RAM.
5. **`src/app/api/enrich-tracks/route.ts` (Enriquecimiento de Géneros):** Route Handler que consulta Last.fm y aplica heurísticas para asignar macro-constelaciones y subgéneros.
6. **`src/components/canvas/MusicVisualizerCanvas.tsx`:** Contenedor WebGL de `@react-three/fiber` que monta la cámara inicial, listeners de eventos y la escena jerárquica `GalaxyScene`.

---

### 4.2 Flujo Operacional Paso a Paso (End-to-End User Journey)

```
[1. Carga Raíz /] ──> [2. Cinemática Warp-In (3.4s)] ──> [3. Cosmos Demo Activo]
                                                                  │
                                                                  ▼
[6. Reproductor Web Audio] <── [5. Grafo 3D en GPU] <── [4. Conexión Spotify PKCE]
         │                                                        │
         ▼                                                        ▼
[7. Muestreo FFT 60 FPS] ──> [8. Reactividad Visual (Bloom/Pulsar) + Vuelo de Cámara]
```

#### Paso 1: Carga Inicial de la Aplicación
1. El usuario ingresa a la raíz `/`. Next.js entrega el cascarón HTML generado por `RootLayout`.
2. `src/app/page.tsx` inicializa el estado de la aplicación. Mientras `MusicVisualizerCanvas` se carga de manera asíncrona, se presenta en pantalla un mensaje monospaciado: `"CARGANDO MOTOR 3D..."`.
3. Al montarse el motor WebGL, `useGalaxyStore` se inicializa de forma inmediata con los datos de demostración precalculados `GALAXY_PRESET_50` (50 canciones, múltiples constelaciones).

#### Paso 2: Secuencia de Entrada Hiperespacial ("Warp-In")
1. `CameraFlightController` detecta que la cámara está lista y que `isWarpActive` es `true`.
2. Se activa el hook `useWarpSequence`:
   - La cámara se ubica inicialmente en el hiperespacio profundo: `[12, 46, 295]` mirando al origen `[0, 3, 0]`.
   - Se ejecuta una animación con GSAP de 3.4 segundos con interpolación suave `power4.out`, desplazando la cámara hasta la vista general de la galaxia en `[0, 18, 52]`.
   - El shader cilíndrico en `WarpTunnelMesh` genera trazas y estelas de luz estelar acordes al progreso de la animación.
   - El HUD 2D permanece atenuado con `opacity: 0` y escala reducida. En la parte inferior se muestra la etiqueta *"Hiperespacio: Clic o Espacio para saltar"*.
3. **Interrupción manual:** Si el usuario presiona `Escape`, `Space`, `Enter` o arrastra el ratón, la animación de GSAP se cancela instantáneamente mediante `.kill()`, posicionando la cámara en `[0, 18, 52]` y habilitando la opacidad completa del HUD.

#### Paso 3: Conexión con Spotify y Autenticación PKCE en Cliente
1. El usuario abre el diálogo modal haciendo clic en *"Conectar Spotify / Datos"* (`DataSourceModal.tsx`).
2. Configura el límite de pistas a analizar (de 50 a 3,000) y opcionalmente su propio Spotify Client ID.
3. Al hacer clic en *"Iniciar sesión con Spotify"*, se ejecuta `startSpotifyLogin(...)`:
   - Se genera una cadena criptográfica aleatoria de 64 caracteres (`code_verifier`).
   - Se genera el hash SHA-256 en formato Base64URL (`code_challenge`).
   - Se guarda el `code_verifier` en `localStorage.setItem('ymv_spotify_pkce_verifier', verifier)`.
   - Se redirige la ventana del navegador a `https://accounts.spotify.com/authorize` con el parámetro `redirect_uri` normalizado a `http://127.0.0.1:3000/callback` y scopes `user-library-read user-read-private`.
4. Una vez concedida la autorización, Spotify redirige al usuario a `/callback?code=...`.
5. `src/app/callback/page.tsx` extrae el código, recupera el `code_verifier` de `localStorage` y ejecuta un `POST https://accounts.spotify.com/api/token` para obtener el `access_token` Bearer y su tiempo de expiración (60 minutos).

#### Paso 4: Ingesta de Pistas, Resiliencia y Construcción del Grafo Celestial 3D
1. La función `fetchSpotifyLikedSongsGalaxy(token, maxTracks)` extrae la biblioteca:
   - Consulta el perfil del oyente en `GET /v1/me`.
   - Consulta las canciones guardadas en bloques de 50 pistas mediante `GET /v1/me/tracks`. Para mitigar el límite de peticiones de Spotify, la función utiliza una cola con control de concurrencia (`RequestQueue`, máximo 2 peticiones paralelas y 300ms de retardo) y el wrapper `fetchWithRetry`, el cual intercepta respuestas HTTP 429, respeta la cabecera `Retry-After` e introduce retroceso exponencial con jitter.
   - Deduplica los artistas principales y consulta sus metadatos. Primero revisa la caché de `localStorage` (`ymv_cache_artist_<id>`, TTL 7 días). Para los faltantes, realiza consultas por lote de hasta 50 IDs en `GET /v1/artists?ids=...`.
   - Envía las pistas a `POST /api/enrich-tracks` para mapear géneros mediante Last.fm y heurísticas locales.
2. **Transformación Matemática en Grafo (`src/lib/importers/libraryImporter.ts` + `src/lib/layout/classicLayout.ts`):**
   - **Distribución de Constelaciones:** Dispone los macro-géneros armónicamente en un anillo circular de radio adaptativo (18 a 34 unidades) y elevación variable para prevenir colisiones visuales (`getDynamicSectorPlacement`).
   - **Dispersión Espiral de Artistas:** Posiciona las estrellas de artistas en espiral logarítmica alrededor de su sector:
     $$\text{distancia} = 4.8 + \sqrt{\text{índice} + 0.8} \times 2.2$$
   - **Órbitas Planetarias de Canciones:** Dispone las canciones en órbitas concéntricas alrededor de su artista utilizando el ángulo dorado ($\approx 2.3999632\text{ rad}$):
     $$\text{radio} = 2.1 + \sqrt{\text{índice} + 1} \times 0.85$$
   - **Ponderación de Afinidad:** Calcula un índice de afinidad (0.0 a 1.0) combinando la popularidad en Spotify, la frecuencia del artista en la biblioteca y la fecha de agregado del tema.
   - **Generación de Filamentos Inter-estelares:** Genera enlaces estructurales jerárquicos (`genre-artist`, `artist-song`), anillos dorsales galácticos entre sectores vecinos y puentes estéticos basados en similitud TF-IDF de subgéneros.
3. El objeto resultante `MusicGalaxyData` se carga en el store mediante `loadCustomGalaxyData(...)` como `baseData`. Si `rendererMode` es `nebula` (`?renderer=nebula`), el store deriva `data` con `applyNebulaLayout`: relaciones entre géneros → núcleos relajados → artistas, canciones y canciones puente (ver `src/lib/layout/`).

#### Paso 5: Audio Reactivo y Análisis Espectral FFT (Web Audio API)
1. **Inicio de Reproducción:**
   - Se activa al hacer clic en una estrella de canción, buscar en la barra estelar o mediante el botón de reproducción del HUD.
   - `webAudioEngine.playTrack(trackId, title, affinity, previewUrl)` gestiona el flujo de audio:
     1. Despierta el `AudioContext` perezoso.
     2. Solicita el stream a `GET /api/track-preview?artist=...&title=...`.
     3. Conecta el elemento de audio HTML5 al grafo de audio nativo mediante `createMediaElementSource`.
     4. Conecta en cascada: Fuente $\to$ `GainNode` $\to$ `AnalyserNode` (`fftSize = 128`, 64 bandas espectrales) $\to$ Salida de altavoces.
2. **Muestreo Espectral FFT en Vivo (`sampleFFT()`):**
   - Ejecutado en cada frame dentro de los ciclos `useFrame` de R3F (hasta 60 FPS).
   - Posee un mecanismo de estrangulamiento interno (<10ms) para no recalcular bandas si varios componentes solicitan la FFT en el mismo cuadro gráfico.
   - Calcula métricas normalizadas:
     - `subBass`: Bandas 0 a 5 (20 a 140 Hz).
     - `midHarmonic`: Bandas 6 a 23 (140 a 2000 Hz).
     - `highShimmer`: Bandas 24 a 55 (2000 a 12000 Hz).
     - `energy`: Energía RMS ponderada: $0.5 \times \text{subBass} + 0.35 \times \text{midHarmonic} + 0.25 \times \text{highShimmer}$.
     - `bins`: Submuestreo de 64 bandas a 24 barras visuales para el dock HUD.
3. **Reactividad Visual en la Escena:**
   - **Post-Procesado Bloom:** `PostProcessingPipeline` modula la intensidad del bloom con el ritmo de los sub-graves (`0.08 + subBass * 0.02`), aplicando atenuación anti-glare si la cámara está cerca de un núcleo brillante.
   - **Estrella Activa:** `StarPlaybackPulsar` se monta únicamente sobre la estrella en reproducción activa, expandiendo anillos concéntricos cian, lima y magenta.
   - **Nebulosas y Polvo:** `SectorNebulaCluster` expande el gas interestelar con las frecuencias medias, mientras `SpiralStardustPoints` recibe el parámetro `uSubBass` en sus shaders para simular mareas gravitacionales acústicas.

#### Paso 6: Interacción y Navegación Cinemática de Cámara
1. **Detección de Selección en Pantalla:**
   - En `StarNodeMesh.tsx`, los eventos de puntero evalúan el desplazamiento del ratón (`delta > 4`). Si hubo arrastre, se ignora el evento de selección para permitir al usuario orbitar libremente sin abrir fichas por error.
   - Al confirmarse un clic neto, se invoca `selectNode(node)` en Zustand, incrementando el contador reactivo `flightVersion`.
2. **Vuelos en Arco Parabólico (`useArcFlight.ts`):**
   - Al cambiar `flightVersion`, se calcula la trayectoria según el tipo de nodo seleccionado:
     - Modo `galaxy`: posición `[0, 18, 52]`, foco en el agujero negro `[0, 0, 0]`.
     - Modo `sector`: enfoca el centro de la constelación con encuadre elevado.
     - Modo `artist`: cámara a distancia `+13.5` unidades con ligero descentrado para evitar deslumbramiento frontal.
     - Modo `song`: cámara a distancia `+8.5` unidades en primer plano del satélite planetario.
   - **Dinámica del Vuelo:** Si la distancia entre la cámara y el objetivo supera las 10 unidades, el vuelo aplica una elevación parabólica vertical (`arcLift` hasta 6.5 unidades) y un balanceo lateral (`lateralSway` hasta 2.5 unidades) mediante funciones sinusoidales `Math.sin(progreso * Math.PI)` interpoladas con GSAP (`power3.inOut`, duración 1.05s a 1.70s).
   - Si el usuario interactúa con los controles durante el vuelo, la animación se interrumpe de forma limpia sin tirones visuales.
3. **Seguimiento Orbital en Tiempo Real (`useOrbitalTracking.ts`):**
   - Debido a que toda la galaxia rota continuamente a 0.007 rad/s en torno al agujero negro central, cualquier estrella seleccionada cambia continuamente de coordenadas en el espacio mundial.
   - En cada cuadro de renderizado, si no hay un vuelo activo, el hook proyecta la posición local de la estrella mediante `matrixWorld` del contenedor y ajusta suavemente la posición y el foco de `CameraControls` (`controls.setLookAt(...)`), manteniendo la estrella centrada suavemente en pantalla.

---

## 5. Dependencias Externas y Persistencia

### 5.1 Servicios y APIs Externas

| Servicio / Endpoint | Protocolo / Método | Uso en Novafy | Mecanismo de Autenticación / Clave |
|---|---|---|---|
| **Spotify Accounts** (`accounts.spotify.com/authorize`) | HTTP GET | Inicio de autorización OAuth 2.0 PKCE en navegador. | `client_id` público provisto por el usuario o por defecto. |
| **Spotify Accounts Token** (`accounts.spotify.com/api/token`) | HTTP POST | Canje de código de autorización por token Bearer. | PKCE `code_verifier` criptográfico (sin secreto de cliente). |
| **Spotify Web API Profile** (`api.spotify.com/v1/me`) | HTTP GET | Obtención de nombre, ID de usuario y avatar del oyente. | Header `Authorization: Bearer <token>` (`user-read-private`). |
| **Spotify Web API Tracks** (`api.spotify.com/v1/me/tracks`) | HTTP GET | Paginación de canciones guardadas (lotes de 50). | Header `Authorization: Bearer <token>` (`user-library-read`). |
| **Spotify Web API Artists** (`api.spotify.com/v1/artists`) | HTTP GET | Consulta por lotes de artistas para obtener géneros oficiales y fotos. | Header `Authorization: Bearer <token>`. |
| **Last.fm Web Services** (`ws.audioscrobbler.com/2.0/`) | HTTP GET | Consulta de tags musicales (`track.gettoptags` y `artist.gettoptags`) en `/api/enrich-tracks`. | Clave de API (`LASTFM_API_KEY` o fallback en código). |
| **Deezer Search API** (`api.deezer.com/search`) | HTTP GET | Búsqueda y resolución de previews de audio de 30s en `/api/track-preview`. | Endpoint público (sin clave requerida). |
| **Apple iTunes Search API** (`itunes.apple.com/search`) | HTTP GET | Segundo fallback de previews de audio en formato M4A/AAC en `/api/track-preview`. | Endpoint público (sin clave requerida). |
| **Vercel Analytics** | Telemetría Web | Captura anónima de métricas Core Web Vitals en `layout.tsx`. | Token automático inyectado por la plataforma Vercel. |

### 5.2 Tipografías y Recursos Estáticos

- **Google Fonts (`next/font/google`):**
  - Familias: `Syne` y `JetBrains Mono`.
  - Mecanismo: Optimización nativa de Next.js en tiempo de compilación. Las fuentes no se descargan de servidores externos en tiempo de ejecución del cliente; se descargan durante el build y se sirven localmente como fuentes estáticas autorreguladas.
- **Iconografía:** `lucide-react` (iconos vectoriales SVG empaquetados en el bundle, 0 llamadas a CDNs).

### 5.3 Almacenamiento en Cliente (localStorage)

Novafy no utiliza cookies de servidor ni sesiones en bases de datos. Todo el estado persistente entre recargas reside en el `localStorage` del navegador:

| Clave en `localStorage` | Tipo de Dato | Propósito y Ciclo de Vida |
|---|---|---|
| `ymv_spotify_pkce_verifier` | String (64 chars) | Clave criptográfica temporal del flujo PKCE; se elimina tras canjear el token. |
| `ymv_spotify_access_token` | String (Bearer) | Token de acceso para consultar la Spotify Web API; expira en 60 minutos. |
| `ymv_spotify_token_expiry` | String (timestamp ms) | Marca temporal Unix de vencimiento del token de Spotify. |
| `ymv_spotify_client_id` | String | Client ID personalizado configurado por el usuario en el modal. |
| `ymv_spotify_track_limit` | String (número) | Límite configurado de canciones a sincronizar (50 a 3,000; por defecto: 150). |
| `ymv_cache_artist_<artistId>` | JSON String | Caché persistente de géneros e imágenes de artista; TTL de 7 días. |

### 5.4 Ausencia de Bases de Datos y Cookies

- **Bases de Datos:** **Ninguna.** El proyecto no contiene ORMs (Prisma, Drizzle), clientes NoSQL (Mongoose, Supabase, Firebase) ni bases embebidas (SQLite).
- **Cookies y SessionStorage:** **Ninguno.** No se ejecutan lecturas ni escrituras en `document.cookie` ni en `sessionStorage`.
- **Estado de Servidor:** Las rutas de API (`/api/track-preview` y `/api/enrich-tracks`) son *stateless* a nivel de disco; mantienen cachés en memoria RAM del proceso Node.js (`inMemoryAudioCache` con hasta 60 audios MP3 y `previewUrlCache`).

---

## 6. Instrucciones de Ejecución Local

### 6.1 Requisitos del Sistema

- **Sistema Operativo:** Linux (Ubuntu/Debian probado en CI), macOS o Windows 10/11.
- **Node.js:** Versión **Node.js 20 LTS** o **Node.js 22 LTS** (CI formalmente corre en `node: 22`).
- **Gestor de Paquetes:** `npm` versión 10 o superior (dispone de `package-lock.json` v3 en raíz).
- **Hardware y Navegador:** Tarjeta gráfica y navegador web moderno con aceleración por hardware para **WebGL 2.0** y soporte completo para **Web Audio API** (Google Chrome, Mozilla Firefox, Microsoft Edge o Apple Safari).

### 6.2 Variables de Entorno y Configuración de Spotify

El proyecto incluye una plantilla de variables de entorno en `.env.example`:

```bash
# Configuración OAuth 2.0 PKCE para Spotify Web API (Opcional)
# Si no se define, Novafy operará de inmediato en Modo Demo con presets cósmicos.
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=0313886d00a24a5f96650ce722baa104

# En desarrollo local:
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/callback
# En producción (la aplicación lo auto-detecta si no se especifica):
# NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=https://your-domain.vercel.app/callback
```

#### Reglas Críticas de Configuración:
1. **Bucle Invertido IPv4 Obligatorio (`127.0.0.1`):** Spotify Web API prohíbe el uso de cadenas genéricas `localhost` en el Redirect URI para flujos PKCE por motivos de seguridad; exige explícitamente la dirección IP `http://127.0.0.1:3000/callback`.
2. **Variable de Entorno Last.fm:** `src/app/api/enrich-tracks/route.ts` soporta la variable opcional `LASTFM_API_KEY`. Si no se define en `.env.local`, el backend utiliza una clave de respaldo incorporada en el código.
3. **Modo Demo Autónomo:** Si el desarrollador no cuenta con credenciales de Spotify ni conexión a internet, la aplicación inicia por defecto en Modo Demo, permitiendo navegar los presets estáticos de 50, 150 y 300 pistas sin ninguna configuración previa.

### 6.3 Scripts de npm y Guía Paso a Paso

Los comandos declarados en `package.json` son:

| Comando | Script Subyacente | Propósito Técnico |
|---|---|---|
| `npm run dev` | `next dev` | Inicia el servidor de desarrollo en `http://127.0.0.1:3000` con Turbopack y Fast Refresh. |
| `npm run build` | `next build` | Compila la aplicación para producción utilizando Turbopack y valida tipado estricto con TypeScript. |
| `npm run start` | `next start` | Inicia el servidor Node.js en modo producción utilizando los artefactos generados en `.next`. |
| `npm run lint` | `eslint` | Ejecuta ESLint 9 con Flat Config (`eslint.config.mjs`) validando reglas de Next.js y TypeScript. |
| `npm test` | `tsx tests/verification/...` | Ejecuta las 763 aserciones de pruebas automatizadas (matemáticas, geometrías, shaders, flag `rendererMode`, layouts, relaciones, store, gas v3, bloom, densidad adaptativa, choques, hilos puente, cámara de choque, HUD de choques y mareas, encuadre general, etiquetas y preferencia de render) con `tsx`. |
| `npm run test:visual:baseline` | `node tests/visual/captureScenes.mjs ...` | Captura el baseline visual del renderer clásico (presets 50 y 300) en `test-results/visual/baseline-classic/`. Requiere `npm run dev` corriendo. |
| `npm run test:visual` | `captureScenes.mjs` + `compareScenes.mjs` | Recaptura las 6 escenas y las compara con el baseline (≈4 min con WebGL por software). No corre en CI. |
| `npm run test:visual:flows` | `checklistFlows.mjs` | Recorre la parte automatizable de la checklist de no-regresión (drawer, Próxima, buscador, ficha, filtros, bloom, pulso FFT, presets) en `classic` y `nebula`. Requiere `npm run dev`. |
| `npm run test:visual:shaders` | `tsx tests/visual/compileShaders.ts` | Compila el material del gas v3 en Chromium (WebGL2/SwiftShader) y renderiza un cuadro del preset 50. Detecta errores de GLSL que Node no puede ver. |
| `node tests/visual/calibrateGas.mjs` | Playwright + `?nebulaTune` | Genera una lámina 3×3 de tamaño × alpha del gas en el preset 300 para recalibrar `NEBULA_GAS_LOOK`. Requiere `npm run dev`. |
| `npm run test:visual:clash` | `tsx tests/visual/calibrateClash.ts` | Lámina 3×3 de tamaño × alpha de los choques (render fuera de la app con densidad completa) con el % de píxeles que aportan, para recalibrar `NEBULA_CLASH_LOOK`. |

#### Secuencia de Comandos para Nuevos Desarrolladores:

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/YourMusicVisualizer.git
cd YourMusicVisualizer

# 2. Instalar dependencias exactas
npm install

# 3. Configurar variables de entorno (opcional para Spotify)
cp .env.example .env.local

# 4. Validar calidad de código y suites de pruebas
npm run lint
npm test

# 5. Iniciar entorno de desarrollo local con Turbopack
npm run dev

# 6. Abrir en el navegador en la dirección IPv4 reglamentaria:
# http://127.0.0.1:3000
```

---

## 7. Zonas Frágiles Identificadas

### 7.1 Inventario de Código Sin Pruebas Automatizadas

El arnés actual de pruebas en `tests/verification/` (`milestone2.test.ts` y `milestone2_challenger.test.ts`) ejecutaba 205 aserciones al inicio de la migración (222 tras M4, 426 tras M5, 548 tras M6, 680 tras M7 y 763 tras M8, con las suites `m4_*` a `m8_*`) centradas en validaciones matemáticas de geometrías, determinismo de shaders y fórmulas de cinemática de cámara.

**Sin embargo, la totalidad de los módulos de integración, audio, red, estado global y componentes de interfaz carece de pruebas automatizadas:**

| Módulo / Capa del Sistema | Archivos Principales | Líneas | Riesgo y Factores de Fragilidad |
|---|---|---|---|
| **Motor Web Audio** | `src/lib/audio/WebAudioEngine.ts` | 463 | **CRÍTICO.** Cero pruebas sobre desbloqueo de autoplay por interacción del usuario, ciclo de vida del `AudioContext`, manejo de decodificación errónea de MP3 o desvinculación de nodos en desuso. |
| **Cliente de Red Spotify** | `src/lib/spotify/spotifyClient.ts` | 822 | **CRÍTICO.** Cero pruebas con mocks de red (`fetch`). Cambios en la respuesta de Spotify o en la cola `RequestQueue` pueden quebrar la sincronización de bibliotecas sin alerta del compilador. |
| **Importador de Datos 3D** | `src/lib/importers/libraryImporter.ts` | ~600 | **MEDIO (mitigado en M5).** Las posiciones viven en `classicLayout.ts`, cubierto por fixture (presets, payload de streaming y artista dividido en dos géneros). Siguen sin tests la clasificación, los links y los casos de IDs repetidos (`artistId`/`songId` iguales en dos géneros). |
| **Clasificador de Géneros** | `src/lib/music/genreClassifier.ts` | 873 | **ALTO.** Diccionario masivo sin tests de regresión; modificar una clave fonética o regex puede alterar la constelación de decenas de artistas sin advertencia. |
| **Taxonomía Musical** | `src/lib/music/taxonomy.ts` | 701 | **MEDIO-ALTO.** Funciones matemáticas complejas como `computeTfIdfLinks` y `resolveTrackTaxonomy` carecen de suites unitarias automatizadas. |
| **Route Handlers API** | `src/app/api/track-preview/route.ts`<br>`src/app/api/enrich-tracks/route.ts` | 523 | **ALTO.** Sin pruebas de integración para el proxy de audio (timeouts de Deezer/iTunes, cabeceras CORS) ni para el enriquecimiento mediante Last.fm. |
| **Componentes HUD 2D** | `src/components/hud/*` (5 componentes) | 2,391 | **ALTO.** Cero pruebas de renderizado con React Testing Library; búsqueda estelar, navegación por teclado y controles de audio no están testeados. |
| **Componentes Canvas 3D** | `src/components/canvas/*` (GalaxyScene, StarNodeMesh, etc.) | 2,800+ | **MEDIO-ALTO.** Eventos de puntero (clic vs arrastre de cámara, hover de estrellas) no disponen de tests automatizados en CI. |
| **Pruebas E2E en CI** | `tests/visual/*.mjs` | N/A | **MEDIO (mitigado en M4).** Existe `npm run test:visual` con baseline y umbrales calibrados, pero corre a mano: no está en `ci.yml` y el baseline vive en `test-results/` (ignorado por git), por lo que es local a cada máquina. La escena Active Playback es solo un chequeo de humo porque depende del audio en vivo. |

---

### 7.2 Archivos de Gran Tamaño (> 250 - 300 Líneas)

Se identificaron **13 archivos que superan las 250 líneas** (11 de ellos superando las 300 líneas), concentrando múltiples responsabilidades que representan un desafío para el mantenimiento futuro:

| # | Archivo | Líneas Exactas | Responsabilidades Principales Concentradas | Riesgo Arquitectónico |
|---|---|---|---|---|
| 1 | `src/lib/music/genreClassifier.ts` | **873** | Diccionario estático gigante de géneros, artistas y reglas de coincidencia regex fonética. | Complejidad de mantenimiento; propenso a colisiones entre patrones de texto y propenso a errores humanos al agregar artistas. |
| 2 | `src/lib/spotify/spotifyClient.ts` | **822** | Autenticación PKCE, cola de peticiones `RequestQueue`, reintentos HTTP 429 (`fetchWithRetry`), paginación y caché persistente de artistas. | Violación de Responsabilidad Única (SRP); acopla criptografía, cliente HTTP y cuotas de almacenamiento en un único archivo. |
| 3 | `src/lib/music/taxonomy.ts` | **701** | Definición de 12 macro-sectores, mapeo de colores, normalización de tags y cálculo TF-IDF. | Archivo monolítico; cualquier alteración en las coordenadas de sector afecta a todo el plano galáctico. |
| 4 | `src/components/hud/ArtistSleeveCard.tsx` | **681** | Tarjeta de vinilo 3D, biografía de artista, lista de pistas, controles de audio y saltos de cámara. | Sobrecarga de responsabilidades en un solo componente React; combina lógica de audio, eventos y animaciones DOM. |
| 5 | `src/lib/importers/libraryImporter.ts` | **640** | Conversión de payloads a `MusicGalaxyData`, algoritmos de clustering, afinidad y órbitas doradas. | Elevada densidad matemática sin cobertura de tests unitarios; riesgo de efectos colaterales ante cambios de fórmulas. |
| 6 | `src/data/galaxyPresets.ts` | **631** | Definición estática de tres grafos cósmicos precalculados (50, 150 y 300 pistas). | Archivo de datos voluminoso incluido en el bundle inicial si no se carga de manera diferida. |
| 7 | `src/components/hud/TelemetryHUD.tsx` | **587** | Barra perimetral de cristal, telemetría de rendimiento (FPS, draw calls), selectores de constelación y controles. | Múltiples suscripciones a Zustand y lógica redundante de selección musical. |
| 8 | `src/components/hud/DataSourceModal.tsx` | **470** | Diálogo modal nativo, validación de Client ID, selector de límites de pistas e instrucciones de usuario. | Mezcla validación de formularios, disparadores de autenticación y extensas instrucciones estáticas. |
| 9 | `src/lib/audio/WebAudioEngine.ts` | **463** | Motor singleton Web Audio, analizador FFT, streaming de audio HTML5 y sintetizador procedimental. | Manejo de APIs nativas de bajo nivel susceptibles a diferencias entre motores de navegador (Chromium vs Safari). |
| 10 | `src/components/hud/StellarSearchBar.tsx` | **402** | Buscador estelar flotante con soporte de atajos (`/`), navegación por teclado y coincidencia predictiva. | Lógica densa de gestión de foco, eventos de teclado y sincronización con el estado de selección estelar. |
| 11 | `src/components/canvas/star/index.ts` | **347** | Coordinador estelar (`StarNodeMesh`): gestión de LOD de etiquetas SDF, eventos de puntero y reproducción de audio. | Acumula demasiada lógica funcional para un archivo de exportación/coordinador. |
| 12 | `src/app/api/track-preview/route.ts` | **286** | Route handler de proxy de audio: limpieza de nombres, jerarquía de resolución (Deezer/iTunes) y caché en RAM. | Manipulación de streaming binario y múltiples llamadas concurrentes a servicios de terceros. |
| 13 | `src/components/canvas/ConstellationLinks.tsx` | **259** | Renderizado WebGL de filamentos: actualización de buffers de color en `useFrame` según la FFT de audio. | Mutación intensiva de arreglos en el hilo de renderizado con banderas `needsUpdate = true` continuas. |

---

### 7.3 Auditoría de Comentarios de Deuda Técnica (TODOs / FIXMEs)

Se ejecutó un escaneo exhaustivo con expresiones regulares en la totalidad de los archivos de `src/` y `tests/` buscando comentarios de deuda técnica:
- **0 comentarios `TODO`**
- **0 comentarios `FIXME`**
- **0 comentarios `HACK`**
- **0 comentarios `WORKAROUND`**
- **0 comentarios `XXX` o `BUG`**

*Nota sobre falsos positivos:* Se verificó que las únicas coincidencias correspondieron al uso de la palabra gramatical en español *"todo"* en un comentario descriptivo en `src/components/canvas/GalaxyScene.tsx:31` (*"hacer que todo siga un movimiento lento alrededor del agujero negro"*) y al nombre de la banda argentina *"Todos Tus Muertos"* en `src/lib/music/genreClassifier.ts:372`.

---

### 7.4 Duplicación de Código y Lógica Redundante

Se detectaron 5 casos claros de código duplicado que deberían refactorizarse en futuras iteraciones:

1. **Generador Pseudoaleatorio `createPRNG` Idéntico:**
   - La misma función generadora basada en el algoritmo congruencial de Park-Miller se encuentra copiada y pegada textualmente en tres archivos distintos:
     - `src/components/canvas/galaxy/spiralStardustGeometry.ts` (L3-10)
     - `src/components/canvas/nebula/nebulaGeometry.ts` (L11-18)
     - `src/components/canvas/WarpTunnelMesh.tsx` (L8-15)
   - *Recomendación:* Extraer a una función utilitaria compartida en `src/lib/math/prng.ts`.
   - *Estado (M5.4a):* `src/lib/math/prng.ts` existe y lo usa todo el código nuevo; las tres copias clásicas se quedan hasta M8 por la regla de no tocar el renderer clásico.
2. **Normalización y Limpieza de Nombres de Canciones (`cleanQueryText` vs `cleanTrackTitle`):**
   - La expresión regular para eliminar sufijos como `(Remastered)`, `[Live Version]`, `(Deluxe Edition)`, comillas y guiones está duplicada casi de forma idéntica en:
     - `src/app/api/track-preview/route.ts` (L24-34)
     - `src/app/api/enrich-tracks/route.ts` (L43-50)
   - *Recomendación:* Consolidar en `src/lib/utils/stringCleaners.ts`.
3. **Algoritmo de Selección Fallback para Reproducción de Pistas:**
   - Al seleccionar un artista o constelación, el sistema selecciona una canción candidata (priorizando aquellas con preview disponible o al azar). Esta lógica exacta está repetida textualmente en cuatro componentes:
     - `src/components/canvas/star/index.ts` (L240-270)
     - `src/components/hud/FFTSpectrumDock.tsx` (L104-118)
     - `src/components/hud/TelemetryHUD.tsx` (L116-135)
     - `src/components/hud/ArtistSleeveCard.tsx` (L254-282)
   - *Recomendación:* Crear una acción unificada en `useGalaxyStore` (p. ej., `playNodeTrack(node)`).
4. **Funciones de Ruido en Shaders GLSL (`hash` y `vnoise`):**
   - En `src/components/canvas/galaxy/shaders/blackHoleShaders.ts`, las funciones GLSL `float hash(vec2 p)` y `float vnoise(vec2 p)` están declaradas dos veces:
     - En `ACCRETION_DISK_FRAGMENT_SHADER` (L28-41).
     - En `LENSING_ARCH_FRAGMENT_SHADER` (L87-100).
   - *Recomendación:* Reutilizar un fragmento común de GLSL mediante interpolación de cadenas.
5. **Divergencia entre Definición de Macro-Constelaciones y Paletas Cósmicas:**
   - `src/lib/music/taxonomy.ts` define 12 macro-géneros canónicos (`MACRO_GENRES`) con coordenadas y colores definidos (p.ej. `ROCK` en `[-26, 6, -18]` con `#F43F5E`).
   - `src/lib/importers/libraryImporter.ts` define una lista paralela `SECTOR_PALETTE` de 21 posiciones y colores (donde el sector 1 está en `[-24, 6, -18]` con color turquesa y el carmesí en la posición 10).
   - *Recomendación:* Unificar ambas definiciones en una sola fuente de verdad dentro de `taxonomy.ts`.

---

### 7.5 Riesgos de Memoria WebGL, Ciclo de Vida de Audio y Almacenamiento

1. **Instanciación Repetida de Geometrías Invisibles por Cada Estrella:**
   - En `src/components/canvas/star/StarCoreMesh.tsx` (L49-50): cada nodo estelar crea una nueva instancia de `<sphereGeometry args={[1, 8, 8]} />` inline para la esfera de colisión del raycaster. Con bibliotecas de 500 a 3,000 canciones, esto satura la memoria GPU con geometrías idénticas en lugar de reutilizar una instancia estática como las provistas en `starGeometries.ts`.
2. **Recompilación de Materiales durante el Ajuste de Brillo Estelar:**
   - En `src/components/canvas/DistantSongsCloud.tsx` (L87): el hook `useMemo` del material `PointsMaterial` incluye `stellarBrightness` como dependencia. Cuando el usuario desplaza el control deslizante de brillo en el HUD, el material se destruye (`dispose()`) y se recompila en cada cuadro (60 veces por segundo), provocando caídas de FPS (*jank*) en el hilo principal. La propiedad `material.opacity` debería actualizarse directamente sin recrear el material.
3. **Liberación del Motor Web Audio (`WebAudioEngine`):**
   - `webAudioEngine` está instanciado como singleton global. Aunque implementa un método `dispose()`, este método no es invocado en ningún efecto de limpieza (`useEffect`) de React, manteniendo nodos y listeners vinculados indefinidamente en memoria RAM.
4. **Almacenamiento de Tokens en Texto Plano y Falta de Refresh Token:**
   - El token Bearer de Spotify se guarda directamente en `localStorage.getItem('ymv_spotify_access_token')`. Si ocurriera una inyección de script (XSS), el token podría ser leído. Además, la implementación no procesa el `refresh_token`, provocando que el token expire a los 60 minutos obligando al usuario a iniciar sesión nuevamente.
5. **Riesgo de Saturación de Cuota de `localStorage` (`persistentArtistCache`):**
   - Los metadatos de los artistas se guardan individualmente bajo claves `ymv_cache_artist_<id>`. Los navegadores imponen un límite rígido de ~5 MB para `localStorage`. Al importar 1,000 o 3,000 canciones con cientos de artistas, la cuota puede desbordarse. La función de poda `pruneOldEntries()` no utiliza una política LRU (*Least Recently Used*), sino que borra de manera aleatoria el primer 25% de claves devueltas por el navegador.
6. **El importer modifica el payload que recibe (detectado en M5.2b):**
   - `buildMusicGalaxyFromPayload` escribe `rawTrack.secondaryGenre` con el valor del clasificador en cada tema que no lo trae. Quien reutilice el payload (presets, tests) ve datos que no puso. Los tests de M5 leen los valores curados desde `ARTIST_DATABASE` por este motivo.
7. **Vocabularios distintos en el clasificador (detectado en M5.2):**
   - Los géneros principales usan nombres específicos (p. ej. `TRIP-HOP & BRISTOL DUB`) y los secundarios un vocabulario amplio (`ELECTRÓNICA, HOUSE & TECHNO`, `POP INTERNACIONAL & SYNTH-POP`…) que casi nunca existe como nebulosa; varios parecen valores por defecto. Con datos reales, `secondaryGenreId` aporta poca señal y las relaciones dependen sobre todo de colaboraciones y TF-IDF. Queda pendiente derivar las relaciones de forma más dinámica a partir de las canciones del usuario.
8. **Modo nebula: pendientes tras M7 (detectado en M5.5, actualizado en M6.4 y M7):**
   - Resuelto en M6: el gas v3 reemplaza a `NebulaClusters` en modo nebula, ya no satura el bloom y vuelven a verse el agujero negro y el disco espiral.
   - Resuelto en M7: choques visibles y navegables (universo → choque → canción puente → reproducir verificado con Playwright).
   - Resuelto en M8: agujero negro en un hueco del cúmulo (M8.1), encuadre de vista general y warp-in para la esfera nebula (M8.2; en celular vertical llega al tope de 110 u y puede recortar nebulosas exteriores a los costados), máximo 5 etiquetas de género y marcadores `∩ n` que no pisan artistas (M8.3), `nebula` por defecto (M8.4).
   - Abierto: al cargar, la ficha del primer artista aparece abierta y tapa el lado derecho de la vista general (pasa igual en `classic`; el store arranca con ese artista seleccionado).
   - Calibración: `NEBULA_GAS_LOOK` y `NEBULA_CLASH_LOOK` se eligieron sobre renders por software (densidad reducida en la app, 35k fuera de ella). Falta validarlos en GPU real, junto con los FPS del preset 300 en celular (criterio ≥ 50 FPS).
9. **Entorno de pruebas visuales (detectado en M7.3):**
   - Con WebGL por software el warp-in de entrada no termina: GSAP trata los frames > 500 ms como de 33 ms (*lag smoothing*). Pasa igual en `classic`; las capturas usan `prefers-reduced-motion` para saltarlo. No afecta a GPUs reales.
   - `300_sector` en `test:visual` varía entre ~0.01 y ~0.16 según el estado de hover/pulso de la cápsula "Ficha" (punto con `animate-pulse` bajo el puntero tras cerrar la ficha); queda bajo el umbral de 0.5.
---

## 8. Gestión de Dudas y Aspectos No Deducibles (`PREGUNTA:`)

Durante la auditoría técnica exhaustiva del código fuente y los archivos de configuración, se han identificado los siguientes aspectos que **no pueden deducirse fehacientemente** de los archivos presentes en el repositorio y requieren confirmación por parte del equipo del proyecto:

1. `PREGUNTA:` **Modo de Cuota del Spotify Client ID por Defecto:**  
   En `src/lib/spotify/spotifyClient.ts` (L21) y `.env.local` se define el Client ID `0313886d00a24a5f96650ce722baa104`. En la plataforma para desarrolladores de Spotify, las aplicaciones nuevas operan por defecto en *Development Mode* (limitadas a un máximo de 25 cuentas registradas manualmente en el Dashboard). ¿Esta aplicación de Spotify ha sido aprobada formalmente para cuota pública (*Extended Quota Mode*), o los nuevos usuarios deben configurar obligatoriamente su propio Client ID mediante el modal de la UI para poder autenticarse?

2. `PREGUNTA:` **Origen y Uso Productivo de la Clave Fallback de Last.fm:**  
   En `src/app/api/enrich-tracks/route.ts` (L40-41) se incluye una clave de Last.fm por defecto en texto plano:  
   `const LASTFM_API_KEY = process.env.LASTFM_API_KEY || 'b25b959554ed76058ac220b7b2e0a026';`  
   ¿Corresponde esta clave a una credencial personal del desarrollador, a una clave comunitaria de prueba o a una clave corporativa? ¿Debe incluirse formalmente la variable `LASTFM_API_KEY` dentro del archivo `.env.example` para que los nuevos colaboradores configuren su propia clave privada?

3. `PREGUNTA:` **Persistencia de Caché en Entornos Serverless Multi-Instancia:**  
   Las cachés en memoria de los Route Handlers (`inMemoryAudioCache` con 60 audios MP3 en `/api/track-preview` y `trackTaxonomyCache` en `/api/enrich-tracks`) residen en la memoria RAM del proceso local de Node.js. En despliegues tipo Serverless (como Vercel Lambdas), cada función se ejecuta en contenedores efímeros y aislados, por lo que las cachés en RAM se pierden entre arranques en frío (*cold starts*) y no se comparten entre instancias paralelas. ¿Existe el plan arquitectónico de incorporar una capa de caché distribuida en red (ej. Redis / Upstash / Vercel KV) para audio y taxonomía, o se mantendrá deliberadamente sin persistencia externa?

4. `PREGUNTA:` **Presencia de la Dirección IP Fija Local `192.168.0.4` en `next.config.ts`:**  
   En `next.config.ts` (L8), la opción `allowedDevOrigins` incluye la IP fija privada `"192.168.0.4"`. ¿Se trata de una dirección IP de desarrollo local del autor original que debería ser generalizada o parametrizada vía variable de entorno para evitar confusiones a nuevos desarrolladores en distintas subredes locales?

5. `PREGUNTA:` **Discrepancia Histórica de Nombres entre `components/hud/` y `components/ui/`:**  
   En el archivo `README.md` (L67) se hace referencia a la ruta `src/components/ui/`, mientras que en el código fuente actual y en el sistema de archivos físico la carpeta se denomina `src/components/hud/`. ¿Se confirma que `src/components/hud/` es la denominación canónica y definitiva para actualizar la documentación histórica del README?

6. `PREGUNTA:` **Estandarización Futura del Arnés de Pruebas Automatizadas:**  
   El comando `npm test` en `package.json` invoca dos scripts de aserciones personalizadas ejecutadas con `tsx` (`tests/verification/milestone2.test.ts` y `tests/verification/milestone2_challenger.test.ts`). ¿Existe la intención a mediano plazo de migrar hacia un test runner formal estandarizado (como **Vitest** o **Jest** con mocks para WebGL y Web Audio API) para incorporar pruebas unitarias de componentes React y hooks cinemáticos?

7. `PREGUNTA:` **Incorporación Formal de la Suite de Pruebas Visuales E2E con Playwright:**  
   En el repositorio existen artefactos y capturas generadas por scripts de Playwright (`test-results/` y `.playwright-cli/`). ¿Se planea incorporar un comando oficial `npm run test:e2e` en `package.json` y agregar la ejecución de pruebas visuales end-to-end dentro del pipeline de integración continua de GitHub Actions (`.github/workflows/ci.yml`)?  
   **Respuesta parcial (M4.3):** se incorporó `npm run test:visual` (más `test:visual:baseline`) con `playwright` y `pngjs` como devDependencies exactas. Por decisión del plan de migración queda **fuera de CI** y se corre a mano en cada sub-paso. Sigue abierto si se sube a CI y dónde versionar el baseline.
