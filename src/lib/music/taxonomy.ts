/**
 * Universal 2-Level Musical Taxonomy & Tag Normalization System (`taxonomy.ts`).
 *
 * Implements a structured 2-level hierarchy:
 * - Level 1 (Macro-Cluster): 12 fixed celestial constellations with distinct neon palettes and centers.
 * - Level 2 (Normalized Subgenre): Canonical grouping of raw listener tags (Last.fm, Discogs, Spotify, MusicBrainz).
 */

export type MacroGenreId =
  | 'ROCK'
  | 'ELECTRONIC'
  | 'SYNTHWAVE'
  | 'INDIE_ALT'
  | 'HIPHOP_URBANO'
  | 'POP'
  | 'METAL'
  | 'PUNK_EMO'
  | 'JAZZ_SOUL'
  | 'LATINO_TROPICAL'
  | 'ACOUSTIC_FOLK'
  | 'J_MUSIC';

export interface MacroGenreInfo {
  id: MacroGenreId;
  name: string;
  shortName: string;
  color: string;
  bg: string;
  center: [number, number, number];
  sister: MacroGenreId;
  description: string;
}

export const MACRO_GENRES: Record<MacroGenreId, MacroGenreInfo> = {
  ROCK: {
    id: 'ROCK',
    name: 'ROCK CLÁSICO & PSICODELIA',
    shortName: 'Rock',
    color: '#F43F5E', // Crimson Supernova
    bg: '#260B14',
    center: [-26, 6, -18],
    sister: 'INDIE_ALT',
    description: 'Riffs de guitarra, baterías acústicas, blues-rock y experimentación lisérgica.',
  },
  ELECTRONIC: {
    id: 'ELECTRONIC',
    name: 'ELECTRÓNICA, HOUSE & TECHNO',
    shortName: 'Electrónica',
    color: '#00F5D4', // Turquoise Club Pulse
    bg: '#081D1A',
    center: [24, -6, -16],
    sister: 'SYNTHWAVE',
    description: 'Bombos 4/4, sintetizadores modulares, drum & bass y cultura de club nocturno.',
  },
  SYNTHWAVE: {
    id: 'SYNTHWAVE',
    name: 'SYNTHWAVE & RETROFUTURISMO',
    shortName: 'Synthwave',
    color: '#FF2A85', // Cosmic Magenta
    bg: '#200C1D',
    center: [22, 14, -24],
    sister: 'ELECTRONIC',
    description: 'Pulsos analógicos, vocoders, arpegios espaciales y French touch ochentero.',
  },
  INDIE_ALT: {
    id: 'INDIE_ALT',
    name: 'INDIE, POST-PUNK & SHOEGAZE',
    shortName: 'Indie / Alt',
    color: '#38BDF8', // Sapphire Ice
    bg: '#0B1A2C',
    center: [-16, 18, 14],
    sister: 'ROCK',
    description: 'Muros de guitarras con reverb, dream pop, math rock y melodías atmosféricas.',
  },
  HIPHOP_URBANO: {
    id: 'HIPHOP_URBANO',
    name: 'HIP-HOP, RAP & BOOM BAP',
    shortName: 'Hip-Hop',
    color: '#F59E0B', // Amber Solar
    bg: '#261708',
    center: [-28, -7, 12],
    sister: 'LATINO_TROPICAL',
    description: 'Sub-bajos 808, beats sincopados de vinilo, líricas afiladas y flow rítmico.',
  },
  POP: {
    id: 'POP',
    name: 'POP INTERNACIONAL & SYNTH-POP',
    shortName: 'Pop',
    color: '#EC4899', // Nebula Pink
    bg: '#260B1C',
    center: [28, 8, 8],
    sister: 'JAZZ_SOUL',
    description: 'Ganchos memorables, producción pulida, electropop y ganchos vocales globales.',
  },
  METAL: {
    id: 'METAL',
    name: 'HEAVY METAL & EXTREME',
    shortName: 'Metal',
    color: '#E11D48', // Ruby Core
    bg: '#23080F',
    center: [16, -18, 16],
    sister: 'PUNK_EMO',
    description: 'Distorsión saturada, doble bombo, riffs técnicos y contundencia sonora.',
  },
  PUNK_EMO: {
    id: 'PUNK_EMO',
    name: 'PUNK, EMO & HARDCORE',
    shortName: 'Punk / Emo',
    color: '#FB7185', // Coral Flame
    bg: '#270E15',
    center: [-12, -22, -10],
    sister: 'METAL',
    description: 'Urgencia visceral, potencia de tres acordes, distorsión cruda y catarsis lírica.',
  },
  JAZZ_SOUL: {
    id: 'JAZZ_SOUL',
    name: 'JAZZ, SOUL, FUNK & R&B',
    shortName: 'Jazz / Soul',
    color: '#EAB308', // Stellar Gold
    bg: '#231C06',
    center: [30, -5, -22],
    sister: 'POP',
    description: 'Grooves sincopados, vientos de terciopelo, swing virtuoso e improvisación cálida.',
  },
  LATINO_TROPICAL: {
    id: 'LATINO_TROPICAL',
    name: 'ROCK NACIONAL, LATINO & TROPICAL',
    shortName: 'Latino / Tropical',
    color: '#22C55E', // Tropical Neon
    bg: '#06200F',
    center: [-14, -14, 22],
    sister: 'HIPHOP_URBANO',
    description: 'Identidad rioplatense, poesía urbana, cumbia, tango y calidez latinoamericana.',
  },
  ACOUSTIC_FOLK: {
    id: 'ACOUSTIC_FOLK',
    name: 'ACÚSTICO, FOLK & AMBIENT',
    shortName: 'Folk / Ambient',
    color: '#2DD4BF', // Cosmic Mint
    bg: '#061F1B',
    center: [0, -20, -22],
    sister: 'INDIE_ALT',
    description: 'Guitarras de madera, pianos íntimos, texturas drone granulares y serenidad orgánica.',
  },
  J_MUSIC: {
    id: 'J_MUSIC',
    name: 'J-POP, J-ROCK & ANIME',
    shortName: 'J-Music / Anime',
    color: '#FF3399', // Sakura Cyber-Neon
    bg: '#26071B',
    center: [14, 18, 22],
    sister: 'SYNTHWAVE',
    description: 'Rock nipón, aperturas de anime, city pop, vocaloid y virtuosismo melódico japonés.',
  },
};

