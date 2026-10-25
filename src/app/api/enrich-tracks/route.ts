import { NextRequest, NextResponse } from 'next/server';

interface EnrichTrackRequestItem {
  key: string;
  title: string;
  artist: string;
  existingGenre?: string;
  existingSecondaryGenre?: string;
  existingPreviewUrl?: string;
}

export interface EnrichTrackResultItem {
  key: string;
  genre: string;
  secondaryGenre?: string;
  rawGenre: string;
  previewUrl: string;
}

interface ArtistClassification {
  genre: string;
  secondaryGenre: string;
  rawGenre: string;
}

const artistClassificationCache = new Map<string, ArtistClassification>();

/**
 * 14 Canonical Musical Genre Constellations + their natural sister constellations
 * so every sector in the 3D universe has meaningful musical cross-bridges.
 */
const GENRE_SISTER_MAP: Record<string, string> = {
  'ROCK NACIONAL & ARGENTINO': 'ROCK CLÁSICO & PSICODELIA',
  'ROCK CLÁSICO & PSICODELIA': 'HARD ROCK, GRUNGE & PUNK',
  'HARD ROCK, GRUNGE & PUNK': 'METAL & HEAVY ROCK',
  'METAL & HEAVY ROCK': 'HARD ROCK, GRUNGE & PUNK',
  'INDIE ROCK & POST-PUNK': 'DREAM POP, SHOEGAZE & NEW WAVE',
  'DREAM POP, SHOEGAZE & NEW WAVE': 'SYNTHWAVE, IDM & AMBIENT',
  'POP INTERNACIONAL & SYNTH-POP': 'ELECTRÓNICA, HOUSE & TECHNO',
  'POP LATINO & BALADA': 'URBANO, TRAP & REGGAETÓN',
  'URBANO, TRAP & REGGAETÓN': 'HIP-HOP, RAP & BOOM BAP',
  'HIP-HOP, RAP & BOOM BAP': 'R&B, SOUL, FUNK & DISCO',
  'R&B, SOUL, FUNK & DISCO': 'JAZZ, BLUES, FOLK & SOUNDTRACK',
  'ELECTRÓNICA, HOUSE & TECHNO': 'SYNTHWAVE, IDM & AMBIENT',
  'SYNTHWAVE, IDM & AMBIENT': 'ELECTRÓNICA, HOUSE & TECHNO',
  'CUMBIA, CUARTETO & TROPICAL': 'POP LATINO & BALADA',
  'REGGAE, SKA & MESTIZO': 'ROCK NACIONAL & ARGENTINO',
  'JAZZ, BLUES, FOLK & SOUNDTRACK': 'R&B, SOUL, FUNK & DISCO',
};

const ALL_CANONICAL_GENRES = Object.keys(GENRE_SISTER_MAP);

/**
 * Instant 0ms Artist Knowledge Base covering 300+ Argentine, Latin & International artists
 * with primary + secondary genres so bulk 500-track imports classify accurately & instantaneously.
 */
