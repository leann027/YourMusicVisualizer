# YourMusicVisualizer

Sistema interactivo de exploración y renderizado 3D que transforma bibliotecas musicales en un cosmos procedural navegable en tiempo real. Canciones, artistas y géneros se computan como entidades estelares, cúmulos de gas nebular y discos de polvo galáctico que orbitan una singularidad central supermasiva, con cinemáticas de cámara en arco, interfaz perimetral de cristal y reactividad acústica por transformada rápida de Fourier (FFT).

---

## Indice

1. [Vision General](#vision-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Motor Grafico 3D y Shaders](#motor-grafico-3d-y-shaders)
4. [Dinamica Orbital y Fisica Gravitacional](#dinamica-orbital-y-fisica-gravitacional)
5. [Motor de Audio Reactivo](#motor-de-audio-reactivo)
6. [Tiers Evolutivos y Taxonomia Musical](#tiers-evolutivos-y-taxonomia-musical)
7. [Interfaz de Usuario y HUD](#interfaz-de-usuario-y-hud)
8. [Integracion de Red y Resiliencia](#integracion-de-red-y-resiliencia)
9. [Stack Tecnologico](#stack-tecnologico)
10. [Instalacion y Despliegue](#instalacion-y-despliegue)
11. [Controles y Navegacion](#controles-y-navegacion)
12. [Licencia](#licencia)

---

## Vision General

El proyecto modela la afinidad y los metadatos de bibliotecas musicales como cuerpos celestes en un espacio euclidiano tridimensional. La distribucion espacial se calcula mediante logaritmos de dispersion espiral y clasificaciones TF-IDF de subgeneros. La experiencia incluye una secuencia de entrada hiperespacial ("Warp-in"), una rotacion secular continua de todos los sectores alrededor de un agujero negro central, y renderizado acelerado en GPU a 60 fotogramas por segundo estables.

---

## Arquitectura del Sistema

El codigo esta estructurado de forma modular y desacoplada para garantizar cumplimiento estricto con las reglas de inmutabilidad y pureza de React 19 y React Three Fiber:

```
src/
├── app/                              # Rutas Next.js 16 (App Router)
│   ├── api/                          # Endpoints de enriquecimiento y streaming de previews
│   ├── callback/                     # Endpoint de redireccion OAuth 2.0 PKCE
│   └── page.tsx                      # Pagina principal y montaje de Canvas
├── components/
│   ├── canvas/
│   │   ├── galaxy/                   # Modulos del disco estelar y agujero negro
│   │   │   ├── SupermassiveBlackHole.tsx
│   │   │   ├── SpiralStardustPoints.tsx
│   │   │   ├── spiralStardustGeometry.ts
│   │   │   └── shaders/              # Shaders de horizonte de sucesos y lentes gravitacionales
│   │   ├── nebula/                   # Modulos de nubes de gas interestelar
│   │   │   ├── SectorNebulaCluster.tsx
│   │   │   ├── nebulaGeometry.ts
│   │   │   └── shaders/              # Turbulencia fractal y micro-flashes protoestelares
│   │   ├── star/                     # Modulos de representacion estelar
│   │   │   ├── StarCoreMesh.tsx      # Nucleo con oscurecimiento de limbo
│   │   │   ├── StarAccretionRings.tsx # Anillos con divisiones Cassini y falloff radial
│   │   │   ├── StarFeatures.tsx      # Chorros polares y picos de difraccion
│   │   │   ├── StarPlaybackPulsar.tsx# Ondas de choque acusticas y satelites FFT
│   │   │   ├── StarLabel.tsx         # Tipografia SDF Billboard nativa en GPU
│   │   │   └── shaders/              # Shaders de superficie estelar
│   │   ├── hooks/                    # Hooks desacoplados de camara y rendimiento
│   │   │   ├── useWarpSequence.ts    # Transicion de salto hiperespacial
│   │   │   ├── useArcFlight.ts       # Interpolacion parabolica GSAP
│   │   │   ├── useOrbitalTracking.ts # Bloqueo orbital sobre estrellas en rotacion
│   │   │   └── usePerformanceMonitor.ts # Metricas de draw calls y FPS
│   │   ├── ConstellationLinks.tsx    # Filamentos de influencia inter-estelar
│   │   ├── DistantSongsCloud.tsx     # Nube masiva de canciones en 1 draw call
│   │   ├── PostProcessingPipeline.tsx# UnrealBloomPass con amortiguacion adaptativa
│   │   └── WarpTunnelMesh.tsx        # Trazas de luz estelar hiperespacial
│   └── ui/                           # Interfaz flotante de cristal (Glassmorphism Dock)
│       ├── AudioControlBar.tsx       # Barra de reproduccion y ecualizador
│       ├── CelestialSearchModal.tsx  # Buscador estelar instantaneo
│       ├── ConstellationDrawer.tsx   # Panel de constelaciones y sectores
│       ├── FloatingDockHUD.tsx       # Dock perimetral inferior
│       └── RecordSleeveCard.tsx      # Ficha de archivo discografico
├── lib/
│   ├── audio/WebAudioEngine.ts       # Motor FFT de 64 bandas y sintetizador fallback
│   ├── spotify/                      # Capa de red con backoff exponencial
│   └── math/                         # Normalizacion de distribuciones y RNG
└── store/
    └── useGalaxyStore.ts             # Estado global con Zustand
```

---

## Motor Grafico 3D y Shaders

### 1. Singularidad Central y Agujero Negro Supermasivo
- **Horizonte de Sucesos:** Esfera de absorcion luminica absoluta en las coordenadas `[0, 0, 0]`.
- **Disco de Acrecion Relativista:** Shader procedural en espacio planar UV que modela plasma en flujo kepleriano espiral dependiente de la distancia radial, con corte neto en la Orbita Circular Estable mas Interna (ISCO) y desvanecimiento suave exterior.
- **Efecto Doppler Relativista:** Modulacion termica cromatica (dorado incandescente a magenta) con beaming asimetrico que intensifica el sector del disco que rota hacia el observador.
- **Arco de Lente Gravitacional:** Malla curvada orientada a camara que simula la deflexion de luz por deformacion del espacio-tiempo (estilo gargantua).

### 2. Nebulosas de Gas Ionizado y Polvo Cósmico
- **Cavidad de Stromgren:** El volumen de gas nebular despeja un radio interior minimo de 3.2 unidades alrededor de la estrella principal de cada genero, asegurando legibilidad total de texto y evitando colisiones de particulas.
- **Turbulencia Fractal 2D:** Modulacion de los sellos de particula mediante ruido armonico sinusoidal y cosenoidal en UVs que rompe los bordes circulares convirtiendolos en filamentos organicos de humo interestelar.
- **Micro-Flashes Protoestelares:** Destellos estocasticos individuales controlados por fase procedural en vertex shaders. Emplean una funcion exponencial radial ultra-fina `exp(-dist^2 * 160.0)` con difraccion en cruz, simulando chispas opticas puntuales sin deformar el tamano del vertice.
- **Amortiguacion de Proximidad:** Atenuacion suave de opacidad calculada via `smoothstep(3.5, 12.0, vCamDist)`, permitiendo apreciar la profundidad del gas desde la lejania y disipandolo de forma limpia cuando la camara inspecciona una estrella.

### 3. Nucleos Estelares y Anillos Planetarios
- **Oscurecimiento de Limbo (Limb Darkening):** Shader inyectado en `MeshBasicMaterial` mediante `onBeforeCompile` que computa el producto escalar entre la normal y el vector de vista `pow(NdotV, 0.45)`, eliminando el aspecto de esferas plasticas uniformes.
- **Anillos con Divisiones Cassini:** Desvanecimiento radial estricto dependiente de la distancia euclidiana en el plano UV `sin(rNorm * PI)` con micro-ranuras oscuras sinusoidales, anulando los cortes angulares de los bordes geometricos.
- **Chorros Polares y Picos de Difraccion:** Efectos de alta energia para sectores y artistas dominantes que se ocultan dinamicamente en distancias cortas.

### 4. Post-Procesado HDR Adaptativo
- Integracion de `UnrealBloomPass` configurado con radio de dispersion contenido (0.16) y umbral alto (0.92).
- Amortiguacion dinamica: la intensidad del bloom se escala en tiempo real en funcion de la distancia de la camara al objetivo focal, previniendo saturacion blanca ("glare blowout") al aproximarse a cualquier cuerpo estelar.

---

## Dinamica Orbital y Fisica Gravitacional

### 1. Rotacion Galactica Secular
Todo el contenedor de la galaxia (disco de polvo espiral, agujero negro central, sectores nebulares, estrellas de artistas y canciones) se encuentra anclado a un grupo unificado que gira lentamente alrededor del eje Y a razon de 0.007 radianes por segundo.

### 2. Bloqueo Orbital de Camara (`useOrbitalTracking`)
Al seleccionar una estrella para inspeccion detallada:
- Las coordenadas locales de la estrella se proyectan a coordenadas de mundo globales en cada fotograma mediante la matriz de transformacion del contenedor `matrixWorld`.
- La camara aplica micro-desplazamientos proporcionales que preservan de forma exacta la distancia y el angulo de vision relativo respecto a la estrella objetivo, permitiendo que el usuario acompanie a la estrella en su traslacion orbital continua sin desorientacion.

### 3. Trayectorias de Vuelo en Arco Parabolico (`useArcFlight`)
- Control de interpolacion cinematica ejecutado mediante GSAP sobre `CameraControls`.
- Vuelos de larga distancia aplican una elevacion sinusoidal parabólica en el eje vertical (`arcLift = bellCurve * liftFactor`) con balanceo lateral controlado.
- Saltos locales (entre canciones del mismo artista o cluster) omiten la elevacion vertical para evitar cabeceos o mareo visual.

---

## Motor de Audio Reactivo

El modulo `WebAudioEngine` gestiona el procesamiento acustico en cliente:

- **Analisis FFT de 64 Bandas:** Frecuencias discretizadas en tiempo real con suavizado temporal (`smoothingTimeConstant: 0.82`).
- **Extraccion de Rangos:**
  - `subBass` (20 Hz - 90 Hz): Modula el radio de los pulsars estelares y la respiracion del horizonte de sucesos.
  - `midHarmonic` (300 Hz - 2.5 kHz): Rige la velocidad orbital de los micro-satelites ecualizadores.
  - `highShimmer` (5 kHz - 14 kHz): Modula el titilado de los micro-destellos en el gas interestelar.
  - `energy`: Promedio rms total que gobierna la velocidad de turbulencia del disco de acrecion.
- **Pulsar Acustico Multi-Onda (`StarPlaybackPulsar`):**
  - La estrella que reproduce audio proyecta 3 frentes de onda concentricos desfasados en colores cian, lima y magenta con desvanecimiento sinusoidal.
  - Cuatro micro-sparks ecualizadores orbitan en planos inclinados modulando su escala por banda de frecuencia.
  - Se monta condicionalmente en tiempo de ejecucion unicamente sobre el nodo en reproduccion activa, garantizando consumo cero de CPU/GPU en nodos inactivos.
- **Sintetizador Procedural Armonico:** En caso de que una pista no cuente con enlace de preview disponible en Spotify, el motor sintetiza una atmosfera tonal armonica generativa en tiempo real.

---

## Tiers Evolutivos y Taxonomia Musical

La densidad de la biblioteca y la afinidad de escucha promueven a las entidades a traves de estadios cosmicos:

| Nivel | Tipo | Criterio | Manifestacion Visual 3D |
| :--- | :--- | :--- | :--- |
| **Enana Estelar** | Cancion / Artista | Afinidad estandar | Esfera con oscurecimiento de limbo y corona bioluminiscente. |
| **Gigante Radial** | Artista | Historial significativo | Disco ecuatorial de acrecion con falloff Cassini. |
| **Supergigante Alfa** | Artista | Gran volumen de pistas | Doble anillo concéntrico contra-rotante y satélites orbitales. |
| **Sector Activo** | Genero | 8 a 24 canciones | Nebulosa densa ionizada con turbulencia fractal. |
| **Supercumulo Dominante**| Genero | Mas de 24 canciones | Nebulosa expandida ($1.35\times$) y chorros polares relativistas. |

---

## Interfaz de Usuario y HUD

- **Glassmorphism Dock Perimetral:** Contenedor perimetral flotante con fondo translucido (`backdrop-blur-md`), borde de cristal y botones micro-interactivos para control de brillo estelar, filtro de afinidad y alternancia de vistas.
- **Tipografia SDF Nativa en GPU (`StarLabel`):** Textos orientados al observador mediante `<Billboard>` utilizando Signed Distance Fields (`@react-three/drei`). Disponen de contorno oscuro de alto contraste (`outlineColor: #020205`), eliminando por completo colisiones y desbordamientos en el arbol DOM de React.
- **Ficha Discografica de Archivo (`RecordSleeveCard`):** Panel deslizable que detalla catalogacion estelar, retrato del artista, pistas relacionadas con duracion y acceso directo a reproduccion.
- **Buscador Estelar:** Acceso global mediante atajo de teclado (`/` o `Ctrl+K`) con filtrado instantaneo por genero, artista o cancion y foco de camara automatico.

---

## Integracion de Red y Resiliencia

El cliente de Spotify API implementa una arquitectura disenada para operar bajo limites de tasa estrictos (Rate Limiting HTTP 429):

- **Autenticacion Segura:** OAuth 2.0 PKCE en cliente puro, sin almacenamiento de secretos en servidor.
- **Mecanismo `fetchWithRetry`:** Inspeccion sistematica de la cabecera `Retry-After`. Si el tiempo de espera excede 15 segundos, la solicitud se cancela de forma controlada informando al usuario en la interfaz. Reintentos automaticos con retroceso exponencial y varianza aleatoria (jitter).
- **Control de Concurrencia:** Limitacion a un maximo de 2 peticiones paralelas con intervalo de espaciado regulado entre 250ms y 350ms.
- **Cache Local Indexada:** Almacenamiento persistente en `localStorage` con expiracion automatica para evitar consultas redundantes de artistas y pistas ya sincronizadas.

---

## Stack Tecnologico

- **Framework Web:** Next.js 16 (App Router, Turbopack)
- **Biblioteca de Interfaz:** React 19
- **Motor Grafico 3D:** Three.js r180
- **Ecosistema R3F:** `@react-three/fiber` y `@react-three/drei`
- **Animaciones Cinemáticas:** GSAP 3 y `camera-controls`
- **Gestion de Estado:** Zustand
- **Estilos:** Tailwind CSS 4
- **Audio:** Web Audio API nativa
- **Analisis Estructural:** Graphify
- **Auditoria Visual Automatizada:** Playwright

---

## Instalacion y Despliegue

### Requisitos Previos
- Node.js version 18.18 o superior.
- Gestor de paquetes npm, pnpm o yarn.

### 1. Clonar el Repositorio
```bash
git clone https://github.com/leann027/YourMusicVisualizer.git
cd YourMusicVisualizer
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configuracion de Entorno (Opcional)
Para conectar con una cuenta propia de Spotify, crear un archivo `.env.local` en la raiz:
```env
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=tu_spotify_client_id
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/callback
```
*Nota: La aplicacion incluye presets precalculados (50, 150 y 300 pistas) totalmente operativos sin necesidad de credenciales externas.*

### 4. Modo de Desarrollo
```bash
npm run dev
```
Acceder a `http://127.0.0.1:3000` en el navegador.

### 5. Compilacion de Produccion
```bash
npm run build
npm run start
```

### 6. Verificacion de Calidad
```bash
# Comprobacion estricta de linters (0 errores, 0 advertencias)
npm run lint

# Ejecucion de pruebas unitarias y de integracion
npm run test
```

---

## Controles y Navegacion

- **Click Izquierdo + Arrastrar:** Rotacion de camara orbital alrededor del cosmos.
- **Click Derecho + Arrastrar:** Desplazamiento panoramico en el plano focal (Pan).
- **Rueda del Raton:** Zoom continuo hacia adelante y hacia atras.
- **Click en Estrella / Cancion:** Vuelo cinemático interpolado hacia el nodo y apertura de ficha discografica.
- **Barra Espaciadora / Escape:** Cancelacion inmediata del salto hiperespacial de entrada o interrupcion del vuelo activo.
- **`/` o `Ctrl + K` / `Cmd + K`:** Abrir buscador estelar.
- **Boton "Galaxia":** Retorno cinemático a la perspectiva panoramica general.
- **Selectores `50p` / `150p` / `300p`:** Alternancia inmediata entre densidades cosmicas precalculadas.

---

## Licencia

Distribuido bajo los terminos de la Licencia MIT. Consulte el archivo `LICENSE` para mas detalles.
