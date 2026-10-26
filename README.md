# 🌌 YourMusicVisualizer — Cosmos 3D de tu Música

> Visualizador tridimensional interactivo que transforma tu biblioteca musical en una galaxia astronómica procedural viva. Canciones, géneros y artistas se proyectan como estrellas, nebulosas bioluminiscentes y puentes de constelaciones hiperconectados en 60 FPS estables.

---

## ✨ Características Principales

### 🔭 1. Motor Visual 3D WebGL (Three.js & React Three Fiber)
* **Disco de Polvo Galáctico Mayor:** 3.600 partículas estelares distribuidas en un núcleo galáctico áureo, 3 brazos espirales logarítmicos multi-espectrales (cian eléctrico, magenta cósmico y ultravioleta) y filamentos exteriores difusos.
* **Cúmulos de Gas y Nebulosas Orgánicas:** Nebulosas volumétricas que envuelven cada sector musical y respiran armónicamente con las frecuencias sub-graves de la música.
* **Tipografía SDF en la GPU:** Etiquetas 3D orientadas a cámara mediante `<Billboard>` y Signed Distance Fields (`@react-three/drei`), garantizando nitidez vectorial a cualquier distancia con **cero colisiones en el DOM de React 19**.
* **Post-procesamiento HDR:** Pipeline con `UnrealBloomPass` calibrado con umbral estricto para evitar sobreexposiciones y destacar exclusivamente los núcleos estelares activos.
* **Seguridad Fotosensible (WCAG 2.3):** Ausencia de destellos estroboscópicos violentos o parpadeos aleatorios agresivos; modulaciones graduales y respeto estricto a `prefers-reduced-motion`.

---

### 👑 2. Tiers Evolutivos y Diseños Cósmicos Únicos
A medida que aumenta tu historial de escucha en un género o artista, estos evolucionan y desbloquean geometrías cósmicas exclusivas:

| Entidad | Nivel / Hito | Características Visuales 3D | Ficha HUD |
| :--- | :--- | :--- | :--- |
| **Artista** | **Tier 1 (Estándar)** | Estrella compacta con halo suave. | Metadatos básicos y catálogo. |
| **Artista** | **Tier 2 (Gigante Radial)** | Corona reforzada + disco de acreción inclinado en rotación suave. | Distintivo `GIGANTE RADIAL`. |
| **Artista** | **Tier 3 (Supergigante Alfa)** | **Doble anillo concéntrico en contra-rotación** + **3 micro-satélites orbitales** girando activamente. | Sello dorado `★ SUPERGIGANTE ALFA`. |
| **Sector** | **Tier 1 (Emergente)** | Nebulosa difusa suave (< 8 pistas). | Indicador en constelaciones. |
| **Sector** | **Tier 2 (Activo)** | Cúmulo de gas denso y halo ecuatorial (8–24 pistas). | Distintivo `SECTOR ACTIVO`. |
| **Sector** | **Tier 3 (Supercúmulo Dominante)** | **Chorros Polares Relativistas (AGN Polar Jets)** verticales + nebulosa de gas expandida a $1.35\times$. | Badge dorado `★ Dominante` en HUD y constelaciones. |

---

### ⚡ 3. Presets de Evolución Estelar Instantáneos
Prueba la expansión del cosmos sin necesidad de iniciar sesión con un solo clic desde el selector del dock inferior:
* **`50p` (Cosmos Íntimo):** 5 sectores y 15 artistas icónicos (Daft Punk, Radiohead, Massive Attack, YOASOBI, Aphex Twin).
* **`150p` (Galaxia Expandida):** 8 sectores (suma Neo-Soul, Cyberpunk y Post-Rock) con 35 artistas y densas órbitas de canciones.
* **`300p` (Supercúmulo Estelar):** 12 sectores con la paleta cósmica completa (Jazz Fusion, Psicodelia Tropical, Future Bass) y más de 65 artistas.

---

### 🚀 4. Transiciones Cinemáticas de Cámara (GSAP)
* **Vuelo Interpolado con Easing `power3.inOut`:** Aceleración y desaceleración suaves que eliminan saltos bruscos o tirones al cambiar entre canciones, artistas, sectores o volver a la vista panorámica de la galaxia.
* **Elevación Parabólica Dinámica:** Los viajes de larga distancia a través de la galaxia ascienden sobre el plano estelar en un elegante arco sinusoidal (`bellCurve = Math.sin(p * Math.PI)`), mientras que los saltos locales entre canciones se mantienen directos y descansados para la vista.

---

