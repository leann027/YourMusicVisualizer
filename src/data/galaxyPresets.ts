import { RawLibraryTrackInput, RawLibraryPayload, buildMusicGalaxyFromPayload } from '../lib/importers/libraryImporter';
import type { RawTag } from '../lib/music/tagModel';
import { MusicGalaxyData } from '../types/music';

// Artist definitions with metadata
export interface PresetArtistSeed {
  name: string;
  artistTags: RawTag[]; // curated Last.fm-style tags: the dynamic classifier decides the nebula (A3)
  origin: string;
  bio: string;
  tracks: {
    title: string;
    album: string;
    year: number;
    duration: number;
    affinity: number;
    trackTags?: RawTag[]; // tags of this song; two styles make it a bridge between nebulae
  }[];
}

export const ARTIST_DATABASE: PresetArtistSeed[] = [
  // 1. SYNTHWAVE & FRENCH TOUCH
  {
    name: 'Daft Punk',
    artistTags: [{ name: 'french touch', weight: 100 }, { name: 'house', weight: 60 }, { name: 'electronic', weight: 40 }],
    origin: 'París, Francia · 1993',
    bio: 'Arquitectos del French Touch: vocoders robóticos, sidechain analógico y sinfonías disco-funk espaciales.',
    tracks: [
      { title: 'Veridis Quo', album: 'Discovery', year: 2001, duration: 345, affinity: 0.99 },
      { title: 'Digital Love', album: 'Discovery', year: 2001, duration: 301, affinity: 0.98 },
      { title: 'Giorgio by Moroder', album: 'Random Access Memories', year: 2013, duration: 544, affinity: 0.97 },
      { title: 'Harder, Better, Faster, Stronger', album: 'Discovery', year: 2001, duration: 224, affinity: 0.96 },
      { title: 'Instant Crush', album: 'Random Access Memories', year: 2013, duration: 337, affinity: 0.95 },
      { title: 'Something About Us', album: 'Discovery', year: 2001, duration: 232, affinity: 0.94 },
    ],
  },
  {
    name: 'Kavinsky',
    artistTags: [{ name: 'synthwave', weight: 100 }, { name: 'french touch', weight: 70 }, { name: 'electronic', weight: 30 }],
    origin: 'París, Francia · 2006',
    bio: 'Pionero del outrun synthwave con sintetizadores analógicos oscuros y bajos cinematográficos.',
    tracks: [
      { title: 'Nightcall', album: 'OutRun', year: 2013, duration: 259, affinity: 0.98, trackTags: [{ name: 'synthwave', weight: 100 }, { name: 'synthpop', weight: 100 }] },
      { title: 'Pacific Coast Highway', album: 'OutRun', year: 2013, duration: 388, affinity: 0.94, trackTags: [{ name: 'synthwave', weight: 100 }, { name: 'synthpop', weight: 100 }] },
      { title: 'Roadgame', album: 'OutRun', year: 2013, duration: 224, affinity: 0.92 },
      { title: 'Protovision', album: 'OutRun', year: 2013, duration: 206, affinity: 0.91 },
      { title: 'Odd Look', album: 'OutRun', year: 2013, duration: 289, affinity: 0.90 },
    ],
  },
  {
    name: 'Justice',
    artistTags: [{ name: 'french touch', weight: 100 }, { name: 'electro', weight: 60 }, { name: 'electronic', weight: 40 }],
    origin: 'París, Francia · 2003',
    bio: 'Distorsión electro-house crujiente, compresores bombeantes y riffs de bajo monumentales.',
    tracks: [
      { title: 'Genesis', album: 'Cross (†)', year: 2007, duration: 234, affinity: 0.97 },
      { title: 'D.A.N.C.E.', album: 'Cross (†)', year: 2007, duration: 242, affinity: 0.95, trackTags: [{ name: 'french touch', weight: 100 }, { name: 'synthpop', weight: 100 }] },
      { title: 'Neverender', album: 'Hyperdrama', year: 2024, duration: 266, affinity: 0.93 },
      { title: 'Phantom Pt. II', album: 'Cross (†)', year: 2007, duration: 200, affinity: 0.91 },
    ],
  },
  {
    name: 'The Midnight',
    artistTags: [{ name: 'synthwave', weight: 100 }, { name: 'retrowave', weight: 60 }, { name: 'synthpop', weight: 30 }],
    origin: 'Los Ángeles, EE. UU. · 2014',
    bio: 'Nostalgia ochentera con solos de saxofón envolventes, sintetizadores exuberantes y melodías veraniegas.',
    tracks: [
      { title: 'Sunset', album: 'Endless Summer', year: 2016, duration: 326, affinity: 0.95 },
      { title: 'Vampires', album: 'Endless Summer', year: 2016, duration: 317, affinity: 0.93 },
      { title: 'Los Angeles', album: 'Days of Thunder', year: 2014, duration: 391, affinity: 0.91 },
      { title: 'Gloria', album: 'Kids', year: 2018, duration: 214, affinity: 0.89 },
    ],
  },
  {
    name: 'Gesaffelstein',
    artistTags: [{ name: 'french touch', weight: 80 }, { name: 'darksynth', weight: 60 }, { name: 'techno', weight: 50 }],
    origin: 'Lyon, Francia · 2008',
    bio: 'Tecno oscuro industrial, percusiones secas y atmósferas minimalistas monolíticas.',
    tracks: [
      { title: 'Opr', album: 'Aleph', year: 2013, duration: 238, affinity: 0.94 },
      { title: 'Pursuit', album: 'Aleph', year: 2013, duration: 247, affinity: 0.93, trackTags: [{ name: 'french touch', weight: 100 }, { name: 'synthpop', weight: 100 }] },
      { title: 'Hate or Glory', album: 'Aleph', year: 2013, duration: 288, affinity: 0.90 },
    ],
  },

  // 2. ART ROCK & SHOEGAZE
  {
    name: 'Radiohead',
    artistTags: [{ name: 'art rock', weight: 100 }, { name: 'alternative', weight: 60 }, { name: 'experimental', weight: 40 }],
    origin: 'Oxford, Reino Unido · 1985',
    bio: 'Vanguardistas del rock alternativo: polirritmias sutiles, texturas de ondas Martenot y letras existenciales.',
    tracks: [
      { title: 'Weird Fishes / Arpeggi', album: 'In Rainbows', year: 2007, duration: 318, affinity: 0.99, trackTags: [{ name: 'art rock', weight: 100 }, { name: 'post-rock', weight: 100 }] },
      { title: 'Reckoner', album: 'In Rainbows', year: 2007, duration: 290, affinity: 0.98, trackTags: [{ name: 'art rock', weight: 100 }, { name: 'post-rock', weight: 100 }] },
      { title: 'Everything In Its Right Place', album: 'Kid A', year: 2000, duration: 251, affinity: 0.97 },
      { title: 'Paranoid Android', album: 'OK Computer', year: 1997, duration: 383, affinity: 0.96 },
      { title: 'Nude', album: 'In Rainbows', year: 2007, duration: 255, affinity: 0.95 },
      { title: 'Idioteque', album: 'Kid A', year: 2000, duration: 309, affinity: 0.94 },
    ],
  },
  {
    name: 'Cocteau Twins',
    artistTags: [{ name: 'dream pop', weight: 100 }, { name: 'shoegaze', weight: 60 }, { name: 'ethereal', weight: 40 }],
    origin: 'Grangemouth, Escocia · 1979',
    bio: 'Arquetipo del dream-pop y ethereal wave: la voz sobrenatural de Elizabeth Fraser y guitarras celestiales con chorus.',
    tracks: [
      { title: 'Cherry-coloured Funk', album: 'Heaven or Las Vegas', year: 1990, duration: 192, affinity: 0.98 },
      { title: 'Heaven or Las Vegas', album: 'Heaven or Las Vegas', year: 1990, duration: 298, affinity: 0.96 },
      { title: 'Lorelei', album: 'Treasure', year: 1984, duration: 223, affinity: 0.93 },
      { title: 'Frou-frou Foxes in Midsummer Fires', album: 'Heaven or Las Vegas', year: 1990, duration: 338, affinity: 0.91 },
    ],
  },
  {
    name: 'Slowdive',
    artistTags: [{ name: 'shoegaze', weight: 100 }, { name: 'dream pop', weight: 70 }, { name: 'alternative', weight: 30 }],
    origin: 'Reading, Reino Unido · 1989',
    bio: 'Paredes de reverberación glacial, murmullos vocales entrelazados y atmósferas envolventes.',
    tracks: [
      { title: 'Alison', album: 'Souvlaki', year: 1993, duration: 231, affinity: 0.96 },
      { title: 'When the Sun Hits', album: 'Souvlaki', year: 1993, duration: 287, affinity: 0.95, trackTags: [{ name: 'shoegaze', weight: 100 }, { name: 'post-rock', weight: 100 }] },
      { title: 'Sugar for the Pill', album: 'Slowdive', year: 2017, duration: 271, affinity: 0.93 },
      { title: 'kisses', album: 'everything is alive', year: 2023, duration: 237, affinity: 0.90 },
    ],
  },
  {
    name: 'My Bloody Valentine',
    artistTags: [{ name: 'shoegaze', weight: 100 }, { name: 'noise pop', weight: 60 }, { name: 'art rock', weight: 30 }],
    origin: 'Dublín, Irlanda · 1983',
    bio: 'Técnica de glide guitar, microtonalidades ruidistas y belleza melódica sumergida bajo decibelios infinitos.',
    tracks: [
      { title: 'Soon', album: 'Loveless', year: 1991, duration: 418, affinity: 0.96 },
      { title: 'Only Shallow', album: 'Loveless', year: 1991, duration: 257, affinity: 0.94 },
      { title: 'When You Sleep', album: 'Loveless', year: 1991, duration: 251, affinity: 0.93 },
    ],
  },
  {
    name: 'The Cure',
    artistTags: [{ name: 'post-punk', weight: 100 }, { name: 'new wave', weight: 70 }, { name: 'art rock', weight: 50 }, { name: 'dream pop', weight: 30 }],
    origin: 'Crawley, Reino Unido · 1978',
    bio: 'Líricas de melancolía gótica, líneas de bajo pulsantes de Simon Gallup y texturas post-punk inmortales.',
    tracks: [
      { title: 'Pictures of You', album: 'Disintegration', year: 1989, duration: 448, affinity: 0.97 },
      { title: 'Fascination Street', album: 'Disintegration', year: 1989, duration: 316, affinity: 0.94 },
      { title: 'Lovesong', album: 'Disintegration', year: 1989, duration: 212, affinity: 0.92 },
    ],
  },

  // 3. TRIP-HOP & BRISTOL DUB
  {
    name: 'Massive Attack',
    artistTags: [{ name: 'trip-hop', weight: 100 }, { name: 'downtempo', weight: 60 }, { name: 'bristol', weight: 50 }],
    origin: 'Bristol, Reino Unido · 1988',
    bio: 'Pioneros del sonido Bristol: líneas de bajo sub-graves, ritmos hipnotizantes y atmósferas cinematográficas oscuras.',
    tracks: [
      { title: 'Teardrop', album: 'Mezzanine', year: 1998, duration: 330, affinity: 0.99, trackTags: [{ name: 'trip-hop', weight: 100 }, { name: 'neo-soul', weight: 100 }] },
      { title: 'Angel', album: 'Mezzanine', year: 1998, duration: 379, affinity: 0.98 },
      { title: 'Inertia Creeps', album: 'Mezzanine', year: 1998, duration: 356, affinity: 0.95 },
      { title: 'Unfinished Sympathy', album: 'Blue Lines', year: 1991, duration: 308, affinity: 0.96 },
      { title: 'Risingson', album: 'Mezzanine', year: 1998, duration: 298, affinity: 0.93 },
    ],
  },
  {
    name: 'Portishead',
    artistTags: [{ name: 'trip-hop', weight: 100 }, { name: 'downtempo', weight: 50 }, { name: 'bristol', weight: 40 }],
    origin: 'Bristol, Reino Unido · 1991',
    bio: 'Muestras de vinilos crujientes, órganos Rhodes melancólicos y la inconfundible voz noir de Beth Gibbons.',
    tracks: [
      { title: 'Glory Box', album: 'Dummy', year: 1994, duration: 306, affinity: 0.98, trackTags: [{ name: 'trip-hop', weight: 100 }, { name: 'neo-soul', weight: 100 }] },
      { title: 'Roads', album: 'Dummy', year: 1994, duration: 302, affinity: 0.97 },
      { title: 'Sour Times', album: 'Dummy', year: 1994, duration: 254, affinity: 0.94 },
      { title: 'The Rip', album: 'Third', year: 2008, duration: 269, affinity: 0.92 },
    ],
  },
  {
    name: 'DJ Shadow',
    artistTags: [{ name: 'trip-hop', weight: 100 }, { name: 'instrumental hip hop', weight: 70 }, { name: 'downtempo', weight: 40 }],
    origin: 'San José, California · 1989',
    bio: 'Muestreo instrumental pionero, collages sonoros de vinilo y percusiones hip-hop cinemáticas.',
    tracks: [
      { title: 'Midnight in a Perfect World', album: 'Endtroducing.....', year: 1996, duration: 300, affinity: 0.97, trackTags: [{ name: 'trip-hop', weight: 100 }, { name: 'idm', weight: 100 }] },
      { title: 'Building Steam with a Grain of Salt', album: 'Endtroducing.....', year: 1996, duration: 399, affinity: 0.94 },
      { title: 'Stem / Long Stem', album: 'Endtroducing.....', year: 1996, duration: 562, affinity: 0.91 },
    ],
  },
  {
    name: 'Tricky',
    artistTags: [{ name: 'trip-hop', weight: 100 }, { name: 'bristol', weight: 50 }, { name: 'downtempo', weight: 30 }],
    origin: 'Bristol, Reino Unido · 1993',
    bio: 'Murmullos claustrofóbicos, dub pesado, rimas elípticas y texturas industriales.',
    tracks: [
      { title: 'Black Steel', album: 'Maxinquaye', year: 1995, duration: 340, affinity: 0.93 },
      { title: 'Hell Is Round the Corner', album: 'Maxinquaye', year: 1995, duration: 226, affinity: 0.92 },
    ],
  },

  // 4. J-POP, J-ROCK & ANIME
  {
    name: 'YOASOBI',
    artistTags: [{ name: 'j-pop', weight: 100 }, { name: 'anime', weight: 70 }, { name: 'japanese', weight: 40 }],
    origin: 'Tokio, Japón · 2019',
    bio: 'Dúo vocal y de producción musical basado en narrativas literarias y melodías pop vertiginosas.',
    tracks: [
      { title: 'Yoru ni Kakeru (夜に駆ける)', album: 'THE BOOK', year: 2021, duration: 261, affinity: 0.99 },
      { title: 'Idol (アイドル)', album: 'THE BOOK 3', year: 2023, duration: 213, affinity: 0.98 },
      { title: 'Gunjou (群青)', album: 'THE BOOK', year: 2021, duration: 248, affinity: 0.97 },
      { title: 'Kaibutsu (怪物)', album: 'THE BOOK 2', year: 2021, duration: 205, affinity: 0.96 },
      { title: 'Shukufuku (祝福)', album: 'THE BOOK 3', year: 2023, duration: 194, affinity: 0.95 },
    ],
  },
  {
    name: 'RADWIMPS',
    artistTags: [{ name: 'j-rock', weight: 100 }, { name: 'j-pop', weight: 60 }, { name: 'anime', weight: 50 }],
    origin: 'Kanagawa, Japón · 2001',
    bio: 'Composiciones cinemáticas, arreglos orquestales emotivos y rock alternativo japonés.',
    tracks: [
      { title: 'Sparkle (スパークル)', album: 'Your Name. OST', year: 2016, duration: 537, affinity: 0.99 },
      { title: 'Zenzenzense (前前前世)', album: 'Your Name. OST', year: 2016, duration: 285, affinity: 0.97 },
      { title: 'Nandemonaiya (なんでもないや)', album: 'Your Name. OST', year: 2016, duration: 342, affinity: 0.96 },
      { title: 'Suzume (すずめ)', album: 'Suzume OST', year: 2022, duration: 238, affinity: 0.94 },
    ],
  },
  {
    name: 'King Gnu',
    artistTags: [{ name: 'j-rock', weight: 100 }, { name: 'j-pop', weight: 50 }, { name: 'japanese', weight: 40 }],
    origin: 'Tokio, Japón · 2013',
    bio: 'Fusión de jazz clásico, rock alternativo rítmico y ganchos pop explosivos del Tokio contemporáneo.',
    tracks: [
      { title: 'SPECIALZ', album: 'THE GREATEST UNKNOWN', year: 2023, duration: 238, affinity: 0.97 },
      { title: 'Hakujitsu (白日)', album: 'CEREMONY', year: 2020, duration: 275, affinity: 0.96 },
      { title: 'Ichizu (一途)', album: 'THE GREATEST UNKNOWN', year: 2023, duration: 191, affinity: 0.94 },
    ],
  },
  {
    name: 'Kenshi Yonezu',
    artistTags: [{ name: 'j-pop', weight: 100 }, { name: 'anime', weight: 60 }, { name: 'vocaloid', weight: 40 }],
    origin: 'Tokushima, Japón · 2009',
    bio: 'Genio compositor y letrista: arreglos vocales hipercreativos y melodías pop memorables.',
    tracks: [
      { title: 'Lemon', album: 'STRAY SHEEP', year: 2020, duration: 255, affinity: 0.98 },
      { title: 'KICK BACK', album: 'LOST CORNER', year: 2024, duration: 193, affinity: 0.96, trackTags: [{ name: 'j-pop', weight: 100 }, { name: 'future bass', weight: 100 }] },
      { title: 'Chikyuugi (地球儀)', album: 'LOST CORNER', year: 2024, duration: 274, affinity: 0.95 },
    ],
  },

  // 5. IDM & AMBIENT EXPERIMENTAL
  {
    name: 'Aphex Twin',
    artistTags: [{ name: 'idm', weight: 100 }, { name: 'ambient', weight: 50 }, { name: 'electronic', weight: 50 }],
    origin: 'Limerick / Cornwall · 1985',
    bio: 'Maestro de la síntesis microtonal, percusiones analógicas frenéticas y melodías melancólicas de piano.',
    tracks: [
      { title: 'Avril 14th', album: 'Drukqs', year: 2001, duration: 125, affinity: 0.99 },
      { title: 'Alberto Balsalm', album: '...I Care Because You Do', year: 1995, duration: 311, affinity: 0.98 },
      { title: 'Xtal', album: 'Selected Ambient Works 85-92', year: 1992, duration: 294, affinity: 0.97 },
      { title: 'Flim', album: 'Come to Daddy EP', year: 1997, duration: 224, affinity: 0.96 },
      { title: '#3 (Rhubarb)', album: 'Selected Ambient Works Volume II', year: 1994, duration: 463, affinity: 0.95 },
    ],
  },
  {
    name: 'Boards of Canada',
    artistTags: [{ name: 'idm', weight: 100 }, { name: 'ambient', weight: 80 }, { name: 'downtempo', weight: 30 }],
    origin: 'Edimburgo, Escocia · 1986',
    bio: 'Nostalgia en cinta magnética analógica degradada, sintetizadores cálidos de los 70 y samples infantiles hipnóticos.',
    tracks: [
      { title: 'Dayvan Cowboy', album: 'The Campfire Headphase', year: 2005, duration: 300, affinity: 0.98 },
      { title: 'Roygbiv', album: 'Music Has the Right to Children', year: 1998, duration: 151, affinity: 0.97 },
      { title: 'Olson', album: 'Music Has the Right to Children', year: 1998, duration: 91, affinity: 0.94 },
      { title: 'Music Is Math', album: 'Geogaddi', year: 2002, duration: 321, affinity: 0.93 },
    ],
  },
  {
    name: 'Burial',
    artistTags: [{ name: 'idm', weight: 70 }, { name: 'ambient', weight: 60 }, { name: 'future garage', weight: 100 }],
    origin: 'Londres, Reino Unido · 2005',
    bio: 'Future garage nocturno, vinilos con sonido a lluvia londinense, voces etéreas procesadas y sub-graves oscuros.',
    tracks: [
      { title: 'Archangel', album: 'Untrue', year: 2007, duration: 238, affinity: 0.99, trackTags: [{ name: 'idm', weight: 100 }, { name: 'trip-hop', weight: 100 }] },
      { title: 'Ghost Hardware', album: 'Untrue', year: 2007, duration: 293, affinity: 0.96 },
      { title: 'Near Dark', album: 'Untrue', year: 2007, duration: 234, affinity: 0.94 },
    ],
  },
  {
    name: 'Tycho',
    artistTags: [{ name: 'ambient', weight: 100 }, { name: 'chillwave', weight: 70 }, { name: 'idm', weight: 50 }],
    origin: 'San Francisco, California · 2001',
    bio: 'Paisajes sonoros de puesta de sol: sintetizadores analógicos luminosos, guitarras orgánicas y pulsos downtempo.',
    tracks: [
      { title: 'A Walk', album: 'Dive', year: 2011, duration: 316, affinity: 0.96, trackTags: [{ name: 'ambient', weight: 100 }, { name: 'post-rock', weight: 100 }] },
      { title: 'Awake', album: 'Awake', year: 2014, duration: 283, affinity: 0.95 },
      { title: 'Coastal Brake', album: 'Dive', year: 2011, duration: 334, affinity: 0.93 },
    ],
  },

  // 6. NEO-SOUL & DOWNTEMPO R&B
  {
    name: 'FKJ',
    artistTags: [{ name: 'neo-soul', weight: 100 }, { name: 'nu jazz', weight: 60 }, { name: 'downtempo', weight: 40 }],
    origin: 'Tours, Francia · 2012',
    bio: 'Multi-instrumentista virtuoso: loops en vivo de piano Rhodes, saxofón sensual y bajo groovy.',
    tracks: [
      { title: 'Tadow (feat. Masego)', album: 'French Kiwi Juice', year: 2017, duration: 301, affinity: 0.98 },
      { title: 'Ylang Ylang', album: 'Ylang Ylang EP', year: 2019, duration: 212, affinity: 0.96 },
      { title: 'Vibin\' Out with ((( O )))', album: 'French Kiwi Juice', year: 2017, duration: 232, affinity: 0.94 },
      { title: 'Losing My Way', album: 'Single', year: 2016, duration: 208, affinity: 0.92 },
    ],
  },
  {
    name: 'Tom Misch',
    artistTags: [{ name: 'neo-soul', weight: 100 }, { name: 'nu jazz', weight: 50 }, { name: 'soul', weight: 40 }],
    origin: 'Londres, Reino Unido · 2012',
    bio: 'Riffs de guitarra limpios con influencias de J Dilla, armonías de neo-soul y ritmos jazzy reconfortantes.',
    tracks: [
      { title: 'Movie', album: 'Geography', year: 2018, duration: 357, affinity: 0.97, trackTags: [{ name: 'neo-soul', weight: 100 }, { name: 'jazz', weight: 100 }] },
      { title: 'Lost in Paris', album: 'Geography', year: 2018, duration: 194, affinity: 0.95 },
      { title: 'South of the River', album: 'Geography', year: 2018, duration: 269, affinity: 0.93 },
    ],
  },
  {
    name: 'Hiatus Kaiyote',
    artistTags: [{ name: 'neo-soul', weight: 100 }, { name: 'future soul', weight: 60 }, { name: 'soul', weight: 40 }],
    origin: 'Melbourne, Australia · 2011',
    bio: 'Future soul polirrítmico, giros armónicos impredecibles y la virtuosa elasticidad vocal de Nai Palm.',
    tracks: [
      { title: 'Nakamarra', album: 'Tawk Tomahawk', year: 2012, duration: 282, affinity: 0.96, trackTags: [{ name: 'neo-soul', weight: 100 }, { name: 'jazz', weight: 100 }] },
      { title: 'Red Room', album: 'Mood Valiant', year: 2021, duration: 191, affinity: 0.94 },
      { title: 'Breathing Underwater', album: 'Choose Your Weapon', year: 2015, duration: 344, affinity: 0.92 },
    ],
  },
  {
    name: 'Sade',
    artistTags: [{ name: 'soul', weight: 100 }, { name: 'neo-soul', weight: 60 }, { name: 'r&b', weight: 60 }],
    origin: 'Londres, Reino Unido · 1982',
    bio: 'La elegancia definitiva del sophisti-pop y quiet storm: voz aterciopelada y bajos de seda.',
    tracks: [
      { title: 'Smooth Operator', album: 'Diamond Life', year: 1984, duration: 258, affinity: 0.97 },
      { title: 'No Ordinary Love', album: 'Love Deluxe', year: 1992, duration: 440, affinity: 0.96, trackTags: [{ name: 'soul', weight: 100 }, { name: 'trip-hop', weight: 100 }] },
      { title: 'By Your Side', album: 'Lovers Rock', year: 2000, duration: 274, affinity: 0.95 },
    ],
  },

  // 7. CYBERPUNK & ELECTRO-POP
  {
    name: 'Yellow Magic Orchestra',
    artistTags: [{ name: 'synthpop', weight: 100 }, { name: 'electropop', weight: 60 }, { name: 'electronic', weight: 40 }],
    origin: 'Tokio, Japón · 1978',
    bio: 'Pioneros mundiales del synth-pop y la música electrónica con microcomputadoras de Ryuichi Sakamoto.',
    tracks: [
      { title: 'Rydeen', album: 'Solid State Survivor', year: 1979, duration: 266, affinity: 0.97 },
      { title: 'Technopolis', album: 'Solid State Survivor', year: 1979, duration: 254, affinity: 0.96 },
      { title: 'Behind the Mask', album: 'Solid State Survivor', year: 1979, duration: 215, affinity: 0.93 },
    ],
  },
  {
    name: 'Grimes',
    artistTags: [{ name: 'electropop', weight: 100 }, { name: 'synthpop', weight: 60 }, { name: 'art pop', weight: 50 }],
    origin: 'Vancouver, Canadá · 2010',
    bio: 'Dream-synth futurista, capas vocales etéreas y secuenciadores industriales de dormitorio.',
    tracks: [
      { title: 'Oblivion', album: 'Visions', year: 2012, duration: 251, affinity: 0.96, trackTags: [{ name: 'electropop', weight: 100 }, { name: 'dream pop', weight: 100 }] },
      { title: 'Genesis', album: 'Visions', year: 2012, duration: 255, affinity: 0.95, trackTags: [{ name: 'electropop', weight: 100 }, { name: 'synthwave', weight: 100 }] },
      { title: 'Kill V. Maim', album: 'Art Angels', year: 2015, duration: 246, affinity: 0.92, trackTags: [{ name: 'electropop', weight: 100 }, { name: 'future bass', weight: 100 }] },
    ],
  },
  {
    name: 'Boy Harsher',
    artistTags: [{ name: 'darkwave', weight: 100 }, { name: 'synthpop', weight: 60 }, { name: 'electropop', weight: 40 }],
    origin: 'Northampton, Massachusetts · 2014',
    bio: 'Darkwave hipnótico, sintetizadores analógicos secos y pulsos cinematográficos seductores.',
    tracks: [
      { title: 'Pain', album: 'Yr Body Is Nothing', year: 2016, duration: 440, affinity: 0.95, trackTags: [{ name: 'darkwave', weight: 100 }, { name: 'shoegaze', weight: 100 }] },
      { title: 'Motion', album: 'Careful', year: 2019, duration: 217, affinity: 0.93, trackTags: [{ name: 'darkwave', weight: 100 }, { name: 'shoegaze', weight: 100 }] },
      { title: 'Fate', album: 'Careful', year: 2019, duration: 258, affinity: 0.91 },
    ],
  },

  // 8. POST-ROCK & CINEMATIC
  {
    name: 'Explosions in the Sky',
    artistTags: [{ name: 'post-rock', weight: 100 }, { name: 'cinematic', weight: 60 }, { name: 'instrumental', weight: 50 }],
    origin: 'Austin, Texas · 1999',
    bio: 'Crescendos de guitarras monumentales, dinámicas narrativas sinfónicas y percusiones marciales emotivas.',
    tracks: [
      { title: 'Your Hand in Mine', album: 'The Earth Is Not a Cold Dead Place', year: 2003, duration: 488, affinity: 0.98, trackTags: [{ name: 'post-rock', weight: 100 }, { name: 'shoegaze', weight: 100 }] },
      { title: 'First Breath After Coma', album: 'The Earth Is Not a Cold Dead Place', year: 2003, duration: 573, affinity: 0.96 },
      { title: 'The Only Moment We Were Alone', album: 'The Earth Is Not a Cold Dead Place', year: 2003, duration: 610, affinity: 0.94 },
    ],
  },
  {
    name: 'Sigur Rós',
    artistTags: [{ name: 'post-rock', weight: 100 }, { name: 'cinematic', weight: 60 }, { name: 'ambient', weight: 40 }],
    origin: 'Reikiavik, Islandia · 1994',
    bio: 'Guitarras tocadas con arco de chelo, falsete celestial en Vonlenska y paisajes glaciales.',
    tracks: [
      { title: 'Hoppípolla', album: 'Takk...', year: 2005, duration: 268, affinity: 0.98, trackTags: [{ name: 'post-rock', weight: 100 }, { name: 'dream pop', weight: 100 }] },
      { title: 'Svefn-g-englar', album: 'Ágætis byrjun', year: 1999, duration: 604, affinity: 0.96, trackTags: [{ name: 'post-rock', weight: 100 }, { name: 'shoegaze', weight: 100 }] },
      { title: 'Starálfur', album: 'Ágætis byrjun', year: 1999, duration: 406, affinity: 0.94 },
    ],
  },
  {
    name: 'Max Richter',
    artistTags: [{ name: 'cinematic', weight: 100 }, { name: 'modern classical', weight: 80 }, { name: 'post-rock', weight: 40 }],
    origin: 'Berlín / Reino Unido · 1995',
    bio: 'Post-minimalismo neoclásico: cuartetos de cuerda conmovedores entrelazados con sutiles sintetizadores modulares.',
    tracks: [
      { title: 'On the Nature of Daylight', album: 'The Blue Notebooks', year: 2004, duration: 371, affinity: 0.98, trackTags: [{ name: 'cinematic', weight: 100 }, { name: 'idm', weight: 100 }] },
      { title: 'November', album: 'Memoryhouse', year: 2002, duration: 382, affinity: 0.95 },
      { title: 'Spring 1', album: 'Recomposed by Max Richter: Vivaldi', year: 2012, duration: 151, affinity: 0.94 },
    ],
  },

  // 9. INDIE FOLK & PSYCHEDELIA
  {
    name: 'Tame Impala',
    artistTags: [{ name: 'psychedelic rock', weight: 100 }, { name: 'neo-psychedelia', weight: 70 }, { name: 'indie', weight: 50 }],
    origin: 'Perth, Australia · 2007',
    bio: 'Psicodelia moderna: capas de phaser analógico, líneas de bajo infecciosas y producción monumental de Kevin Parker.',
    tracks: [
      { title: 'The Less I Know The Better', album: 'Currents', year: 2015, duration: 216, affinity: 0.99 },
      { title: 'Feels Like We Only Go Backwards', album: 'Lonerism', year: 2012, duration: 192, affinity: 0.97 },
      { title: 'Let It Happen', album: 'Currents', year: 2015, duration: 467, affinity: 0.98 },
      { title: 'Borderline', album: 'The Slow Rush', year: 2020, duration: 237, affinity: 0.95 },
    ],
  },
  {
    name: 'Khruangbin',
    artistTags: [{ name: 'psychedelic rock', weight: 100 }, { name: 'psychedelic soul', weight: 70 }, { name: 'indie', weight: 40 }],
    origin: 'Houston, Texas · 2009',
    bio: 'Funk psicodélico global, melodías de guitarra con reverb de cinta, líneas de bajo profundas de Laura Lee y ritmos thai-funk.',
    tracks: [
      { title: 'Texas Sun (with Leon Bridges)', album: 'Texas Sun EP', year: 2020, duration: 252, affinity: 0.98 },
      { title: 'White Gloves', album: 'The Universe Smiles Upon You', year: 2015, duration: 218, affinity: 0.95, trackTags: [{ name: 'psychedelic rock', weight: 100 }, { name: 'rock nacional', weight: 100 }] },
      { title: 'Time (You and I)', album: 'Mordechai', year: 2020, duration: 342, affinity: 0.93 },
    ],
  },
  {
    name: 'Beach House',
    artistTags: [{ name: 'dream pop', weight: 100 }, { name: 'indie', weight: 60 }, { name: 'psychedelic rock', weight: 40 }],
    origin: 'Baltimore, Maryland · 2004',
    bio: 'Dream-pop hipnótico, órganos vintage, arpegios de guitarra con slide y la voz ensoñadora de Victoria Legrand.',
    tracks: [
      { title: 'Space Song', album: 'Depression Cherry', year: 2015, duration: 320, affinity: 0.99, trackTags: [{ name: 'dream pop', weight: 100 }, { name: 'shoegaze', weight: 100 }] },
      { title: 'Myth', album: 'Bloom', year: 2012, duration: 258, affinity: 0.97, trackTags: [{ name: 'dream pop', weight: 100 }, { name: 'shoegaze', weight: 100 }] },
      { title: 'Silver Soul', album: 'Teen Dream', year: 2010, duration: 298, affinity: 0.94 },
    ],
  },

  // 10. FUTURE BASS & MELODIC GLITCH
  {
    name: 'Flume',
    artistTags: [{ name: 'future bass', weight: 100 }, { name: 'electronic', weight: 60 }, { name: 'glitch', weight: 40 }],
    origin: 'Sídney, Australia · 2011',
    bio: 'Deconstrucción del beat, caídas melódicas de sintetizador con sidechain extremo y texturas orgánicas.',
    tracks: [
      { title: 'Never Be Like You', album: 'Skin', year: 2016, duration: 234, affinity: 0.98, trackTags: [{ name: 'future bass', weight: 100 }, { name: 'synthpop', weight: 100 }] },
      { title: 'Say It (feat. Tove Lo)', album: 'Skin', year: 2016, duration: 262, affinity: 0.95 },
      { title: 'Sleepless', album: 'Flume', year: 2012, duration: 209, affinity: 0.93 },
    ],
  },
  {
    name: 'ODESZA',
    artistTags: [{ name: 'future bass', weight: 100 }, { name: 'chillwave', weight: 60 }, { name: 'electronic', weight: 40 }],
    origin: 'Seattle, Washington · 2012',
    bio: 'Electrónica cinematográfica a escala de estadio, percusiones tribales y coros vocales etéreos.',
    tracks: [
      { title: 'Say My Name', album: 'In Return', year: 2014, duration: 262, affinity: 0.97, trackTags: [{ name: 'future bass', weight: 100 }, { name: 'synthpop', weight: 100 }] },
      { title: 'A Moment Apart', album: 'A Moment Apart', year: 2017, duration: 234, affinity: 0.96 },
      { title: 'Line of Sight', album: 'A Moment Apart', year: 2017, duration: 237, affinity: 0.94 },
    ],
  },
  {
    name: 'Porter Robinson',
    artistTags: [{ name: 'future bass', weight: 100 }, { name: 'electropop', weight: 40 }, { name: 'glitch', weight: 40 }],
    origin: 'Chapel Hill, Carolina del Norte · 2010',
    bio: 'Fusión de estética visual anime, melodías electrónicas nostálgicas y letras introspectivas profundas.',
    tracks: [
      { title: 'Shelter (with Madeon)', album: 'Shelter', year: 2016, duration: 219, affinity: 0.99 },
      { title: 'Sad Machine', album: 'Worlds', year: 2014, duration: 350, affinity: 0.97 },
      { title: 'Look at the Sky', album: 'Nurture', year: 2021, duration: 310, affinity: 0.95, trackTags: [{ name: 'future bass', weight: 100 }, { name: 'j-pop', weight: 100 }] },
    ],
  },

  // 11. LATIN ALTERNATIVE & TROPICAL PSYCH
  {
    name: 'Soda Stereo',
    artistTags: [{ name: 'rock nacional', weight: 100 }, { name: 'rock en español', weight: 60 }, { name: 'new wave', weight: 40 }],
    origin: 'Buenos Aires, Argentina · 1982',
    bio: 'La banda definitiva del rock en español: new wave elegante, guitarras shoegaze y la lírica inmortal de Gustavo Cerati.',
    tracks: [
      { title: 'En la Ciudad de la Furia', album: 'Doble Vida', year: 1988, duration: 346, affinity: 0.99 },
      { title: 'De Música Ligera', album: 'Canción Animal', year: 1990, duration: 212, affinity: 0.98 },
      { title: 'Prófugos', album: 'Signos', year: 1986, duration: 320, affinity: 0.97 },
      { title: 'Trátame Suavemente', album: 'Soda Stereo', year: 1984, duration: 202, affinity: 0.96 },
    ],
  },
  {
    name: 'Gustavo Cerati',
    artistTags: [{ name: 'rock nacional', weight: 100 }, { name: 'rock en español', weight: 60 }, { name: 'latin alternative', weight: 40 }],
    origin: 'Buenos Aires, Argentina · 1993',
    bio: 'Exploraciones electrónicas y de pop-rock barroco: guitarras psicodélicas y poesía sensorial.',
    tracks: [
      { title: 'Crimen', album: 'Ahí Vamos', year: 2006, duration: 228, affinity: 0.99 },
      { title: 'Puente', album: 'Bocanada', year: 1999, duration: 273, affinity: 0.98, trackTags: [{ name: 'rock nacional', weight: 100 }, { name: 'psychedelic rock', weight: 100 }] },
      { title: 'Adiós', album: 'Ahí Vamos', year: 2006, duration: 231, affinity: 0.96 },
      { title: 'Paseo Inmoral', album: 'Bocanada', year: 1999, duration: 331, affinity: 0.94 },
    ],
  },
  {
    name: 'Babasónicos',
    artistTags: [{ name: 'rock nacional', weight: 100 }, { name: 'latin alternative', weight: 60 }, { name: 'indie', weight: 40 }],
    origin: 'Lanús, Argentina · 1991',
    bio: 'Glam rock, pop ácido, lírica seductora y producción de vanguardia en la escena latinoamericana.',
    tracks: [
      { title: 'Irresponsables', album: 'Infame', year: 2003, duration: 156, affinity: 0.96 },
      { title: 'El Colmo', album: 'Anoche', year: 2005, duration: 171, affinity: 0.94 },
      { title: 'Putita', album: 'Infame', year: 2003, duration: 225, affinity: 0.93 },
    ],
  },

  // 12. MODERN JAZZ & FUSION
  {
    name: 'BADBADNOTGOOD',
    artistTags: [{ name: 'jazz', weight: 100 }, { name: 'nu jazz', weight: 60 }, { name: 'instrumental hip hop', weight: 50 }],
    origin: 'Toronto, Canadá · 2010',
    bio: 'Puente revolucionario entre hip-hop analógico, improvisación jazzística libre y texturas retro.',
    tracks: [
      { title: 'Time Moves Slow (feat. Sam Herring)', album: 'IV', year: 2016, duration: 273, affinity: 0.98 },
      { title: 'In Your Eyes (feat. Charlotte Day Wilson)', album: 'IV', year: 2016, duration: 247, affinity: 0.95 },
      { title: 'Speaking Gently', album: 'IV', year: 2016, duration: 247, affinity: 0.93 },
    ],
  },
  {
    name: 'Kamasi Washington',
    artistTags: [{ name: 'jazz', weight: 100 }, { name: 'spiritual jazz', weight: 70 }, { name: 'jazz fusion', weight: 50 }],
    origin: 'Los Ángeles, California · 2004',
    bio: 'Saxofón tenor monumental, arreglos orquestales cósmicos que reviven el espíritu de Sun Ra y John Coltrane.',
    tracks: [
      { title: 'Truth', album: 'Harmony of Difference', year: 2017, duration: 813, affinity: 0.97 },
      { title: 'Street Fighter Mas', album: 'Heaven and Earth', year: 2018, duration: 358, affinity: 0.94 },
      { title: 'The Rhythm Changes', album: 'The Epic', year: 2015, duration: 464, affinity: 0.93 },
    ],
  },
  {
    name: 'Thundercat',
    artistTags: [{ name: 'jazz fusion', weight: 100 }, { name: 'funk', weight: 60 }, { name: 'neo-soul', weight: 40 }],
    origin: 'Los Ángeles, California · 2011',
    bio: 'Bajo de seis cuerdas ultrarrápido con acordes de jazz fusion, falsetes soul y humor surrealista.',
    tracks: [
      { title: 'Them Changes', album: 'Drunk', year: 2017, duration: 188, affinity: 0.98, trackTags: [{ name: 'jazz fusion', weight: 100 }, { name: 'neo-soul', weight: 100 }] },
      { title: 'Dragonball Durag', album: 'It Is What It Is', year: 2020, duration: 181, affinity: 0.95 },
      { title: 'Funny Thing', album: 'It Is What It Is', year: 2020, duration: 116, affinity: 0.94 },
    ],
  },
];