export interface NormalizedSubgenre {
  macro: MacroGenreId;
  subgenre: string;
}

/**
 * Normalized 2-Level Dictionary mapping synonyms, Discogs styles, and Last.fm tags
 * directly into their canonical Level-2 subgenre and Level-1 Macro constellation.
 */
const SUBGENRE_TAXONOMY_DICTIONARY: Record<string, NormalizedSubgenre> = {
  // Indie, Post-Punk & Shoegaze
  'shoegaze': { macro: 'INDIE_ALT', subgenre: 'Shoegaze' },
  'dream pop': { macro: 'INDIE_ALT', subgenre: 'Dream Pop' },
  'dreampop': { macro: 'INDIE_ALT', subgenre: 'Dream Pop' },
  'nu gaze': { macro: 'INDIE_ALT', subgenre: 'Shoegaze' },
  'ethereal wave': { macro: 'INDIE_ALT', subgenre: 'Dream Pop' },
  'post-punk': { macro: 'INDIE_ALT', subgenre: 'Post-Punk' },
  'post punk': { macro: 'INDIE_ALT', subgenre: 'Post-Punk' },
  'indie rock': { macro: 'INDIE_ALT', subgenre: 'Indie Rock' },
  'indie pop': { macro: 'INDIE_ALT', subgenre: 'Indie Pop' },
  'indie': { macro: 'INDIE_ALT', subgenre: 'Indie Rock' },
  'math rock': { macro: 'INDIE_ALT', subgenre: 'Math Rock' },
  'post-rock': { macro: 'INDIE_ALT', subgenre: 'Post-Rock' },
  'post rock': { macro: 'INDIE_ALT', subgenre: 'Post-Rock' },
  'art rock': { macro: 'INDIE_ALT', subgenre: 'Art Rock' },
  'chamber pop': { macro: 'INDIE_ALT', subgenre: 'Chamber Pop' },
  'noise pop': { macro: 'INDIE_ALT', subgenre: 'Shoegaze' },
  'space rock': { macro: 'INDIE_ALT', subgenre: 'Art Rock' },
  'argentine indie': { macro: 'INDIE_ALT', subgenre: 'Indie Rock' },
  'indie platense': { macro: 'INDIE_ALT', subgenre: 'Indie Rock' },
  'indie argentino': { macro: 'INDIE_ALT', subgenre: 'Indie Rock' },

  // Synthwave & Retrofuturism
  'synthwave': { macro: 'SYNTHWAVE', subgenre: 'Synthwave' },
  'retrowave': { macro: 'SYNTHWAVE', subgenre: 'Synthwave' },
  'outrun': { macro: 'SYNTHWAVE', subgenre: 'Synthwave' },
  'darksynth': { macro: 'SYNTHWAVE', subgenre: 'Darksynth' },
  'french touch': { macro: 'SYNTHWAVE', subgenre: 'French Touch' },
  'filter house': { macro: 'SYNTHWAVE', subgenre: 'French Touch' },
  'darkwave': { macro: 'SYNTHWAVE', subgenre: 'Darkwave' },
  'coldwave': { macro: 'SYNTHWAVE', subgenre: 'Darkwave' },
  'ebm': { macro: 'SYNTHWAVE', subgenre: 'Industrial & EBM' },
  'industrial': { macro: 'SYNTHWAVE', subgenre: 'Industrial & EBM' },
  'vaporwave': { macro: 'SYNTHWAVE', subgenre: 'Vaporwave' },
  'chillwave': { macro: 'SYNTHWAVE', subgenre: 'Synthwave' },

  // Electronic, House & Techno
  'house': { macro: 'ELECTRONIC', subgenre: 'House' },
  'deep house': { macro: 'ELECTRONIC', subgenre: 'Deep House' },
  'tech house': { macro: 'ELECTRONIC', subgenre: 'Tech House' },
  'progressive house': { macro: 'ELECTRONIC', subgenre: 'Progressive House' },
  'electro house': { macro: 'ELECTRONIC', subgenre: 'Electro House' },
  'techno': { macro: 'ELECTRONIC', subgenre: 'Techno' },
  'minimal techno': { macro: 'ELECTRONIC', subgenre: 'Minimal Techno' },
  'melodic techno': { macro: 'ELECTRONIC', subgenre: 'Techno' },
  'acid techno': { macro: 'ELECTRONIC', subgenre: 'Acid Techno' },
  'trance': { macro: 'ELECTRONIC', subgenre: 'Trance' },
  'psytrance': { macro: 'ELECTRONIC', subgenre: 'Trance' },
  'drum and bass': { macro: 'ELECTRONIC', subgenre: 'Drum & Bass' },
  'drum & bass': { macro: 'ELECTRONIC', subgenre: 'Drum & Bass' },
  'dnb': { macro: 'ELECTRONIC', subgenre: 'Drum & Bass' },
  'liquid dnb': { macro: 'ELECTRONIC', subgenre: 'Drum & Bass' },
  'jungle': { macro: 'ELECTRONIC', subgenre: 'Jungle & Breakbeat' },
  'breakbeat': { macro: 'ELECTRONIC', subgenre: 'Jungle & Breakbeat' },
  'breakcore': { macro: 'ELECTRONIC', subgenre: 'Breakcore' },
  'dubstep': { macro: 'ELECTRONIC', subgenre: 'Dubstep & Bass' },
  'future bass': { macro: 'ELECTRONIC', subgenre: 'Dubstep & Bass' },
  'uk garage': { macro: 'ELECTRONIC', subgenre: 'UK Garage' },
  'garage': { macro: 'ELECTRONIC', subgenre: 'UK Garage' },
  'electronic': { macro: 'ELECTRONIC', subgenre: 'Electrónica' },
  'electronica': { macro: 'ELECTRONIC', subgenre: 'Electrónica' },
  'edm': { macro: 'ELECTRONIC', subgenre: 'Electrónica' },

  // Acoustic, Folk & Ambient
  'acoustic': { macro: 'ACOUSTIC_FOLK', subgenre: 'Acústico' },
  'acoustic rock': { macro: 'ACOUSTIC_FOLK', subgenre: 'Acústico' },
  'unplugged': { macro: 'ACOUSTIC_FOLK', subgenre: 'Acústico' },
  'singer-songwriter': { macro: 'ACOUSTIC_FOLK', subgenre: 'Cantautor & Folk' },
  'folk': { macro: 'ACOUSTIC_FOLK', subgenre: 'Folk' },
  'indie folk': { macro: 'ACOUSTIC_FOLK', subgenre: 'Folk' },
  'ambient': { macro: 'ACOUSTIC_FOLK', subgenre: 'Ambient' },
  'dark ambient': { macro: 'ACOUSTIC_FOLK', subgenre: 'Ambient' },
  'drone': { macro: 'ACOUSTIC_FOLK', subgenre: 'Drone' },
  'idm': { macro: 'ACOUSTIC_FOLK', subgenre: 'IDM & Glitch' },
  'glitch': { macro: 'ACOUSTIC_FOLK', subgenre: 'IDM & Glitch' },
  'trip hop': { macro: 'ACOUSTIC_FOLK', subgenre: 'Trip-Hop & Downtempo' },
  'trip-hop': { macro: 'ACOUSTIC_FOLK', subgenre: 'Trip-Hop & Downtempo' },
  'downtempo': { macro: 'ACOUSTIC_FOLK', subgenre: 'Trip-Hop & Downtempo' },
  'lo-fi': { macro: 'ACOUSTIC_FOLK', subgenre: 'Lo-Fi' },
  'lofi': { macro: 'ACOUSTIC_FOLK', subgenre: 'Lo-Fi' },
  'classical': { macro: 'ACOUSTIC_FOLK', subgenre: 'Música Clásica' },
  'modern classical': { macro: 'ACOUSTIC_FOLK', subgenre: 'Neoclásico' },
  'neo-classical': { macro: 'ACOUSTIC_FOLK', subgenre: 'Neoclásico' },
  'soundtrack': { macro: 'ACOUSTIC_FOLK', subgenre: 'Banda Sonora' },
  'ost': { macro: 'ACOUSTIC_FOLK', subgenre: 'Banda Sonora' },
  'score': { macro: 'ACOUSTIC_FOLK', subgenre: 'Banda Sonora' },

  // Rock Clásico & Psicodelia
  'classic rock': { macro: 'ROCK', subgenre: 'Classic Rock' },
  'hard rock': { macro: 'ROCK', subgenre: 'Hard Rock' },
  'psychedelic rock': { macro: 'ROCK', subgenre: 'Psicodelia' },
  'psychedelic': { macro: 'ROCK', subgenre: 'Psicodelia' },
  'progressive rock': { macro: 'ROCK', subgenre: 'Prog Rock' },
  'prog rock': { macro: 'ROCK', subgenre: 'Prog Rock' },
  'blues rock': { macro: 'ROCK', subgenre: 'Blues Rock' },
  'garage rock': { macro: 'ROCK', subgenre: 'Garage Rock' },
  'krautrock': { macro: 'ROCK', subgenre: 'Krautrock' },
  'rock & roll': { macro: 'ROCK', subgenre: 'Rock & Roll' },
  'rock': { macro: 'ROCK', subgenre: 'Rock' },

  // Heavy Metal & Extreme
  'metal': { macro: 'METAL', subgenre: 'Heavy Metal' },
  'heavy metal': { macro: 'METAL', subgenre: 'Heavy Metal' },
  'thrash metal': { macro: 'METAL', subgenre: 'Thrash Metal' },
  'death metal': { macro: 'METAL', subgenre: 'Death Metal' },
  'black metal': { macro: 'METAL', subgenre: 'Black Metal' },
  'doom metal': { macro: 'METAL', subgenre: 'Doom Metal' },
  'sludge metal': { macro: 'METAL', subgenre: 'Sludge & Stoner' },
  'stoner rock': { macro: 'METAL', subgenre: 'Sludge & Stoner' },
  'nu metal': { macro: 'METAL', subgenre: 'Nu Metal' },
  'groove metal': { macro: 'METAL', subgenre: 'Groove Metal' },
  'power metal': { macro: 'METAL', subgenre: 'Power Metal' },
  'symphonic metal': { macro: 'METAL', subgenre: 'Symphonic Metal' },
  'progressive metal': { macro: 'METAL', subgenre: 'Prog Metal' },

  // Punk, Emo & Hardcore
  'punk': { macro: 'PUNK_EMO', subgenre: 'Punk' },
  'punk rock': { macro: 'PUNK_EMO', subgenre: 'Punk' },
  'pop punk': { macro: 'PUNK_EMO', subgenre: 'Pop Punk' },
  'skate punk': { macro: 'PUNK_EMO', subgenre: 'Pop Punk' },
  'emo': { macro: 'PUNK_EMO', subgenre: 'Emo' },
  'midwest emo': { macro: 'PUNK_EMO', subgenre: 'Midwest Emo' },
  'screamo': { macro: 'PUNK_EMO', subgenre: 'Screamo & Post-Hardcore' },
  'hardcore': { macro: 'PUNK_EMO', subgenre: 'Hardcore' },
  'post-hardcore': { macro: 'PUNK_EMO', subgenre: 'Screamo & Post-Hardcore' },
  'metalcore': { macro: 'PUNK_EMO', subgenre: 'Metalcore' },
  'deathcore': { macro: 'PUNK_EMO', subgenre: 'Metalcore' },
  'grunge': { macro: 'PUNK_EMO', subgenre: 'Grunge' },

  // Hip-Hop, Rap & Boom Bap
  'hip hop': { macro: 'HIPHOP_URBANO', subgenre: 'Hip-Hop' },
  'hip-hop': { macro: 'HIPHOP_URBANO', subgenre: 'Hip-Hop' },
  'rap': { macro: 'HIPHOP_URBANO', subgenre: 'Hip-Hop' },
  'boom bap': { macro: 'HIPHOP_URBANO', subgenre: 'Boom Bap' },
  'trap': { macro: 'HIPHOP_URBANO', subgenre: 'Trap' },
  'drill': { macro: 'HIPHOP_URBANO', subgenre: 'Drill' },
  'gangsta rap': { macro: 'HIPHOP_URBANO', subgenre: 'Hip-Hop' },
  'conscious hip hop': { macro: 'HIPHOP_URBANO', subgenre: 'Conscious Hip-Hop' },
  'underground hip hop': { macro: 'HIPHOP_URBANO', subgenre: 'Underground Hip-Hop' },

  // Pop Internacional & Synth-Pop
  'pop': { macro: 'POP', subgenre: 'Pop' },
  'synth-pop': { macro: 'POP', subgenre: 'Synth-Pop' },
  'synthpop': { macro: 'POP', subgenre: 'Synth-Pop' },
  'electropop': { macro: 'POP', subgenre: 'Electropop' },
  'dance pop': { macro: 'POP', subgenre: 'Dance Pop' },
  'hyperpop': { macro: 'POP', subgenre: 'Hyperpop' },
  'k-pop': { macro: 'POP', subgenre: 'K-Pop' },
  'kpop': { macro: 'POP', subgenre: 'K-Pop' },
  'korean': { macro: 'POP', subgenre: 'K-Pop' },

  // Jazz, Soul, Funk & R&B
  'jazz': { macro: 'JAZZ_SOUL', subgenre: 'Jazz' },
  'bossa nova': { macro: 'JAZZ_SOUL', subgenre: 'Bossa Nova' },
  'soul': { macro: 'JAZZ_SOUL', subgenre: 'Soul' },
  'neo-soul': { macro: 'JAZZ_SOUL', subgenre: 'Neo-Soul' },
  'neo soul': { macro: 'JAZZ_SOUL', subgenre: 'Neo-Soul' },
  'funk': { macro: 'JAZZ_SOUL', subgenre: 'Funk' },
  'r&b': { macro: 'JAZZ_SOUL', subgenre: 'R&B' },
  'rnb': { macro: 'JAZZ_SOUL', subgenre: 'R&B' },
  'disco': { macro: 'JAZZ_SOUL', subgenre: 'Disco' },
  'blues': { macro: 'JAZZ_SOUL', subgenre: 'Blues' },
  'motown': { macro: 'JAZZ_SOUL', subgenre: 'Soul' },

  // Rock Nacional, Latino & Tropical
  'rock nacional': { macro: 'LATINO_TROPICAL', subgenre: 'Rock Nacional' },
  'rock argentino': { macro: 'LATINO_TROPICAL', subgenre: 'Rock Nacional' },
  'rock en espanol': { macro: 'LATINO_TROPICAL', subgenre: 'Rock Latino' },
  'rock uruguayo': { macro: 'LATINO_TROPICAL', subgenre: 'Rock Rioplatense' },
  'latin rock': { macro: 'LATINO_TROPICAL', subgenre: 'Rock Latino' },
  'cumbia': { macro: 'LATINO_TROPICAL', subgenre: 'Cumbia' },
  'cumbia villera': { macro: 'LATINO_TROPICAL', subgenre: 'Cumbia' },
  'cuarteto': { macro: 'LATINO_TROPICAL', subgenre: 'Cuarteto' },
  'reggaeton': { macro: 'LATINO_TROPICAL', subgenre: 'Reggaetón' },
  'tropical': { macro: 'LATINO_TROPICAL', subgenre: 'Tropical' },
  'salsa': { macro: 'LATINO_TROPICAL', subgenre: 'Salsa & Bachata' },
  'bachata': { macro: 'LATINO_TROPICAL', subgenre: 'Salsa & Bachata' },
  'tango': { macro: 'LATINO_TROPICAL', subgenre: 'Tango' },
  'folklore': { macro: 'LATINO_TROPICAL', subgenre: 'Folklore Argentino' },
  'latin alternative': { macro: 'LATINO_TROPICAL', subgenre: 'Rock Latino' },
  'pop latino': { macro: 'LATINO_TROPICAL', subgenre: 'Pop Latino' },
  'balada': { macro: 'LATINO_TROPICAL', subgenre: 'Pop Latino' },

  // J-Pop, J-Rock & Anime
  'j-pop': { macro: 'J_MUSIC', subgenre: 'J-Pop' },
  'jpop': { macro: 'J_MUSIC', subgenre: 'J-Pop' },
  'j-rock': { macro: 'J_MUSIC', subgenre: 'J-Rock' },
  'jrock': { macro: 'J_MUSIC', subgenre: 'J-Rock' },
  'j-metal': { macro: 'J_MUSIC', subgenre: 'J-Metal' },
  'anime': { macro: 'J_MUSIC', subgenre: 'Anime OST' },
  'anisong': { macro: 'J_MUSIC', subgenre: 'Anime OST' },
  'city pop': { macro: 'J_MUSIC', subgenre: 'City Pop' },
  'citypop': { macro: 'J_MUSIC', subgenre: 'City Pop' },
  'shibuya-kei': { macro: 'J_MUSIC', subgenre: 'City Pop' },
  'vocaloid': { macro: 'J_MUSIC', subgenre: 'Vocaloid' },
  'utaite': { macro: 'J_MUSIC', subgenre: 'Vocaloid & Utaite' },
  'visual kei': { macro: 'J_MUSIC', subgenre: 'Visual Kei' },
  'japanese': { macro: 'J_MUSIC', subgenre: 'J-Music' },
  'doujin': { macro: 'J_MUSIC', subgenre: 'Doujin & Touhou' },
  'touhou': { macro: 'J_MUSIC', subgenre: 'Doujin & Touhou' },
};