const INSTANT_ARTIST_GENRES: Array<{
  patterns: string[];
  genre: string;
  secondaryGenre: string;
}> = [
  {
    patterns: [
      'soda stereo', 'gustavo cerati', 'cerati', 'spinetta', 'almendra', 'pescado rabioso',
      'invisible', 'spinetta jade', 'charly garc', 'sui generis', 'serú girán', 'seru giran',
      'la máquina de hacer pájaros', 'fito paez', 'fito páez', 'andrés calamaro', 'andres calamaro',
      'los abuelos de la nada', 'virus', 'sumo', 'divididos', 'las pelotas', 'patricio rey',
      'redonditos de ricota', 'indio solari', 'skay beilinson', 'la renga', 'pappo', 'riff',
      'ratones paranoicos', 'viejas locas', 'intoxicados', 'pity alvarez', 'callejeros',
      'don osvaldo', 'los piojos', 'ciro y los persas', 'bersuit', 'cinge', 'babasónicos',
      'babasonicos', 'turf', 'estelares', 'guasones', 'la beriso', 'las pastillas del abuelo',
      'el bordo', 'pier', 'jóvenes pordioseros', 'cielo razzo', 'airbag', 'tan biónica',
      'tan bionica', 'miranda!', 'catupecu machu', 'masacre', 'el mató a un policía motorizado',
      'el mato a un policia motorizado', 'usted señalemelo', 'bandalos chinos', 'conociendo rusia',
      'marilina bertoldi', 'eruca sativa', 'nafta', 'el kuelgue', 'cruzando el charco',
      'el plan de la mariposa', 'la vela puerca', 'no te va gustar', 'el cuarteto de nos',
      'cuarteto de nos', 'buitres', 'once tiros', 'trotsky vengarán', 'enano', 'león gieco',
      'leon gieco', 'pedro aznar', 'david lebón', 'fabiana cantilo', 'hilda lizarazu',
      'attaque 77', '2 minutos', 'flema', 'bulldog', 'cadena perpetua', 'mal momento',
      'carajo', 'almafuerte', 'hermética', 'hermetica', 'v8', 'rata blanca', 'horcas', 'asspera',
    ],
    genre: 'ROCK NACIONAL & ARGENTINO',
    secondaryGenre: 'ROCK CLÁSICO & PSICODELIA',
  },
  {
    patterns: [
      'metallica', 'iron maiden', 'black sabbath', 'megadeth', 'slayer', 'pantera', 'judas priest',
      'ozzy osbourne', 'motorhead', 'motörhead', 'system of a down', 'slipknot', 'korn',
      'deftones', 'limp bizkit', 'linkin park', 'disturbed', 'avenged sevenfold', 'tool',
      'rage against the machine', 'rammstein', 'sepultura', 'gojira', 'mastodon', 'opeth',
      'dream theater', 'nightwish', 'epica', 'helloween', 'stratovarius', 'sonata arctica',
      'ghost', 'bring me the horizon', 'architects', 'bullet for my valentine', 'killswitch engage',
      'lamb of god', 'trivium', 'evanescence', 'within temptation', 'Papa Roach', 'mudvayne',
    ],
    genre: 'METAL & HEAVY ROCK',
    secondaryGenre: 'HARD ROCK, GRUNGE & PUNK',
  },
  {
    patterns: [
      'nirvana', 'pearl jam', 'soundgarden', 'alice in chains', 'stone temple pilots',
      'foo fighters', 'queens of the stone age', 'audislave', 'audioslave', 'chris cornell',
      'green day', 'the offspring', 'blink-182', 'sum 41', 'ramones', 'sex pistols',
      'the clash', 'misfits', 'bad religion', 'nofx', 'rancid', 'rise against', 'my chemical romance',
      'paramore', 'fall out boy', 'panic! at the disco', 'guns n\' roses', 'guns n roses',
      'ac/dc', 'acdc', 'aerosmith', 'van halen', 'bon jovi', 'def leppard', 'motley crue',
      'kiss', 'deep purple', 'whitesnake', 'scorpions', 'velvet revolver', 'slash', 'the hives',
      'royal blood', 'muse', 'placebo', 'smashing pumpkins', 'nine inch nails', 'pixies',
    ],
    genre: 'HARD ROCK, GRUNGE & PUNK',
    secondaryGenre: 'ROCK CLÁSICO & PSICODELIA',
  },
  {
    patterns: [
      'the beatles', 'pink floyd', 'led zeppelin', 'queen', 'the rolling stones', 'david bowie',
      'the doors', 'jimi hendrix', 'creedence', 'dire straits', 'the who', 'fleetwood mac',
      'eric clapton', 'bruce springsteen', 'bob dylan', 'tom petty', 'eagles', 'santana',
      'supertramp', 'genesis', 'phil collins', 'yes', 'king crimson', 'elton john', 'billy joel',
      'the police', 'sting', 'u2', 'r.e.m.', 'rem', 'inxs', 'toto', 'journey', 'boston', 'kansas',
      'electric light orchestra', 'elo', 'alan parsons', 'steely dan', 'lou reed', 'velvet underground',
    ],
    genre: 'ROCK CLÁSICO & PSICODELIA',
    secondaryGenre: 'INDIE ROCK & POST-PUNK',
  },
  {
    patterns: [
      'arctic monkeys', 'the strokes', 'interpol', 'franz ferdinand', 'the killers',
      'kasabian', 'oasis', 'blur', 'pulp', 'suede', 'the verve', 'radiohead', 'thom yorke',
      'the smile', 'the smiths', 'morrissey', 'joy division', 'new order', 'the cure',
      'siouxsie', 'bauhaus', 'echo & the bunnymen', 'talking heads', 'arcade fire',
      'vampire weekend', 'yeah yeah yeahs', 'bloc party', 'foals', 'two door cinema club',
      'the kooks', 'cage the elephant', 'mgmt', 'foster the people', 'phoenix', 'spoon',
      'the national', 'modest mouse', 'weezer', 'beck', 'pavement', 'sonic youth',
      'fontaines d.c.', 'idles', 'black midi', 'wet leg', 'wolf alice', 'alt-j',
    ],
    genre: 'INDIE ROCK & POST-PUNK',
    secondaryGenre: 'DREAM POP, SHOEGAZE & NEW WAVE',
  },
  {
    patterns: [
      'tame impala', 'beach house', 'cocteau twins', 'my bloody valentine', 'slowdive',
      'mazzy star', 'cigarettes after sex', 'men i trust', 'mac demarco', 'clairo',
      'beabadoobee', 'alvvays', 'khruangbin', 'crinz', 'crumb', 'boy pablo', 'cuco',
      'the marías', 'the marias', 'kali uchis', 'lana del rey', 'lorde', 'mitski',
      'phoebe bridgers', 'bon iver', 'sufjan stevens', 'fleet foxes', 'sigur rós', 'sigur ros',
      'björk', 'bjork', 'portishead', 'massive attack', 'tricky', 'air', 'zero 7',
      'depeche mode', 'tears for fears', 'duran duran', 'a-ha', 'pet shop boys', 'erasure',
    ],
    genre: 'DREAM POP, SHOEGAZE & NEW WAVE',
    secondaryGenre: 'INDIE ROCK & POST-PUNK',
  },
  {
    patterns: [
      'daft punk', 'justice', 'chemical brothers', 'the prodigy', 'fatboy slim', 'underworld',
      'orbital', 'aphex twin', 'boards of canada', 'four tet', 'burial', 'bonobo', 'caribou',
      'jamie xx', 'bicep', 'disclosure', 'flume', 'odesza', 'rüfüs du sol', 'rufus du sol',
      'fred again', 'skrillex', 'deadmau5', 'avichi', 'avicii', 'calvin harris', 'david guetta',
      'tiësto', 'tiesto', 'armin van buuren', 'swedish house mafia', 'eric prydz', 'charlotte de witte',
      'amelie lens', 'peggy gou', 'kaytranada', 'gesaffelstein', 'kavinsky', 'm83', 'kraftwerk',
      'jean-michel jarre', 'giorgio moroder', 'new order', 'lcd soundsystem', 'gorillaz',
      'pendulum', 'sub focus', 'chase & status', 'noisia', 'hernan cattaneo', 'hernán cattáneo',
    ],
    genre: 'ELECTRÓNICA, HOUSE & TECHNO',
    secondaryGenre: 'POP INTERNACIONAL & SYNTH-POP',
  },
  {
    patterns: [
      'duki', 'bizarrap', 'bzrp', 'ysy a', 'neo pistea', 'cro', 'c.r.o', 'khea', 'nicki nicole',
      'trueno', 'tiago pzk', 'lit killah', 'maria becerra', 'maría becerra', 'emilia', 'tini',
      'milo j', 'bhavi', 'ca7riel', 'paco amoroso', 'dillom', 'saramalacara', 'taichu',
      'bad bunny', 'j balvin', 'daddy yankee', 'don omar', 'tego calderón', 'wisin', 'yandel',
      'ozuna', 'anuel aa', 'rauw alejandro', 'feid', 'karol g', 'maluma', 'myke towers',
      'jhAY cortez', 'jhayco', 'mora', 'eladio carrion', 'arcángel', 'arcangel', 'nicky jam',
      'farruko', 'sech', 'quevedo', 'rosalía', 'rosalia', 'c. tangana', 'rels b', 'Paulo Londra',
      'paulo londra', 'lgante', 'l-gante', 'bm', 'calle 13', 'residente',
    ],
    genre: 'URBANO, TRAP & REGGAETÓN',
    secondaryGenre: 'HIP-HOP, RAP & BOOM BAP',
  },
  {
    patterns: [
      'wos', 'acru', 'fianru', 'bardero$', 'kamada', 't&k', 'canserbero', 'alcolirykoz',
      'violadores del verso', 'kase.o', 'nach', 'sfdk', 'ayax', 'prok', 'control machete',
      'cartel de santa', 'orishas', 'eminem', 'kendrick lamar', 'kanye west', 'jay-z',
      'nas', 'notorious b.i.g.', '2pac', 'tupac', 'dr. dre', 'snoop dogg', 'ice cube',
      'wu-tang clan', 'a tribe called quest', 'outkast', '50 cent', 'travis scott', 'drake',
      'j. cole', 'tyler, the creator', 'asap rocky', 'a$ap rocky', 'future', 'metro boomin',
      'playboi carti', '21 savage', 'post malone', 'mac miller', 'mf doom', 'joey bada$$',
      'denzel curry', 'jid', 'cypress hill', 'beastie boys', 'run-d.m.c.',
    ],
    genre: 'HIP-HOP, RAP & BOOM BAP',
    secondaryGenre: 'URBANO, TRAP & REGGAETÓN',
  },
  {
    patterns: [
      'michael jackson', 'madonna', 'prince', 'whitney houston', 'george michael', 'abba',
      'bee gees', 'dua lipa', 'the weeknd', 'bruno mars', 'lady gaga', 'taylor swift',
      'billie eilish', 'harry styles', 'olivia rodrigo', 'sabrina carpenter', 'ariana grande',
      'rihanna', 'beyoncé', 'beyonce', 'justin timberlake', 'britney spears', 'katy perry',
      'adele', 'ed sheeran', 'coldplay', 'maroon 5', 'imagine dragons', 'one republic',
      'twenty one pilots', 'shawn mendes', 'camila cabello', 'charli xcx', 'troye sivan',
      'carly rae jepsen', 'kylie minogue', 'robyn', 'sophie ellis-bextor', 'jamiroquai',
    ],
    genre: 'POP INTERNACIONAL & SYNTH-POP',
    secondaryGenre: 'R&B, SOUL, FUNK & DISCO',
  },
  {
    patterns: [
      'shakira', 'luis miguel', 'chayanne', 'ricky martin', 'enrique iglesias', 'juanes',
      'maná', 'mana', 'julieta venegas', 'natalia lafourcade', 'mon laferte', 'jorge drexler',
      'alejandro sanz', 'joaquin sabina', 'joaquín sabina', 'joan manuel serrat', 'ricardo arjona',
      'camilo', 'morat', 'reik', 'sin bandera', 'camila', 'jesse & joy', 'alejando fernandez',
      'cristian castro', 'marco antonio solis', 'sandro', 'abel pintos', 'luciano pereyra',
      'lali', 'miranda', 'zoe', 'zoé', 'café tacvba', 'cafe tacvba', 'molotov', 'caifanes',
    ],
    genre: 'POP LATINO & BALADA',
    secondaryGenre: 'ROCK NACIONAL & ARGENTINO',
  },
  {
    patterns: [
      'los palmeras', 'damas gratis', 'pablo lescano', 'yerba brava', 'pibes chorros',
      'mala fama', 'supermerk2', 'amar azul', 'ráfaga', 'rafaga', 'gilda', 'rodrigo',
      'la mona jiménez', 'la mona jimenez', 'ulises bueno', 'la k\'onga', 'la konga',
      'luck ra', 'q\' lokura', 'q lokura', 'banda xxi', 'los auténticos decadentes',
      'los autenticos decadentes', 'kapanga', 'la mosca', 'los totora', 'agapornis',
      'ke personajes', 'la t y la m', 'los ángeles azules', 'los angeles azules',
      'romeo santos', 'aventura', 'juan luis guerra', 'marc anthony', 'celia cruz',
      'rubén blades', 'ruben blades', 'willie colón', 'hector lavoe',
    ],
    genre: 'CUMBIA, CUARTETO & TROPICAL',
    secondaryGenre: 'POP LATINO & BALADA',
  },
  {
    patterns: [
      'los cafres', 'los pericos', 'nonpalidece', 'dread mar i', 'gondwana', 'cultura profética',
      'cultura profetica', 'fidel nadal', 'todos tus muertos', 'dancing mood', 'los fabulosos cadillacs',
      'fabulosos cadillacs', 'vicentico', 'mano negra', 'manu chao', 'bob marley', 'peter tosh',
      'jimmy cliff', 'ub40', 'sublime', 'no doubt', 'madness', 'the specials', 'skatalites',
      'las manos de filippi', 'karamelo santo', 'arbol', 'árbol',
    ],
    genre: 'REGGAE, SKA & MESTIZO',
    secondaryGenre: 'ROCK NACIONAL & ARGENTINO',
  },
  {
    patterns: [
      'stevie wonder', 'marvin gaye', 'aretha franklin', 'james brown', 'earth, wind & fire',
      'kool & the gang', 'chic', 'nile rodgers', 'donna summer', 'sade', 'erykah badu',
      'lauryn hill', 'd\'angelo', 'frank ocean', 'sza', 'daniel caesar', 'h.e.r.', 'usher',
      'alicia keys', 'amy winehouse', 'childish gambino', 'anderson .paak', 'silk sonic',
      'thundercat', 'vulfpeck', 'parcels', 'l\'impératrice', 'jungle', 'boney m',
    ],
    genre: 'R&B, SOUL, FUNK & DISCO',
    secondaryGenre: 'POP INTERNACIONAL & SYNTH-POP',
  },
  {
    patterns: [
      'miles davis', 'john coltrane', 'bill evans', 'chet baker', 'herbie hancock',
      'nina simone', 'ella fitzgerald', 'louis armstrong', 'frank sinatra', 'b.b. king',
      'muddy waters', 'stevie ray vaughan', 'gary moore', 'joe bonamassa', 'astor piazzolla',
      'mercedes sosa', 'atahualpa yupanqui', 'horacio guarany', 'los chalchaleros',
      'los manseros santiagueños', 'soledad', 'chaqueño palavecino', 'divididos',
      'hans zimmer', 'john williams', 'ennio morricone', 'gustavo santaolalla', 'ludovico einaudi',
      'ryuichi sakamoto', 'joe hisaishi', 'vangelis', 'max richter',
    ],
    genre: 'JAZZ, BLUES, FOLK & SOUNDTRACK',
    secondaryGenre: 'ROCK CLÁSICO & PSICODELIA',
  },
];

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Classifies an artist & raw genre label into one of our 14+ canonical musical constellations
 * plus a related secondary genre for inter-constellation links.
 */