/**
 * Builds a deterministic, rich slice of tracks up to targetCount
 */
function sliceCuratedTracks(targetCount: number): RawLibraryTrackInput[] {
  const result: RawLibraryTrackInput[] = [];
  let trackIndex = 0;
  
  // Interleave tracks across artists to ensure balanced genre and artist distribution at any count
  let addedAny = true;
  while (result.length < targetCount && addedAny) {
    addedAny = false;
    for (const artist of ARTIST_DATABASE) {
      if (result.length >= targetCount) break;
      if (trackIndex < artist.tracks.length) {
        const t = artist.tracks[trackIndex];
        result.push({
          title: t.title,
          artist: artist.name,
          artistTags: artist.artistTags,
          trackTags: t.trackTags,
          album: `${t.album} (${t.year})`,
          durationSec: t.duration,
          playCount: Math.round(50 + t.affinity * 65 + (t.year % 10) * 4),
          affinity: t.affinity,
          origin: artist.origin,
          bio: artist.bio,
        });
        addedAny = true;
      }
    }
    trackIndex++;
  }

  // If we still need more tracks to hit exactly targetCount (e.g., for 300), generate natural live/session variations
  if (result.length < targetCount) {
    let cycle = 1;
    while (result.length < targetCount) {
      for (const artist of ARTIST_DATABASE) {
        if (result.length >= targetCount) break;
        const baseTrack = artist.tracks[(cycle - 1) % artist.tracks.length];
        const variationLabels = ['Live in Tokyo', 'Acoustic Session', 'Extended Cosmic Mix', 'Remix Suite', 'BBC Radio 1 Session', 'KEXP Live'];
        const varLabel = variationLabels[(cycle + artist.name.length) % variationLabels.length];
        result.push({
          title: `${baseTrack.title} (${varLabel})`,
          artist: artist.name,
          artistTags: artist.artistTags,
          trackTags: baseTrack.trackTags,
          album: `${baseTrack.album} (Deluxe Archive)`,
          durationSec: baseTrack.duration + 45,
          playCount: Math.round(30 + baseTrack.affinity * 40),
          affinity: Math.max(0.68, Number((baseTrack.affinity - 0.04 * cycle).toFixed(2))),
          origin: artist.origin,
          bio: artist.bio,
        });
      }
      cycle++;
    }
  }

  return result.slice(0, targetCount);
}

