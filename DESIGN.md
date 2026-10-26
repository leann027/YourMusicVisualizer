---
name: YourMusicVisualizer
description: Interactive 3D musical cosmos and audio-reactive TouchDesigner stage rig HUD
colors:
  void-carbon: "#050508"
  obsidian-dock: "#090B12"
  sleeve-surface: "#0A0C14"
  nebula-elevated: "#131826"
  sleeve-synth-bg: "#0E1726"
  sleeve-artrock-bg: "#1F0C1D"
  sleeve-idm-bg: "#141B0B"
  sleeve-dreampop-bg: "#0B192C"
  bioluminescent-cyan: "#00F5D4"
  infrared-magenta: "#FF2A85"
  acid-lime: "#CCFF00"
  celestial-azure: "#38BDF8"
  starlight-white: "#F2F4F8"
  nebula-mist: "#B8DCE8"
  # 14-16 Celestial Genre Sector Palette & Matched Sleeves
  turquesa-espacial: "#00F5D4"
  turquesa-espacial-bg: "#081D1A"
  magenta-cosmico: "#FF2A85"
  magenta-cosmico-bg: "#200C1D"
  verde-radiactivo: "#CCFF00"
  verde-radiactivo-bg: "#141C0A"
  azul-zafiro: "#38BDF8"
  azul-zafiro-bg: "#0B1A2C"
  violeta-pulsar: "#A855F7"
  violeta-pulsar-bg: "#1A0C2B"
  ambar-supernova: "#F59E0B"
  ambar-supernova-bg: "#261708"
  rosa-nebular: "#EC4899"
  rosa-nebular-bg: "#260B1C"
  esmeralda-interestelar: "#10B981"
  esmeralda-interestelar-bg: "#071F18"
  indigo-profundo: "#6366F1"
  indigo-profundo-bg: "#0E112B"
  carmesi-gigante-roja: "#F43F5E"
  carmesi-gigante-roja-bg: "#260B14"
  cian-acuatico: "#14B8A6"
  cian-acuatico-bg: "#061E1D"
  oro-estelar: "#EAB308"
  oro-estelar-bg: "#231C06"
  lavanda-astral: "#8B5CF6"
  lavanda-astral-bg: "#160D2A"
  coral-solar: "#FB7185"
  coral-solar-bg: "#270E15"
  cian-electrico: "#06B6D4"
  cian-electrico-bg: "#071E24"
  fucsia-cuantico: "#D946EF"
  fucsia-cuantico-bg: "#250B27"
  verde-neon: "#22C55E"
  verde-neon-bg: "#06200F"
  cobre-astral: "#F97316"
  cobre-astral-bg: "#241006"
  menta-cosmica: "#2DD4BF"
  menta-cosmica-bg: "#061F1B"
  rubi-interestelar: "#E11D48"
  rubi-interestelar-bg: "#23080F"
  sakura-ciber-neon: "#FF3399"
  sakura-ciber-neon-bg: "#26071B"
typography:
  display:
    fontFamily: "Syne, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Syne, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Syne, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.2
  micro:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: 1.2
  stamp:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "9px"
    fontWeight: 700
    lineHeight: 1.1
  rpm:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "8px"
    fontWeight: 600
    lineHeight: 1.1
rounded:
  xs: "3px"
  sm: "4px"
  full: "9999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "20px"
components:
  button-primary:
    backgroundColor: "{colors.bioluminescent-cyan}"
    textColor: "{colors.void-carbon}"
    rounded: "{rounded.sm}"
    padding: "6px 14px"
  button-primary-hover:
    backgroundColor: "{colors.acid-lime}"
  button-sector:
    backgroundColor: "{colors.void-carbon}"
    textColor: "{colors.nebula-mist}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  button-sector-active:
    backgroundColor: "{colors.nebula-elevated}"
    textColor: "{colors.starlight-white}"
  card-sleeve:
    backgroundColor: "{colors.sleeve-surface}"
    textColor: "{colors.starlight-white}"
    rounded: "{rounded.sm}"
    padding: "16px"
  input-search:
    backgroundColor: "{colors.obsidian-dock}"
    textColor: "{colors.starlight-white}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
---

# Design System: YourMusicVisualizer

## Overview

**Creative North Star: "Pulso Estelar Generativo (Audiovisual Stage Rig)"**

YourMusicVisualizer rejects flat streaming tables and generic dark-mode SaaS sidebars in favor of a live TouchDesigner audiovisual stage rig and volumetric 3D starfield. Every musical entity—genre constellation, artist star, and satellite track—is rendered as a luminous celestial body whose core radius scales logarithmically with song volume (`ln(1 + songCount)`) and whose bioluminescent corona scales non-linearly with listener affinity (`affinity^1.5`).

Around the perimeter of the full-viewport WebGL cosmos, precision 2D telemetry docks (`JetBrains Mono`) and archival vinyl record-sleeve placards (`Syne` 800 display headers paired with square geometric studio portraits) float without obstructing the central starfield. Selecting any star triggers a calibrated GSAP + `CameraControls` flight (`expo.out`, `520ms–920ms`) and real-time Web Audio API FFT spectrum modulation across connected constellation filaments and `UnrealBloomPass` coronas.