/**
 * Normalizes an arbitrary incoming tag into its 2-Level representation.
 */
/** Exact synonym lookup in the subgenre dictionary (no substring heuristics); key must be lowercase. */
export function lookupSubgenreSynonym(cleanTag: string): NormalizedSubgenre | null {
  return SUBGENRE_TAXONOMY_DICTIONARY[cleanTag] ?? null;
}

export function normalizeMusicalTag(rawTag: string): NormalizedSubgenre | null {
  if (!rawTag) return null;
  const clean = rawTag
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Direct dictionary match
  if (SUBGENRE_TAXONOMY_DICTIONARY[clean]) {
    return SUBGENRE_TAXONOMY_DICTIONARY[clean];
  }

  // 2. Exact match with original hyphens
  const withHyphen = rawTag.toLowerCase().trim();
  if (SUBGENRE_TAXONOMY_DICTIONARY[withHyphen]) {
    return SUBGENRE_TAXONOMY_DICTIONARY[withHyphen];
  }

  // 3. Substring keyword heuristics for combined tags
  if (clean.includes('shoegaze') || clean.includes('dream pop')) {
    return { macro: 'INDIE_ALT', subgenre: 'Shoegaze & Dream Pop' };
  }
  if (clean.includes('post rock') || clean.includes('math rock')) {
    return { macro: 'INDIE_ALT', subgenre: 'Math Rock & Post-Rock' };
  }
  if (clean.includes('acoustic') || clean.includes('unplugged')) {
    return { macro: 'ACOUSTIC_FOLK', subgenre: 'Acústico' };
  }
  if (clean.includes('synthwave') || clean.includes('retrowave') || clean.includes('darkwave')) {
    return { macro: 'SYNTHWAVE', subgenre: 'Synthwave' };
  }
  if (clean.includes('french touch')) {
    return { macro: 'SYNTHWAVE', subgenre: 'French Touch' };
  }
  if (clean.includes('dnb') || clean.includes('drum and bass') || clean.includes('drum & bass')) {
    return { macro: 'ELECTRONIC', subgenre: 'Drum & Bass' };
  }
  if (clean.includes('house') || clean.includes('techno') || clean.includes('club')) {
    return { macro: 'ELECTRONIC', subgenre: 'House & Techno' };
  }
  if (clean.includes('ambient') || clean.includes('idm') || clean.includes('downtempo')) {
    return { macro: 'ACOUSTIC_FOLK', subgenre: 'Ambient & IDM' };
  }
  if (clean.includes('metal') || clean.includes('deathcore') || clean.includes('grindcore')) {
    return { macro: 'METAL', subgenre: 'Heavy Metal' };
  }
  if (clean.includes('punk') || clean.includes('emo') || clean.includes('hardcore') || clean.includes('grunge')) {
    return { macro: 'PUNK_EMO', subgenre: 'Punk & Emo' };
  }
  if (clean.includes('hip hop') || clean.includes('rap') || clean.includes('trap')) {
    return { macro: 'HIPHOP_URBANO', subgenre: 'Hip-Hop & Trap' };
  }
  if (clean.includes('soul') || clean.includes('funk') || clean.includes('jazz') || clean.includes('r&b') || clean.includes('rnb')) {
    return { macro: 'JAZZ_SOUL', subgenre: 'Soul & Jazz' };
  }
  if (clean.includes('rock nacional') || clean.includes('rock argentino') || clean.includes('argentino')) {
    return { macro: 'LATINO_TROPICAL', subgenre: 'Rock Nacional' };
  }
  if (clean.includes('cumbia') || clean.includes('cuarteto') || clean.includes('reggaeton') || clean.includes('salsa')) {
    return { macro: 'LATINO_TROPICAL', subgenre: 'Cumbia & Tropical' };
  }
  if (clean.includes('tango') || clean.includes('folklore')) {
    return { macro: 'LATINO_TROPICAL', subgenre: 'Tango & Folklore' };
  }
  if (clean.includes('japan') || clean.includes('anime') || clean.includes('j pop') || clean.includes('j rock') || clean.includes('vocaloid') || clean.includes('city pop')) {
    return { macro: 'J_MUSIC', subgenre: 'J-Music / Anime' };
  }
  if (clean.includes('k pop') || clean.includes('kpop') || clean.includes('korean')) {
    return { macro: 'POP', subgenre: 'K-Pop' };
  }
  if (clean.includes('indie') || clean.includes('alternative') || clean.includes('alt rock')) {
    return { macro: 'INDIE_ALT', subgenre: 'Indie Rock' };
  }
  if (clean.includes('rock') || clean.includes('psychedelic')) {
    return { macro: 'ROCK', subgenre: 'Classic Rock' };
  }
  if (clean.includes('pop')) {
    return { macro: 'POP', subgenre: 'Pop' };
  }

  return null;
}