// 1. Preset 50 Pistas: Cosmos Íntimo
export const PRESET_50_PAYLOAD: RawLibraryPayload = {
  profileName: 'Cosmos Íntimo (50 Pistas)',
  source: 'spotify',
  tracks: sliceCuratedTracks(50),
};

// 2. Preset 150 Pistas: Galaxia Expandida
export const PRESET_150_PAYLOAD: RawLibraryPayload = {
  profileName: 'Galaxia Expandida (150 Pistas)',
  source: 'spotify',
  tracks: sliceCuratedTracks(150),
};

// 3. Preset 300 Pistas: Supercúmulo Estelar
export const PRESET_300_PAYLOAD: RawLibraryPayload = {
  profileName: 'Supercúmulo Estelar (300 Pistas)',
  source: 'spotify',
  tracks: sliceCuratedTracks(300),
};

// Pre-built 3D universes ready for 0ms instantaneous loading
export const GALAXY_PRESET_50: MusicGalaxyData = buildMusicGalaxyFromPayload(PRESET_50_PAYLOAD);
export const GALAXY_PRESET_150: MusicGalaxyData = buildMusicGalaxyFromPayload(PRESET_150_PAYLOAD);
export const GALAXY_PRESET_300: MusicGalaxyData = buildMusicGalaxyFromPayload(PRESET_300_PAYLOAD);