**Key Characteristics:**
- Full-bleed `100vw × 100dvh` 3D WebGL starfield over deep void carbon (`#050508`).
- Perimeter-docked technical HUD with `pointer-events-none` passthrough over the central 3D canvas.
- Archival Yé-Yé Pop / record-sleeve artist inspection placards with square catalog portraits, spectral metrics, and Side-A tracklists.
- Real-time 64-bin Web Audio FFT spectrum analysis driving 3D star respiration, cross-genre filament waves, and `UnrealBloomPass` intensity.

## Colors

The palette pairs an ultra-dark cosmic void with high-chroma bioluminescent telemetry accents that maintain WCAG AA contrast across every HUD readout.

### Primary
- **Bioluminescent Cyan** (`#00F5D4`): Primary interactive accent, active search focus ring, galaxy view trigger, and core telemetry borders.

### Secondary
- **Infrared Magenta** (`#FF2A85`): Archival record-sleeve card border framing, affinity badge background, cross-genre bridge filaments, and Bloom status indicator.

### Tertiary
- **Acid Lime** (`#CCFF00`): High-affinity (`≥92%`) star highlights, active sector selection borders, track duration readouts, and active FFT pulse indicators.

### Neutral
- **Void Carbon** (`#050508`): Primary 3D WebGL space backdrop and high-contrast button ink on cyan/magenta/lime fills.
- **Obsidian Dock** (`#090B12`): Translucent perimeter HUD panel surface (`90%–95%` opacity).
- **Sleeve Surface** (`#0A0C14`): Archival artist inspection card background.
- **Nebula Elevated** (`#131826`): Active track/sector row background and keyboard-highlighted combobox option surface.
- **Starlight White** (`#F2F4F8`): Primary display headings, artist titles, and active node labels.
- **Nebula Mist** (`#B8DCE8`): Tinted cyan-silver secondary telemetry prose and metadata labels (replacing generic neutral gray).

### Named Rules
**The Zero-Dead-Gray Rule.** Never place untinted neutral gray text (`#888888`, `#999999`) on dark cosmic surfaces; always use cyan-tinted **Nebula Mist** (`#B8DCE8`) so secondary readouts harmonize with the starfield and exceed 4.5:1 WCAG AA contrast.

**The Chromatic Semantics Rule.** Every accent hue encodes a specific dimension of musical telemetry: Cyan (`#00F5D4`) for spatial navigation and core radius, Magenta (`#FF2A85`) for archival record-sleeve identity and cross-genre bridges, and Acid Lime (`#CCFF00`) for peak listener affinity and active audio playback.

## Typography

**Display Font:** `Syne` (weights `700`, `800`, with `sans-serif` fallback)
**Body Font:** `JetBrains Mono` (weights `400`, `500`, `700`, with `monospace` fallback)
**Label/Mono Font:** `JetBrains Mono` (`tabular-nums` enforced globally)

**Character:** Expressive, architectural `Syne` display typography gives artist names and constellation titles the physical presence of archival vinyl record sleeves, while `JetBrains Mono` with `font-variant-numeric: tabular-nums` ensures live FPS, parsec distances, and FFT counters never jitter during 60 FPS updates.

### Hierarchy
- **Display** (`800`, `1.5rem / 24px`, `line-height: 1.15`): Active artist or song title (`<h2>`) leading the archival record-sleeve card.
- **Headline** (`800`, `1.25rem / 20px`, `line-height: 1.2`): Top application masthead (`<h1> YOURMUSICVISUALIZER`).
- **Title** (`700`, `0.875rem / 14px`, `line-height: 1.3`): Section headers (`Constelaciones por Estilo`, `Lado A · Pistas en Órbita`).
- **Body** (`400`, `0.75rem / 12px`, `line-height: 1.55`, `45ch–65ch`): Artist archival biographies and genre descriptions with `text-wrap: pretty`.
- **Label** (`600`, `0.6875rem / 11px`, `line-height: 1.2`, `tabular-nums`): Catalog stamps (`CAT. FR-DP-909`), spectral classes (`O-SUPERGIANT`), and song durations.

### Named Rules
**The Heading-Leads Rule.** Never place an eyebrow or kicker label above an `<h1>`, `<h2>`, or `<h3>`. The heading leads directly; catalog codes, affinity percentages, and spectral badges sit immediately below the heading.

**The Tabular Telemetry Rule.** All numeric readouts (FPS, draw calls, parsec distance, affinity percentages, and track durations) must render with `font-variant-numeric: tabular-nums` so columns remain rock-steady during animation.

## Layout