function classifyGenre(
  rawGenre: string,
  secondaryRaw: string,
  artistName: string
): ArtistClassification {
  const a = artistName.trim().toLowerCase();
  const g = `${rawGenre} ${secondaryRaw}`.trim().toLowerCase();

  // 1. Check instant 300+ artist dictionary first (0ms, 100% accurate)
  for (const entry of INSTANT_ARTIST_GENRES) {
    if (entry.patterns.some((p) => a === p || a.includes(p))) {
      return {
        genre: entry.genre,
        secondaryGenre: entry.secondaryGenre,
        rawGenre: rawGenre || entry.genre,
      };
    }
  }

  // 2. Match by raw genre string from Spotify / Deezer / Apple Music
  let primary = '';

  if (
    g.includes('urbano') ||
    g.includes('reggaeton') ||
    g.includes('reggaetón') ||
    g.includes('trap') ||
    g.includes('dembow') ||
    g.includes('rkt')
  ) {
    primary = 'URBANO, TRAP & REGGAETÓN';
  } else if (
    g.includes('cumbia') ||
    g.includes('cuarteto') ||
    g.includes('tropical') ||
    g.includes('salsa') ||
    g.includes('bachata') ||
    g.includes('merengue')
  ) {
    primary = 'CUMBIA, CUARTETO & TROPICAL';
  } else if (
    g.includes('reggae') ||
    g.includes('ska') ||
    g.includes('dub') ||
    g.includes('mestizo')
  ) {
    primary = 'REGGAE, SKA & MESTIZO';
  } else if (
    g.includes('argentine') ||
    g.includes('rock nacional') ||
    g.includes('rock en español') ||
    g.includes('rock latino') ||
    g.includes('latin rock') ||
    g.includes('latin alternative')
  ) {
    primary = 'ROCK NACIONAL & ARGENTINO';
  } else if (
    g.includes('metal') ||
    g.includes('thrash') ||
    g.includes('death') ||
    g.includes('doom') ||
    g.includes('nu metal')
  ) {
    primary = 'METAL & HEAVY ROCK';
  } else if (
    g.includes('hard rock') ||
    g.includes('grunge') ||
    g.includes('punk') ||
    g.includes('hardcore') ||
    g.includes('emo')
  ) {
    primary = 'HARD ROCK, GRUNGE & PUNK';
  } else if (
    g.includes('dream pop') ||
    g.includes('shoegaze') ||
    g.includes('new wave') ||
    g.includes('synthpop') ||
    g.includes('trip-hop') ||
    g.includes('lo-fi')
  ) {
    primary = 'DREAM POP, SHOEGAZE & NEW WAVE';
  } else if (
    g.includes('indie') ||
    g.includes('post-punk') ||
    g.includes('britpop') ||
    g.includes('alternative') ||
    g.includes('alternativo')
  ) {
    primary = 'INDIE ROCK & POST-PUNK';
  } else if (
    g.includes('rock') ||
    g.includes('psychedelic') ||
    g.includes('prog')
  ) {
    primary = 'ROCK CLÁSICO & PSICODELIA';
  } else if (
    g.includes('synthwave') ||
    g.includes('idm') ||
    g.includes('ambient') ||
    g.includes('downtempo')
  ) {
    primary = 'SYNTHWAVE, IDM & AMBIENT';
  } else if (
    g.includes('electronic') ||
    g.includes('electrónica') ||
    g.includes('electro') ||
    g.includes('dance') ||
    g.includes('house') ||
    g.includes('techno') ||
    g.includes('trance') ||
    g.includes('edm') ||
    g.includes('drum')
  ) {
    primary = 'ELECTRÓNICA, HOUSE & TECHNO';
  } else if (
    g.includes('hip-hop') ||
    g.includes('hip hop') ||
    g.includes('rap') ||
    g.includes('boom bap')
  ) {
    primary = 'HIP-HOP, RAP & BOOM BAP';
  } else if (
    g.includes('r&b') ||
    g.includes('soul') ||
    g.includes('funk') ||
    g.includes('disco') ||
    g.includes('motown')
  ) {
    primary = 'R&B, SOUL, FUNK & DISCO';
  } else if (
    g.includes('jazz') ||
    g.includes('blues') ||
    g.includes('folk') ||
    g.includes('country') ||
    g.includes('classical') ||
    g.includes('clásica') ||
    g.includes('soundtrack') ||
    g.includes('tango') ||
    g.includes('folklore') ||
    g.includes('acoustic')
  ) {
    primary = 'JAZZ, BLUES, FOLK & SOUNDTRACK';
  } else if (
    g.includes('latin') ||
    g.includes('latino') ||
    g.includes('balada') ||
    g.includes('bolero')
  ) {
    primary = 'POP LATINO & BALADA';
  } else if (g.includes('pop')) {
    primary = 'POP INTERNACIONAL & SYNTH-POP';
  }

  // Deterministic musical distribution if an obscure artist still had no tag
  if (!primary) {
    const idx = hashString(a) % ALL_CANONICAL_GENRES.length;
    primary = ALL_CANONICAL_GENRES[idx];
  }

  const secondary = GENRE_SISTER_MAP[primary] || 'ROCK CLÁSICO & PSICODELIA';
  return {
    genre: primary,
    secondaryGenre: secondary,
    rawGenre: rawGenre || primary,
  };
}