### 🎵 5. Motor de Audio Reactivo (Web Audio API)
* **Dock Espectral FFT de 24 Bandas:** Visualizador de espectro sonoro en tiempo real integrado en la interfaz flotante.
* **Audio-Reactividad en Tiempo Real:** Las nebulosas y las estrellas laten sutilmente al ritmo del sub-bass de la pista activa.
* **Sintetizador Cósmico Procedural Offline:** Si una pista no dispone de enlace de preescucha externo, el motor sintetiza una atmósfera armónica pentatónica única según la afinidad y el tono de la canción.

---

### 🛡️ 6. Resiliencia Industrial contra Rate Limiting (Spotify API)
Capa de red optimizada para prevenir y manejar errores **HTTP 429 (Too Many Requests)**:
* **Wrapper `fetchWithRetry`:** Lectura automática del header `Retry-After`. Si el tiempo de espera excede los 15 segundos, se aborta la cola y se ofrece reconexión limpia. Backoff exponencial con jitter para reintentos transparentes.
* **Throttling y Límite de Concurrencia:** Máximo de 2 a 3 peticiones simultáneas con pausas programadas de 250ms a 350ms.
* **Batching y Deduplicación:** Filtrado estricto de IDs (`new Set()`) y peticiones por lotes de hasta 50 entidades por solicitud (`/v1/artists?ids=...`).
* **Caché Persistente en `localStorage`:** Almacenamiento indexado por ID de canción y artista para evitar peticiones redundantes.

---

### 🏷️ 7. Taxonomía Musical y Puentes de Afinidad TF-IDF
* **Clasificación Automática de Géneros:** Motor de normalización rápida para mapear géneros complejos a cuadrantes galácticos estables.
* **Puentes Inter-Estelares:** Cálculo de similitud de términos TF-IDF sobre subgéneros y etiquetas para trazar enlaces de constelación visuales entre artistas relacionados de diferentes sectores.

---

### 🎴 8. Ficha Discográfica de Inspección (Archival Record-Sleeve)
* Estética inspirada en el coleccionismo de vinilos vintage y el archivo discográfico espacial japonés/británico.
* Muestra código de catálogo estelar, clasificación espectral (Harvard O/B/A/K), retrato del artista, notas biográficas del Lado A, lista de canciones en órbita y botones de salto directo a géneros y artistas de influencia.

---

## 🛠️ Stack Tecnológico

* **Frontend & Framework:** [Next.js 16](https://nextjs.org/) (App Router, Turbopack) + [React 19](https://react.dev/)
* **Gráficos 3D & WebGL:** [Three.js](https://threejs.org/) + [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber) + [@react-three/drei](https://github.com/pmndrs/drei)
* **Animaciones Cinemáticas:** [GSAP](https://greensock.com/gsap/) + [camera-controls](https://github.com/yomotsu/camera-controls)
* **Estilos & UI:** [Tailwind CSS](https://tailwindcss.com/) + [Lucide React](https://lucide.dev/)
* **Gestión de Estado:** [Zustand](https://github.com/pmndrs/zustand)
* **Audio:** Web Audio API (Analysers, BiquadFilters, GainNodes)
* **Integración Externa:** Spotify Web API (OAuth 2.0 PKCE Flow)

---

## 🏁 Instalación y Puesta en Marcha

### Prerrequisitos
* Node.js v18 o superior.
* npm, pnpm o yarn.

### 1. Clonar el Repositorio
```bash
git clone https://github.com/leann027/YourMusicVisualizer.git
cd YourMusicVisualizer
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno (Opcional para Spotify)
Crea un archivo `.env.local` en la raíz del proyecto:
```env
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=tu_spotify_client_id_aqui
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/callback
```
*(El visualizador ya incluye un Client ID preconfigurado y presets instantáneos de 50, 150 y 300 pistas que funcionan al 100% sin credenciales adicionales).*

### 4. Ejecutar en Modo Desarrollo
```bash
npm run dev
```
Abre [http://127.0.0.1:3000](http://127.0.0.1:3000) en tu navegador.

### 5. Compilar para Producción
```bash
npm run build
npm run start
```

---

## ⌨️ Atajos de Teclado & Navegación

* **`/` o `Ctrl + K` / `Cmd + K`:** Abrir el buscador estelar instantáneo.
* **Click Izquierdo + Arrastrar:** Rotar la cámara en órbita alrededor del cosmos.
* **Click Derecho / Dos Dedos + Arrastrar:** Desplazamiento panorámico (Pan).
* **Rueda del Ratón / Pellizcar:** Zoom in / Zoom out en el espacio tridimensional.
* **Click en una Estrella o Canción:** Vuelo cinemático suave hacia el nodo y despliegue de su ficha discográfica.
* **Botón `Galaxia`:** Vuelo panorámico de regreso a la vista general del universo.
* **Botones `50p` / `150p` / `300p`:** Alternar en tiempo real la densidad y evolución de la galaxia.

---

## 📄 Licencia

Distribuido bajo la Licencia **MIT**. Consulta el archivo `LICENSE` para más información.