The interface uses a single-viewport spatial canvas (`100vw × 100dvh`, `overflow: hidden`) with a four-edge perimeter HUD grid (`p-4 md:p-6`, `z-20`):
- **Top Bar (`<header>`)**: Brand masthead, accessible `<search>` combobox (`w-full md:w-88 lg:w-96`), and live WebGL/camera telemetry counters.
- **Left Dock (`<nav>`, `w-full md:w-72`)**: Constellation sector buttons and continuous + preset affinity threshold controls.
- **Right Dock (`<aside>`, `w-full md:w-96`, `max-h-[calc(100dvh-9.5rem)]`)**: Collapsible archival record-sleeve placard leaving the central 65%+ of the 3D viewport unobstructed.
- **Bottom Dock (`<footer>`)**: Logarithmic scale formula readout, Data Source synchronizer dialog trigger, Web Audio FFT master toggle, `UnrealBloomPass` toggle, and neighbor-constellation flight button.

## Elevation & Depth

Depth is achieved through high-contrast translucent obsidian surfaces (`#050508/90` to `#0A0C14/95`) framed by `1px` hairline cyan/magenta borders (`rgba(0, 245, 212, 0.25)` and `rgba(255, 42, 133, 0.55)`) over the glowing 3D `UnrealBloomPass` canvas.

### Shadow Vocabulary
- **Sleeve Elevation** (`box-shadow: 0 16px 42px rgba(5, 5, 8, 0.9)`): Separates the right-hand archival artist sleeve card from bright 3D coronas passing behind it.
- **ComboboxPopover Elevation** (`box-shadow: 0 18px 40px rgba(5, 5, 8, 0.92)`): Anchors the floating stellar search results listbox above the 3D scene.

### Named Rules
**The 1px Hairline Frame Rule.** HUD panels are delineated by crisp `1px` translucent cyan or magenta borders—never thick colored `border-left` stripes or heavy multi-layered drop shadows.

## Shapes

All 2D HUD instruments use crisp technical corners (`4px` / `rounded`) that contrast intentionally with the spherical 3D star cores, equatorial diffraction rings, and circular vinyl record-sleeve artwork motifs (`aspect-square`).

## Components

### Buttons
- **Shape:** Crisp technical rectangle (`4px` radius), minimum `36px` (`min-h-9`) height for primary interactive controls and `≥28px` (`min-h-7`) for compact tags.
- **Primary (`button-primary`):** Solid Bioluminescent Cyan (`#00F5D4`) background with Void Carbon (`#050508`) bold text (`padding: 6px 14px`); transitions to Acid Lime (`#CCFF00`) on hover.
- **Sector Navigation (`button-sector`):** Void Carbon (`#050508`) fill with `1px` `#00F5D4/20` border; shifts `+4px` (`translate-x-1`) with an Acid Lime (`#CCFF00`) border and `#131826` fill when active.

### Cards / Containers
- **Corner Style:** `4px` radius (`rounded`).
- **Background:** `#0A0C14/95` for the right-hand `ArtistSleeveCard` and `#090B12/90` for left navigation docks.
- **Border:** `1px solid rgba(255, 42, 133, 0.55)` on the artist sleeve card; `1px solid rgba(0, 245, 212, 0.20)` on telemetry docks.
- **Internal Padding:** `14px–16px` (`p-3.5` to `p-4`).

### Inputs / Fields
- **Style:** Semantic `<search>` landmark containing an `<input type="search" role="combobox">` with `#090B12` fill, `1px solid rgba(0, 245, 212, 0.35)` border, and `/ · ⌘K` keyboard shortcut hint.
- **Focus:** `2px solid #00F5D4` focus-visible outline (`outline-offset: 2px`) and `#050508` background.

### Archival Record-Sleeve Placard (`ArtistSleeveCard`)
- **Structure:** `Syne` 800 heading at top, followed by post-heading badges (`AFINIDAD %`, `CAT. CODE`, spectral class, song count), a square `aspect-square` generative SVG studio portrait (`ArchivalStudioPortrait`), origin + biography, 3-column logarithmic star metrics (`RADIO NÚCLEO`, `HALO CORONA`, `BRILLO EMISIVO`), Side-A tracklist (`<ol role="list">`), 16-bar Web Audio FFT spectrum analyzer, and cross-genre bridge pills.

## Do's and Don'ts

### Do:
- **Do** scale every 3D star's radius logarithmically from song count (`ln(1 + songCount)`) and non-linearly from user affinity (`affinity^1.5`).
- **Do** keep HUD panels docked to the viewport perimeter with `pointer-events-none` on wrapper containers so the central 3D cosmos remains directly draggable and clickable.
- **Do** provide full keyboard navigation (`/` or `⌘K` search focus, `ArrowUp`/`ArrowDown` combobox traversal, `Enter` camera flight, `Escape` dismissal) and `prefers-reduced-motion` support.
- **Do** dispose Web Audio nodes (`stop()`, `disconnect()`) and `UnrealBloomPass` render targets on track changes and component teardown.

### Don't:
- **Don't** place kickers or eyebrows above `<h1>`, `<h2>`, or `<h3>` headings; place metadata badges below the heading.
- **Don't** use decorative section numbers (`01 //`, `02 //`), thick colored `border-left` bars (`> 1px`), or unicode characters (`★`, `●`, `↔`) as substitutes for proper Lucide SVG icons.
- **Don't** use Three.js `<Html distanceFactor={...}>` on 3D star labels, which causes giant perspective text scaling that collides with the 2D HUD.