/**
 * Resolves a track's definitive 2-level taxonomy given an array of weighted listener tags
 * (e.g. from Last.fm track.getTopTags) or artist metadata.
 */
export function resolveTrackTaxonomy(
  tags: Array<{ name: string; weight: number } | string>,
  artistName = '',
  trackTitle = ''
): {
  macroGenre: MacroGenreInfo;
  subgenre: string;
  normalizedTags: string[];
} {
  const normalizedScores = new Map<MacroGenreId, number>();
  const subgenreScores = new Map<string, { macro: MacroGenreId; score: number }>();
  const recognizedTags: string[] = [];

  const rawList: Array<{ name: string; weight: number }> = tags.map((t) =>
    typeof t === 'string' ? { name: t, weight: 60 } : t
  );

  for (const item of rawList) {
    const match = normalizeMusicalTag(item.name);
    if (match) {
      const weight = Math.max(10, Math.min(100, item.weight));
      normalizedScores.set(
        match.macro,
        (normalizedScores.get(match.macro) || 0) + weight
      );

      const existingSub = subgenreScores.get(match.subgenre);
      if (!existingSub || weight > existingSub.score) {
        subgenreScores.set(match.subgenre, { macro: match.macro, score: weight });
      }

      if (!recognizedTags.includes(match.subgenre)) {
        recognizedTags.push(match.subgenre);
      }
    }
  }

  // Find top macro-genre by weighted score
  let bestMacroId: MacroGenreId | null = null;
  let bestMacroScore = 0;
  for (const [mId, score] of normalizedScores.entries()) {
    if (score > bestMacroScore) {
      bestMacroScore = score;
      bestMacroId = mId;
    }
  }

  // If no listener tags matched, infer from artist or title heuristics
  if (!bestMacroId) {
    const combined = `${artistName} ${trackTitle}`.toLowerCase();
    const fallbackMatch = normalizeMusicalTag(combined);
    bestMacroId = fallbackMatch ? fallbackMatch.macro : 'INDIE_ALT';
  }

  // Find top subgenre matching the best macro-genre
  let bestSubgenre = '';
  let bestSubScore = 0;
  for (const [sub, info] of subgenreScores.entries()) {
    if (info.macro === bestMacroId && info.score > bestSubScore) {
      bestSubScore = info.score;
      bestSubgenre = sub;
    }
  }

  if (!bestSubgenre) {
    bestSubgenre = MACRO_GENRES[bestMacroId].shortName;
  }

  return {
    macroGenre: MACRO_GENRES[bestMacroId],
    subgenre: bestSubgenre,
    normalizedTags: recognizedTags.length > 0 ? recognizedTags : [bestSubgenre],
  };
}

