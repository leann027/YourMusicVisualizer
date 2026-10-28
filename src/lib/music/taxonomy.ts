/**
 * Subgenre dictionary (`taxonomy.ts`): maps raw tags to a display subgenre (e.g. "dreampop" →
 * "Dream Pop") for HUD labels. Genre clustering itself is dynamic (tagModel + dynamicGenres);
 * `macro` is kept only as a coarse family of each subgenre.
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
  'argentine rock': { macro: 'LATINO_TROPICAL', subgenre: 'Rock Nacional' }, // Spotify genre name
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