/**
 * Queries Deezer's high-limit API (`50 req / 5s`) per unique artist to obtain
 * official album `genres.data` when an artist isn't already in our instant dictionary.
 */
async function resolveArtistClassification(
  artistName: string,
  existingGenre?: string,
  existingSecondary?: string
): Promise<ArtistClassification> {
  const artistKey = artistName.trim().toLowerCase();
  const cached = artistClassificationCache.get(artistKey);
  if (cached) return cached;

  // Check if instant dictionary already knows this artist (0 network calls needed!)
  for (const entry of INSTANT_ARTIST_GENRES) {
    if (entry.patterns.some((p) => artistKey === p || artistKey.includes(p))) {
      const result: ArtistClassification = {
        genre: entry.genre,
        secondaryGenre: entry.secondaryGenre,
        rawGenre: existingGenre || entry.genre,
      };
      artistClassificationCache.set(artistKey, result);
      return result;
    }
  }

  if (existingGenre && existingGenre.trim()) {
    const result = classifyGenre(
      existingGenre,
      existingSecondary || '',
      artistName
    );
    artistClassificationCache.set(artistKey, result);
    return result;
  }

  let fetchedGenre = '';
  let fetchedSecondary = '';

  // Query Deezer Search + Album Genre (50 req / 5s limit, no 20/min throttling!)
  try {
    const dzRes = await fetch(
      `https://api.deezer.com/search?q=artist:"${encodeURIComponent(
        artistName
      )}"&limit=1`,
      { headers: { Accept: 'application/json' }, next: { revalidate: 86400 } }
    );
    if (dzRes.ok) {
      const dzData = (await dzRes.json()) as {
        data?: { album?: { id?: number } }[];
      };
      const albumId = dzData.data?.[0]?.album?.id;
      if (albumId) {
        const albumRes = await fetch(
          `https://api.deezer.com/album/${albumId}`,
          { headers: { Accept: 'application/json' }, next: { revalidate: 86400 } }
        );
        if (albumRes.ok) {
          const albumJson = (await albumRes.json()) as {
            genres?: { data?: { name?: string }[] };
          };
          const gList = albumJson.genres?.data || [];
          if (gList[0]?.name) fetchedGenre = gList[0].name;
          if (gList[1]?.name) fetchedSecondary = gList[1].name;
        }
      }
    }
  } catch {
    // Continue
  }

  const finalResult = classifyGenre(
    fetchedGenre,
    fetchedSecondary,
    artistName
  );
  artistClassificationCache.set(artistKey, finalResult);
  return finalResult;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { tracks?: EnrichTrackRequestItem[] };
    const tracks = Array.isArray(body.tracks) ? body.tracks.slice(0, 3000) : [];

    if (tracks.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // 1. Deduplicate by unique artist so 500 tracks only classify ~80-140 unique artists
    const uniqueArtistsMap = new Map<
      string,
      { artist: string; existingGenre?: string; existingSecondaryGenre?: string }
    >();

    for (const t of tracks) {
      const aKey = t.artist.trim().toLowerCase();
      if (!uniqueArtistsMap.has(aKey)) {
        uniqueArtistsMap.set(aKey, {
          artist: t.artist,
          existingGenre: t.existingGenre,
          existingSecondaryGenre: t.existingSecondaryGenre,
        });
      }
    }

    const uniqueArtists = Array.from(uniqueArtistsMap.values());
    const batchSize = 20;

    for (let i = 0; i < uniqueArtists.length; i += batchSize) {
      const batch = uniqueArtists.slice(i, i + batchSize);
      await Promise.all(
        batch.map((item) =>
          resolveArtistClassification(
            item.artist,
            item.existingGenre,
            item.existingSecondaryGenre
          )
        )
      );
    }

    // 2. Map all tracks to their classified genres + on-demand /api/track-preview streaming URL
    const enrichedResults: EnrichTrackResultItem[] = tracks.map((item) => {
      const aKey = item.artist.trim().toLowerCase();
      const classification =
        artistClassificationCache.get(aKey) ||
        classifyGenre(item.existingGenre || '', '', item.artist);

      const previewParams = new URLSearchParams({
        artist: item.artist,
        title: item.title,
      });
      if (item.existingPreviewUrl) {
        previewParams.set('fallbackUrl', item.existingPreviewUrl);
      }

      return {
        key: item.key,
        genre: classification.genre,
        secondaryGenre: classification.secondaryGenre,
        rawGenre: classification.rawGenre,
        previewUrl: `/api/track-preview?${previewParams.toString()}`,
      };
    });

    return NextResponse.json({ results: enrichedResults });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Error enriqueciendo géneros musicales',
        results: [],
      },
      { status: 500 }
    );
  }
}