export interface TfIdfEntity {
  id: string;
  name?: string;
  tags: string[];
}

export interface TfIdfEdge {
  source: string;
  target: string;
  similarity: number;
  sharedTags: string[];
}

/**
 * Computes stylistic similarity links using TF-IDF cosine similarity.
 *
 * Story 3 - TF-IDF Weighted Edges:
 * - Penalizes ubiquitous tags across the library (e.g. if 120 tracks share "rock",
 *   sharing "rock" alone is insufficient to link them).
 * - Strongly rewards specific, distinctive subgenres (e.g. "shoegaze", "french touch", "math rock").
 * - Returns top connections above threshold, capping links per node to avoid visual clutter.
 */
export function computeTfIdfLinks(
  entities: TfIdfEntity[],
  options: {
    minSimilarity?: number;
    maxLinksPerNode?: number;
  } = {}
): TfIdfEdge[] {
  const minSimilarity = options.minSimilarity ?? 0.30;
  const maxLinksPerNode = options.maxLinksPerNode ?? 2;
  const n = entities.length;
  if (n < 2) return [];

  // 1. Calculate Document Frequencies (DF) for each tag
  const dfMap = new Map<string, number>();
  const entityTagCounts = new Map<string, Map<string, number>>();

  for (const ent of entities) {
    const counts = new Map<string, number>();
    const seenInEntity = new Set<string>();

    for (const rawTag of ent.tags) {
      if (!rawTag) continue;
      const clean = rawTag.trim().toLowerCase();
      if (!clean || clean.length < 2) continue;
      counts.set(clean, (counts.get(clean) || 0) + 1);
      seenInEntity.add(clean);
    }

    for (const tag of seenInEntity) {
      dfMap.set(tag, (dfMap.get(tag) || 0) + 1);
    }
    entityTagCounts.set(ent.id, counts);
  }

  // 2. Compute smooth IDF: ln(1 + N / (1 + DF))
  const idfMap = new Map<string, number>();
  for (const [tag, df] of dfMap.entries()) {
    const idf = Math.log(1 + n / (1 + df));
    idfMap.set(tag, idf);
  }

  // 3. Build unit-normalized TF-IDF vector for each entity
  const normalizedVectors = new Map<string, Map<string, number>>();
  for (const ent of entities) {
    const counts = entityTagCounts.get(ent.id);
    if (!counts || counts.size === 0) continue;

    const weights = new Map<string, number>();
    let sumSq = 0;

    for (const [tag, count] of counts.entries()) {
      const idf = idfMap.get(tag) || 0;
      const tf = Math.sqrt(count); // Sublinear TF scaling
      const w = tf * idf;
      weights.set(tag, w);
      sumSq += w * w;
    }

    const norm = Math.sqrt(sumSq);
    if (norm > 0) {
      const unit = new Map<string, number>();
      for (const [tag, w] of weights.entries()) {
        unit.set(tag, w / norm);
      }
      normalizedVectors.set(ent.id, unit);
    }
  }

  // 4. Pairwise Cosine Similarity
  const candidatesPerNode = new Map<
    string,
    { targetId: string; similarity: number; sharedTags: string[] }[]
  >();

  const entityList = entities.filter((e) => normalizedVectors.has(e.id));

  for (let i = 0; i < entityList.length; i++) {
    const e1 = entityList[i];
    const v1 = normalizedVectors.get(e1.id)!;

    for (let j = i + 1; j < entityList.length; j++) {
      const e2 = entityList[j];
      const v2 = normalizedVectors.get(e2.id)!;

      let dotProduct = 0;
      const shared: { tag: string; idf: number }[] = [];

      for (const [tag, w1] of v1.entries()) {
        const w2 = v2.get(tag);
        if (w2 !== undefined) {
          dotProduct += w1 * w2;
          shared.push({ tag, idf: idfMap.get(tag) || 0 });
        }
      }

      if (dotProduct >= minSimilarity) {
        // Sort shared tags by IDF descending (most distinctive first)
        shared.sort((a, b) => b.idf - a.idf);
        const sharedTags = shared.map((s) => s.tag);

        if (!candidatesPerNode.has(e1.id)) candidatesPerNode.set(e1.id, []);
        if (!candidatesPerNode.has(e2.id)) candidatesPerNode.set(e2.id, []);

        candidatesPerNode.get(e1.id)!.push({
          targetId: e2.id,
          similarity: dotProduct,
          sharedTags,
        });
        candidatesPerNode.get(e2.id)!.push({
          targetId: e1.id,
          similarity: dotProduct,
          sharedTags,
        });
      }
    }
  }

  // 5. Select top links per node and deduplicate undirected edges
  const edgeSet = new Set<string>();
  const finalEdges: TfIdfEdge[] = [];

  for (const [sourceId, list] of candidatesPerNode.entries()) {
    list.sort((a, b) => b.similarity - a.similarity);
    const topPicks = list.slice(0, maxLinksPerNode);

    for (const pick of topPicks) {
      const [u, v] =
        sourceId < pick.targetId
          ? [sourceId, pick.targetId]
          : [pick.targetId, sourceId];
      const key = `${u}::${v}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        finalEdges.push({
          source: u,
          target: v,
          similarity: Number(pick.similarity.toFixed(3)),
          sharedTags: pick.sharedTags,
        });
      }
    }
  }

  return finalEdges;
}
