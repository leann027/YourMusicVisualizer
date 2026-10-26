/**
 * High-Speed 0ms Universal Music Classifier (`genreClassifier.ts`).
 *
 * Classifies artists and tracks into 20 canonical musical constellations with
 * zero network delay, guaranteeing balanced, rich clustering for libraries
 * scaling from 40 to 3,000+ tracks.
 */

export interface GenreClassification {
  genre: string;
  secondaryGenre: string;
  rawGenre: string;
}

export const CANONICAL_GENRES: Record<string, { sister: string; description: string }> = {
  'SYNTHWAVE & FRENCH TOUCH': {
    sister: 'ELECTRÓNICA, HOUSE & TECHNO',
    description: 'Pulsos analógicos, arpegios retrofuturistas y vocoders espaciales.',
  },
  'ELECTRÓNICA, HOUSE & TECHNO': {
    sister: 'SYNTHWAVE & FRENCH TOUCH',
    description: 'Bombos en cuatro cuartos, sintetizadores modulares y dinámicas de club.',
  },
  'IDM & AMBIENT EXPERIMENTAL': {
    sister: 'TRIP-HOP, DOWNTEMPO & DUB',
    description: 'Ritmos polimétricos, síntesis granular y paisajes sonoros etéreos.',
  },
  'TRIP-HOP, DOWNTEMPO & DUB': {
    sister: 'IDM & AMBIENT EXPERIMENTAL',
    description: 'Líneas de bajo sub-graves, samples de vinilo y atmósferas cinematográficas.',
  },
  'ART ROCK & SHOEGAZE': {
    sister: 'INDIE ROCK & POST-PUNK',
    description: 'Muros de guitarras con reverberación profunda y dinámicas expansivas.',
  },
  'INDIE ROCK & POST-PUNK': {
    sister: 'ART ROCK & SHOEGAZE',
    description: 'Bajos punzantes, guitarras angulares y ritmos de batería urgentes.',
  },
  'ROCK CLÁSICO & PSICODELIA': {
    sister: 'HARD ROCK & HEAVY METAL',
    description: 'Solos virtuosos, órganos hammond y experimentación lisérgica.',
  },
  'HARD ROCK & HEAVY METAL': {
    sister: 'ROCK CLÁSICO & PSICODELIA',
    description: 'Riffs saturados, doble bombo y voces de alta intensidad.',
  },
  'PUNK, GRUNGE & EMO': {
    sister: 'HARD ROCK & HEAVY METAL',
    description: 'Distorsión visceral, potencia cruda y melodías confesionales.',
  },
  'DREAM POP & PSYCHEDELIA': {
    sister: 'ART ROCK & SHOEGAZE',
    description: 'Capas de ensueño, guitarras con chorus y melodías flotantes.',
  },
  'POP INTERNACIONAL & SYNTH-POP': {
    sister: 'R&B, SOUL, FUNK & DISCO',
    description: 'Ganchos memorables, producción pulida y ritmos bailables globales.',
  },
  'URBANO, TRAP & REGGAETÓN': {
    sister: 'HIP-HOP, RAP & BOOM BAP',
    description: 'Sub-bajos 808 rodantes, percusiones sincopadas y flow rítmico.',
  },
  'HIP-HOP, RAP & BOOM BAP': {
    sister: 'URBANO, TRAP & REGGAETÓN',
    description: 'Bombos secos, redoblantes con swing y líricas poéticas complejas.',
  },
  'R&B, SOUL, FUNK & DISCO': {
    sister: 'POP INTERNACIONAL & SYNTH-POP',
    description: 'Bajos sincopados contagiosos, bronces brillantes y voces de terciopelo.',
  },
  'ROCK NACIONAL & ARGENTINO': {
    sister: 'ROCK CLÁSICO & PSICODELIA',
    description: 'Guitarras con identidad rioplatense, poesía urbana y armonías emblemáticas.',
  },
  'CUMBIA, CUARTETO & TROPICAL': {
    sister: 'POP LATINO & BALADA',
    description: 'Güiros vibrantes, pianos en tumbao y vientos caribeños y cordobeses.',
  },
  'POP LATINO & BALADA': {
    sister: 'CUMBIA, CUARTETO & TROPICAL',
    description: 'Sensibilidad melódica en español, instrumentación acústica y líricas románticas.',
  },
  'REGGAE, SKA & MESTIZO': {
    sister: 'ROCK NACIONAL & ARGENTINO',
    description: 'Golpes de guitarra en contratiempo, bajos profundos y mensajes de resistencia.',
  },
  'JAZZ, BLUES & FOLK': {
    sister: 'R&B, SOUL, FUNK & DISCO',
    description: 'Improvisación armónica, swing atemporal y calidez instrumental acústica.',
  },
  'MÚSICA CLÁSICA & SOUNDTRACK': {
    sister: 'IDM & AMBIENT EXPERIMENTAL',
    description: 'Composiciones orquestales, crescendos cinemáticos y atmósferas evocativas.',
  },
  'J-POP, J-ROCK & ANIME': {
    sister: 'SYNTHWAVE & FRENCH TOUCH',
    description: 'Melodías dinámicas, rock nipón, aperturas de anime, city pop y producciones vocales japonesas.',
  },
};

export const ALL_CANONICAL_GENRES = Object.keys(CANONICAL_GENRES);

/**
 * Universal global genres safely used for deterministic hashing fallbacks.
 * Regional / culture-specific genres (e.g. 'ROCK NACIONAL & ARGENTINO',
 * 'CUMBIA, CUARTETO & TROPICAL', 'POP LATINO & BALADA', 'J-POP, J-ROCK & ANIME')
 * are strictly EXCLUDED from blind fallbacks so unfamiliar foreign tracks
 * are NEVER erroneously classified into regional categories.
 */
export const UNIVERSAL_FALLBACK_GENRES = [
  'POP INTERNACIONAL & SYNTH-POP',
  'INDIE ROCK & POST-PUNK',
  'ELECTRÓNICA, HOUSE & TECHNO',
  'SYNTHWAVE & FRENCH TOUCH',
  'ART ROCK & SHOEGAZE',
  'ROCK CLÁSICO & PSICODELIA',
  'IDM & AMBIENT EXPERIMENTAL',
  'TRIP-HOP, DOWNTEMPO & DUB',
  'R&B, SOUL, FUNK & DISCO',
  'HARD ROCK & HEAVY METAL',
  'DREAM POP & PSYCHEDELIA',
  'HIP-HOP, RAP & BOOM BAP',
  'JAZZ, BLUES & FOLK',
];

/**
 * Regular expression matching Japanese / CJK scripts:
 * Hiragana (\u3040-\u309F), Katakana (\u30A0-\u30FF),
 * CJK Unified Ideographs / Kanji (\u4E00-\u9FAF, \u3400-\u4DBF),
 * Halfwidth/Fullwidth Katakana (\uFF66-\uFF9F).
 */
export const JAPANESE_SCRIPT_REGEX = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9faf\uff66-\uff9f]/;

function matchesPattern(text: string, pattern: string): boolean {
  if (text === pattern) return true;
  if (pattern.length <= 4) {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|\\s)${escaped}(\\s|$)`, 'i').test(text);
  }
  return text.includes(pattern);
}

const INSTANT_ARTIST_PATTERNS: Array<{
  patterns: string[];
  genre: string;
  secondaryGenre: string;
}> = [
  // 1. Rock Nacional & Argentino
  {
    patterns: [
      'soda stereo', 'gustavo cerati', 'cerati', 'spinetta', 'almendra', 'pescado rabioso',
      'invisible', 'spinetta jade', 'charly garcia', 'charly garcía', 'sui generis', 'serú girán',
      'seru giran', 'la máquina de hacer pájaros', 'fito paez', 'fito páez', 'andrés calamaro',
      'andres calamaro', 'los abuelos de la nada', 'virus', 'sumo', 'divididos', 'las pelotas',
      'patricio rey', 'redonditos de ricota', 'redondos', 'indio solari', 'skay beilinson',
      'la renga', 'pappo', 'riff', 'ratones paranoicos', 'viejas locas', 'intoxicados',
      'pity alvarez', 'callejeros', 'don osvaldo', 'los piojos', 'ciro y los persas',
      'bersuit', 'babasónicos', 'babasonicos', 'turf', 'estelares', 'guasones', 'la beriso',
      'las pastillas del abuelo', 'el bordo', 'pier', 'airbag', 'tan biónica', 'tan bionica',
      'miranda!', 'catupecu machu', 'el mató a un policía motorizado', 'el mato a un policia motorizado',
      'usted señalemelo', 'bandalos chinos', 'conociendo rusia', 'marilina bertoldi',
      'eruca sativa', 'nafta', 'el kuelgue', 'cruzando el charco', 'el plan de la mariposa',
      'la vela puerca', 'no te va gustar', 'el cuarteto de nos', 'cuarteto de nos', 'buitres',
      'leon gieco', 'león gieco', 'pedro aznar', 'david lebón', 'fabiana cantilo',
      'attaque 77', '2 minutos', 'flema', 'bulldog', 'cadena perpetua', 'carajo', 'almafuerte',
      'hermética', 'hermetica', 'v8', 'rata blanca', 'horcas',
    ],
    genre: 'ROCK NACIONAL & ARGENTINO',
    secondaryGenre: 'ROCK CLÁSICO & PSICODELIA',
  },
  // 2. Synthwave & French Touch
  {
    patterns: [
      'daft punk', 'kavinsky', 'justice', 'gesaffelstein', 'carpenter brut', 'perturbator',
      'gunship', 'the midnight', 'synthwave', 'danger', 'sebastiAn', 'breakbot', 'cassius',
      'modjo', 'stardust', 'timecop1983', 'fm-84', 'lazerhawk', 'mitch murder', 'com trise',
    ],
    genre: 'SYNTHWAVE & FRENCH TOUCH',
    secondaryGenre: 'ELECTRÓNICA, HOUSE & TECHNO',
  },
  // 3. Electrónica, House & Techno
  {
    patterns: [
      'chemical brothers', 'the prodigy', 'fatboy slim', 'underworld', 'orbital', 'bicep',
      'disclosure', 'flume', 'odesza', 'rüfüs du sol', 'rufus du sol', 'fred again', 'skrillex',
      'deadmau5', 'avicii', 'calvin harris', 'david guetta', 'tiësto', 'tiesto', 'armin van buuren',
      'swedish house mafia', 'eric prydz', 'charlotte de witte', 'amelie lens', 'peggy gou',
      'kaytranada', 'kraftwerk', 'jean-michel jarre', 'giorgio moroder', 'lcd soundsystem',
      'gorillaz', 'pendulum', 'sub focus', 'chase & status', 'noisia', 'hernan cattaneo',
      'jamie xx', 'caribou', 'four tet', 'bonobo',
    ],
    genre: 'ELECTRÓNICA, HOUSE & TECHNO',
    secondaryGenre: 'SYNTHWAVE & FRENCH TOUCH',
  },
  // 4. IDM & Ambient
  {
    patterns: [
      'aphex twin', 'boards of canada', 'burial', 'autechre', 'squarepusher', 'brian eno',
      'stars of the lid', 'tim hecker', 'william basinski', 'tycho', 'jon hopkins',
      'oneohtrix point never', 'floating points', 'clark', 'plaid', 'fennesz', 'alva noto',
    ],
    genre: 'IDM & AMBIENT EXPERIMENTAL',
    secondaryGenre: 'TRIP-HOP, DOWNTEMPO & DUB',
  },
  // 5. Trip-Hop & Dub
  {
    patterns: [
      'massive attack', 'portishead', 'tricky', 'morcheeba', 'thievery corporation', 'zero 7',
      'air', 'sneaker pimps', 'smoke city', 'dj shadow', 'kruder & dorfmeister', 'nightmares on wax',
      'bonobo', 'wax tailor', 'blockhead', 'rjd2',
    ],
    genre: 'TRIP-HOP, DOWNTEMPO & DUB',
    secondaryGenre: 'IDM & AMBIENT EXPERIMENTAL',
  },
  // 6. Hard Rock & Heavy Metal
  {
    patterns: [
      'metallica', 'iron maiden', 'black sabbath', 'megadeth', 'slayer', 'pantera', 'judas priest',
      'ozzy osbourne', 'motörhead', 'motorhead', 'system of a down', 'slipknot', 'korn',
      'deftones', 'limp bizkit', 'linkin park', 'disturbed', 'avenged sevenfold', 'tool',
      'rage against the machine', 'rammstein', 'sepultura', 'gojira', 'mastodon', 'opeth',
      'dream theater', 'nightwish', 'epica', 'ghost', 'bring me the horizon', 'architects',
      'bullet for my valentine', 'killswitch engage', 'lamb of god', 'trivium', 'evanescence',
    ],
    genre: 'HARD ROCK & HEAVY METAL',
    secondaryGenre: 'PUNK, GRUNGE & EMO',
  },
  // 7. Punk, Grunge & Emo
  {
    patterns: [
      'nirvana', 'pearl jam', 'soundgarden', 'alice in chains', 'stone temple pilots',
      'foo fighters', 'green day', 'the offspring', 'blink-182', 'sum 41', 'ramones',
      'sex pistols', 'the clash', 'misfits', 'bad religion', 'nofx', 'rancid', 'rise against',
      'my chemical romance', 'paramore', 'fall out boy', 'panic! at the disco', 'weezer',
      'the used', 'taking back sunday', 'jimmy eat world', 'silverstein', 'afi',
    ],
    genre: 'PUNK, GRUNGE & EMO',
    secondaryGenre: 'HARD ROCK & HEAVY METAL',
  },
  // 8. Rock Clásico & Psicodelia
  {
    patterns: [
      'the beatles', 'pink floyd', 'led zeppelin', 'queen', 'the rolling stones', 'david bowie',
      'the doors', 'jimi hendrix', 'creedence', 'dire straits', 'the who', 'fleetwood mac',
      'eric clapton', 'bruce springsteen', 'bob dylan', 'tom petty', 'eagles', 'santana',
      'supertramp', 'genesis', 'phil collins', 'yes', 'king crimson', 'elton john', 'billy joel',
      'the police', 'sting', 'u2', 'inxs', 'toto', 'journey', 'boston', 'kansas', 'deep purple',
      'ac/dc', 'acdc', 'guns n roses', 'guns n\' roses', 'aerosmith',
    ],
    genre: 'ROCK CLÁSICO & PSICODELIA',
    secondaryGenre: 'ART ROCK & SHOEGAZE',
  },
  // 9. Art Rock & Shoegaze
  {
    patterns: [
      'radiohead', 'thom yorke', 'the smile', 'my bloody valentine', 'slowdive', 'ride',
      'cocteau twins', 'lush', 'chapterhouse', 'swervedriver', 'deafheaven', 'smashing pumpkins',
      'placebo', 'muse', 'sigur rós', 'sigur ros', 'björk', 'bjork', 'mogwai', 'explosions in the sky',
      'godspeed you! black emperor', 'sonic youth', 'pixies',
    ],
    genre: 'ART ROCK & SHOEGAZE',
    secondaryGenre: 'INDIE ROCK & POST-PUNK',
  },
  // 10. Indie Rock & Post-Punk
  {
    patterns: [
      'arctic monkeys', 'the strokes', 'interpol', 'franz ferdinand', 'the killers',
      'kasabian', 'oasis', 'blur', 'pulp', 'the smiths', 'morrissey', 'joy division',
      'new order', 'the cure', 'siouxsie', 'bauhaus', 'echo & the bunnymen', 'talking heads',
      'arcade fire', 'vampire weekend', 'yeah yeah yeahs', 'bloc party', 'foals',
      'two door cinema club', 'the kooks', 'cage the elephant', 'mgmt', 'foster the people',
      'phoenix', 'the national', 'fontaines d.c.', 'idles', 'black midi', 'wet leg', 'wolf alice',
    ],
    genre: 'INDIE ROCK & POST-PUNK',
    secondaryGenre: 'DREAM POP & PSYCHEDELIA',
  },
  // 11. Dream Pop & Psychedelia
  {
    patterns: [
      'tame impala', 'beach house', 'mazzy star', 'cigarettes after sex', 'men i trust',
      'mac demarco', 'clairo', 'beabadoobee', 'alvvays', 'khruangbin', 'crumb', 'boy pablo',
      'cuco', 'the marías', 'the marias', 'kali uchis', 'lana del rey', 'lorde', 'mitski',
      'phoebe bridgers', 'bon iver', 'sufjan stevens', 'fleet foxes', 'depeche mode',
      'tears for fears', 'duran duran', 'a-ha', 'pet shop boys',
    ],
    genre: 'DREAM POP & PSYCHEDELIA',
    secondaryGenre: 'ART ROCK & SHOEGAZE',
  },
  // 12. Urbano, Trap & Reggaetón
  {
    patterns: [
      'duki', 'bizarrap', 'bzrp', 'ysy a', 'neo pistea', 'cro', 'c.r.o', 'khea', 'nicki nicole',
      'trueno', 'tiago pzk', 'lit killah', 'maria becerra', 'maría becerra', 'emilia', 'tini',
      'milo j', 'bhavi', 'ca7riel', 'paco amoroso', 'dillom', 'bad bunny', 'j balvin',
      'daddy yankee', 'don omar', 'tego calderón', 'wisin', 'yandel', 'ozuna', 'anuel aa',
      'rauw alejandro', 'feid', 'karol g', 'maluma', 'myke towers', 'jhayco', 'mora',
      'eladio carrion', 'arcángel', 'arcangel', 'nicky jam', 'farruko', 'sech', 'quevedo',
      'rosalía', 'rosalia', 'c. tangana', 'rels b', 'paulo londra', 'lgante', 'l-gante',
    ],
    genre: 'URBANO, TRAP & REGGAETÓN',
    secondaryGenre: 'HIP-HOP, RAP & BOOM BAP',
  },
  // 13. Hip-Hop, Rap & Boom Bap
  {
    patterns: [
      'wos', 'acru', 'fianru', 'kamada', 'canserbero', 'alcolirykoz', 'violadores del verso',
      'kase.o', 'nach', 'sfdk', 'eminem', 'kendrick lamar', 'kanye west', 'jay-z', 'nas',
      'notorious b.i.g.', '2pac', 'tupac', 'dr. dre', 'snoop dogg', 'wu-tang clan',
      'a tribe called quest', 'outkast', '50 cent', 'travis scott', 'drake', 'j. cole',
      'tyler, the creator', 'asap rocky', 'future', 'metro boomin', 'post malone', 'mac miller',
      'mf doom', 'cypress hill', 'beastie boys', 'run-d.m.c.',
    ],
    genre: 'HIP-HOP, RAP & BOOM BAP',
    secondaryGenre: 'URBANO, TRAP & REGGAETÓN',
  },
  // 14. Pop Internacional & Synth-Pop
  {
    patterns: [
      'michael jackson', 'madonna', 'prince', 'whitney houston', 'george michael', 'abba',
      'bee gees', 'dua lipa', 'the weeknd', 'bruno mars', 'lady gaga', 'taylor swift',
      'billie eilish', 'harry styles', 'olivia rodrigo', 'sabrina carpenter', 'ariana grande',
      'rihanna', 'beyoncé', 'beyonce', 'justin timberlake', 'britney spears', 'katy perry',
      'adele', 'ed sheeran', 'coldplay', 'maroon 5', 'imagine dragons', 'charlie puth',
      'charli xcx', 'troye sivan', 'kylie minogue',
    ],
    genre: 'POP INTERNACIONAL & SYNTH-POP',
    secondaryGenre: 'R&B, SOUL, FUNK & DISCO',
  },
  // 15. R&B, Soul, Funk & Disco
  {
    patterns: [
      'stevie wonder', 'marvin gaye', 'aretha franklin', 'james brown', 'earth, wind & fire',
      'kool & the gang', 'chic', 'nile rodgers', 'donna summer', 'sade', 'erykah badu',
      'lauryn hill', 'd\'angelo', 'frank ocean', 'sza', 'daniel caesar', 'usher', 'alicia keys',
      'amy winehouse', 'childish gambino', 'anderson .paak', 'silk sonic', 'thundercat',
      'vulfpeck', 'parcels', 'l\'impératrice', 'jungle', 'jamiroquai',
    ],
    genre: 'R&B, SOUL, FUNK & DISCO',
    secondaryGenre: 'POP INTERNACIONAL & SYNTH-POP',
  },
  // 16. Cumbia, Cuarteto & Tropical
  {
    patterns: [
      'los palmeras', 'damas gratis', 'pablo lescano', 'yerba brava', 'pibes chorros',
      'mala fama', 'supermerk2', 'amar azul', 'ráfaga', 'rafaga', 'gilda', 'rodrigo',
      'la mona jiménez', 'la mona jimenez', 'ulises bueno', 'la k\'onga', 'la konga',
      'luck ra', 'q\' lokura', 'q lokura', 'banda xxi', 'los auténticos decadentes',
      'los autenticos decadentes', 'kapanga', 'ke personajes', 'la t y la m',
      'los ángeles azules', 'los angeles azules', 'romeo santos', 'aventura', 'juan luis guerra',
      'marc anthony', 'celia cruz', 'rubén blades', 'willie colón', 'hector lavoe',
    ],
    genre: 'CUMBIA, CUARTETO & TROPICAL',
    secondaryGenre: 'POP LATINO & BALADA',
  },
  // 17. Pop Latino & Balada
  {
    patterns: [
      'shakira', 'luis miguel', 'chayanne', 'ricky martin', 'enrique iglesias', 'juanes',
      'maná', 'mana', 'julieta venegas', 'natalia lafourcade', 'mon laferte', 'jorge drexler',
      'alejandro sanz', 'joaquín sabina', 'joaquin sabina', 'joan manuel serrat', 'ricardo arjona',
      'camilo', 'morat', 'reik', 'sin bandera', 'camila', 'jesse & joy', 'marco antonio solis',
      'sandro', 'abel pintos', 'luciano pereyra', 'lali', 'zoé', 'zoe', 'café tacvba', 'cafe tacvba',
    ],
    genre: 'POP LATINO & BALADA',
    secondaryGenre: 'ROCK NACIONAL & ARGENTINO',
  },
  // 18. Reggae, Ska & Mestizo
  {
    patterns: [
      'los cafres', 'los pericos', 'nonpalidece', 'dread mar i', 'gondwana', 'cultura profética',
      'cultura profetica', 'fidel nadal', 'todos tus muertos', 'dancing mood', 'los fabulosos cadillacs',
      'fabulosos cadillacs', 'vicentico', 'mano negra', 'manu chao', 'bob marley', 'peter tosh',
      'jimmy cliff', 'ub40', 'sublime', 'no doubt', 'madness', 'the specials', 'skatalites',
    ],
    genre: 'REGGAE, SKA & MESTIZO',
    secondaryGenre: 'ROCK NACIONAL & ARGENTINO',
  },
  // 19. Jazz, Blues & Folk
  {
    patterns: [
      'miles davis', 'john coltrane', 'bill evans', 'chet baker', 'herbie hancock',
      'nina simone', 'ella fitzgerald', 'louis armstrong', 'frank sinatra', 'b.b. king',
      'muddy waters', 'stevie ray vaughan', 'gary moore', 'joe bonamassa', 'astor piazzolla',
      'mercedes sosa', 'atahualpa yupanqui', 'horacio guarany', 'los chalchaleros',
      'chaqueño palavecino', 'norah jones', 'ray charles',
    ],
    genre: 'JAZZ, BLUES & FOLK',
    secondaryGenre: 'R&B, SOUL, FUNK & DISCO',
  },
  // 20. Música Clásica & Soundtrack
  {
    patterns: [
      'hans zimmer', 'john williams', 'ennio morricone', 'gustavo santaolalla', 'ludovico einaudi',
      'vangelis', 'max richter', 'beethoven', 'mozart', 'bach', 'chopin', 'debussy', 'tchaikovsky',
      'brahms', 'ravel', 'vivaldi', 'philip glass',
    ],
    genre: 'MÚSICA CLÁSICA & SOUNDTRACK',
    secondaryGenre: 'IDM & AMBIENT EXPERIMENTAL',
  },
  // 21. J-Pop, J-Rock & Anime
  {
    patterns: [
      'yoasobi', 'radwimps', 'kenshi yonezu', 'yonezu kenshi', 'lisa', 'ado', 'king gnu',
      'eve', 'one ok rock', 'babymetal', 'asian kung-fu generation', 'asian kung fu generation',
      'lamp', 'casiopea', 'tatsuro yamashita', 'mariya takeuchi', 'fujii kaze', 'vaundy',
      'mrs. green apple', 'mrs green apple', 'official hige dandism', 'official higedandism',
      'yorushika', 'zutomayo', 'zutto mayonaka de iinoni', 'minami', 'aimer', 'flow',
      'spyair', 'kana-boon', 'the pillows', 'maximum the hormone', 'polkadot stingray',
      'frederic', 'kana nishino', 'kyary pamyu pamyu', 'utada hikaru', 'hikaru utada',
      'ayumi hamasaki', 'namie amuro', 'perfume', 'wednesday campanella', 'atarashii gakko',
      'atarashii gakko!', 'toe', 'tricot', 'boris', 'melt-banana', 'mid-air thief', 'fishmans',
      'cornelius', 'shintaro sakamoto', 'haruomi hosono', 'taeko onuki', 'taeko ohnuki',
      'junko ohashi', 'anri', 'miki matsubara', 'masayoshi takanaka', 'toshiki kadomatsu',
      'hatsune miku', 'kikuo', 'wowaka', 'maretu', 'deco*27', 'tuyu', 'inabakumori',
      'pinocchiop', 'syudou', 'kanaria', 'chinozo', 'tatsuya kitani', 'creepy nuts',
      'burnout syndromes', 'ling tosite sigure', 'tk from ling tosite sigure', 'uverworld',
      'man with a mission', 'granrodeo', 'egoist', 'supercell', 'claris', 'myth & roid',
      'reona', 'sawanohiroyuki[nzk]', 'hiroyuki sawano', 'yuki kajiura', 'yoko kanno',
      'joe hisaishi', 'ryuichi sakamoto', 'yellow magic orchestra', 'ymo', 'sheena ringo',
      'shiina ringo', 'tokyo jihen', 'chilli beans.', 'daoko', 'reol', 'asian kung-fu', 'kanaboon',
      'fhána', 'fhana', 'unison square garden', 'survive said the prophet', 'myth and roid',
      'scandal', 'band-maid', 'boowy', 'x japan', 'buck-tick', 'l\'arc-en-ciel', 'glay',
      'dir en grey', 'the gazette', 'miyavi', 'gackt', 'hyde', 'the oral cigarettes',
      'blue encount', 'wanima', 'novelbright', 'saucy dog', 'macaroni empitsu',
      'tani yuuki', 'gen hoshino', 'suda masaki', 'masaki suda', 'ryokuoushoku shakai',
      'yama', 'yuuri', 'uru', 'milet', 'asca', 'halca', 'honeyworks', 'fripside',
      'angela', 'jam project', 'oldcodex', 'my first story', 'coldrain', 'crossfaith',
      'crystal lake', 'hanabie.', 'nemophila', 'lovebites', 'aldious', 'nujabes',
      'uyama hiroto', 'dj krush', 'ken ishii', 'susumu hirasawa', 'p-model', 'the seatbelts',
      'bradio', 'co shu nie', 'cö shu nie', 'galileo galilei', 'back number',
      'sekai no owari', 'end of the world', 'alexandros', '[alexandros]',
    ],
    genre: 'J-POP, J-ROCK & ANIME',
    secondaryGenre: 'SYNTHWAVE & FRENCH TOUCH',
  },
];

function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Universal classifier matching artist name, album, or raw genre tag against
 * the instant knowledge base, CJK script detection, and keyword heuristics.
 */
export function classifyUniversalMusic(
  artistName: string,
  rawGenreText?: string,
  trackTitle?: string
): GenreClassification {
  const a = (artistName || '').trim().toLowerCase();
  const g = (rawGenreText || '').trim().toLowerCase();
  const t = (trackTitle || '').trim().toLowerCase();
  const combined = `${a} ${g} ${t}`;

  // 1. Script Analysis: If the artist name, song title, or raw genre contains Japanese/CJK characters,
  // it is definitively Japanese / East Asian music. Route directly to 'J-POP, J-ROCK & ANIME'
  // (unless explicit classical/ambient cues are present), completely avoiding any regional misclassification.
  const hasJapaneseScript =
    JAPANESE_SCRIPT_REGEX.test(artistName || '') ||
    JAPANESE_SCRIPT_REGEX.test(trackTitle || '') ||
    JAPANESE_SCRIPT_REGEX.test(rawGenreText || '');

  if (hasJapaneseScript) {
    if (combined.includes('classical') || combined.includes('orchestral') || combined.includes('soundtrack')) {
      return {
        genre: 'MÚSICA CLÁSICA & SOUNDTRACK',
        secondaryGenre: 'J-POP, J-ROCK & ANIME',
        rawGenre: rawGenreText || 'Soundtrack / Anime OST',
      };
    }
    if (combined.includes('ambient') || combined.includes('idm')) {
      return {
        genre: 'IDM & AMBIENT EXPERIMENTAL',
        secondaryGenre: 'J-POP, J-ROCK & ANIME',
        rawGenre: rawGenreText || 'Japanese Ambient',
      };
    }
    return {
      genre: 'J-POP, J-ROCK & ANIME',
      secondaryGenre: combined.includes('rock') || combined.includes('metal') ? 'INDIE ROCK & POST-PUNK' : 'SYNTHWAVE & FRENCH TOUCH',
      rawGenre: rawGenreText || 'J-Pop / J-Rock / Anime',
    };
  }

  // 2. Direct Pattern Match against curated 400+ artist dictionary (with word-boundary protection)
  for (const entry of INSTANT_ARTIST_PATTERNS) {
    if (entry.patterns.some((p) => matchesPattern(a, p))) {
      return {
        genre: entry.genre,
        secondaryGenre: entry.secondaryGenre,
        rawGenre: rawGenreText || entry.genre,
      };
    }
  }

  // 3. Keyword heuristic analysis across combined metadata
  let matchedGenre = '';

  if (
    combined.includes('j-pop') ||
    combined.includes('jpop') ||
    combined.includes('j-rock') ||
    combined.includes('jrock') ||
    combined.includes('j-metal') ||
    combined.includes('anime') ||
    combined.includes('anisong') ||
    combined.includes('anison') ||
    combined.includes('city pop') ||
    combined.includes('citypop') ||
    combined.includes('vocaloid') ||
    combined.includes('utaite') ||
    combined.includes('shibuya-kei') ||
    combined.includes('doujin') ||
    combined.includes('touhou') ||
    combined.includes('visual kei') ||
    combined.includes('v-kei') ||
    combined.includes('japanese') ||
    combined.includes('kayokyoku') ||
    combined.includes('enka')
  ) {
    matchedGenre = 'J-POP, J-ROCK & ANIME';
  } else if (
    combined.includes('synthwave') ||
    combined.includes('retrowave') ||
    combined.includes('french touch') ||
    combined.includes('darksynth')
  ) {
    matchedGenre = 'SYNTHWAVE & FRENCH TOUCH';
  } else if (
    combined.includes('ambient') ||
    combined.includes('idm') ||
    combined.includes('glitch') ||
    combined.includes('drone')
  ) {
    matchedGenre = 'IDM & AMBIENT EXPERIMENTAL';
  } else if (
    combined.includes('trip-hop') ||
    combined.includes('trip hop') ||
    combined.includes('downtempo') ||
    combined.includes('lo-fi') ||
    combined.includes('dub')
  ) {
    matchedGenre = 'TRIP-HOP, DOWNTEMPO & DUB';
  } else if (
    combined.includes('metal') ||
    combined.includes('heavy') ||
    combined.includes('death') ||
    combined.includes('thrash') ||
    combined.includes('black metal')
  ) {
    matchedGenre = 'HARD ROCK & HEAVY METAL';
  } else if (
    combined.includes('punk') ||
    combined.includes('grunge') ||
    combined.includes('hardcore') ||
    combined.includes('emo')
  ) {
    matchedGenre = 'PUNK, GRUNGE & EMO';
  } else if (
    combined.includes('shoegaze') ||
    combined.includes('dream pop') ||
    combined.includes('ethereal')
  ) {
    matchedGenre = 'DREAM POP & PSYCHEDELIA';
  } else if (
    combined.includes('post-punk') ||
    combined.includes('indie rock') ||
    combined.includes('britpop') ||
    combined.includes('alternative')
  ) {
    matchedGenre = 'INDIE ROCK & POST-PUNK';
  } else if (
    combined.includes('trap') ||
    combined.includes('reggaeton') ||
    combined.includes('reggaetón') ||
    combined.includes('dembow') ||
    combined.includes('rkt') ||
    combined.includes('urbano')
  ) {
    matchedGenre = 'URBANO, TRAP & REGGAETÓN';
  } else if (
    combined.includes('hip-hop') ||
    combined.includes('hip hop') ||
    combined.includes('rap') ||
    combined.includes('boom bap')
  ) {
    matchedGenre = 'HIP-HOP, RAP & BOOM BAP';
  } else if (
    combined.includes('cumbia') ||
    combined.includes('cuarteto') ||
    combined.includes('bachata') ||
    combined.includes('salsa') ||
    combined.includes('tropical')
  ) {
    matchedGenre = 'CUMBIA, CUARTETO & TROPICAL';
  } else if (
    combined.includes('reggae') ||
    combined.includes('ska') ||
    combined.includes('mestizo')
  ) {
    matchedGenre = 'REGGAE, SKA & MESTIZO';
  } else if (
    combined.includes('techno') ||
    combined.includes('house') ||
    combined.includes('electro') ||
    combined.includes('dance') ||
    combined.includes('edm') ||
    combined.includes('trance')
  ) {
    matchedGenre = 'ELECTRÓNICA, HOUSE & TECHNO';
  } else if (
    combined.includes('funk') ||
    combined.includes('soul') ||
    combined.includes('disco') ||
    combined.includes('r&b')
  ) {
    matchedGenre = 'R&B, SOUL, FUNK & DISCO';
  } else if (
    combined.includes('jazz') ||
    combined.includes('blues') ||
    combined.includes('folk') ||
    combined.includes('country') ||
    combined.includes('acoustic')
  ) {
    matchedGenre = 'JAZZ, BLUES & FOLK';
  } else if (
    combined.includes('soundtrack') ||
    combined.includes('classical') ||
    combined.includes('clasica') ||
    combined.includes('orchestral')
  ) {
    matchedGenre = 'MÚSICA CLÁSICA & SOUNDTRACK';
  } else if (
    combined.includes('rock nacional') ||
    combined.includes('rock argentino') ||
    combined.includes('rock rioplatense')
  ) {
    matchedGenre = 'ROCK NACIONAL & ARGENTINO';
  } else if (
    combined.includes('pop latino') ||
    combined.includes('balada') ||
    combined.includes('latino')
  ) {
    matchedGenre = 'POP LATINO & BALADA';
  } else if (combined.includes('pop')) {
    matchedGenre = 'POP INTERNACIONAL & SYNTH-POP';
  } else if (combined.includes('rock') || combined.includes('psychedelic')) {
    matchedGenre = 'ROCK CLÁSICO & PSICODELIA';
  }

  // 4. Safe Universal Distribution Fallback:
  // Distributes unfamiliar artists evenly across UNIVERSAL global genres.
  // Regional genres ('ROCK NACIONAL & ARGENTINO', 'CUMBIA, CUARTETO & TROPICAL', etc.)
  // are never picked here, preventing unintended cross-cultural leaks.
  if (!matchedGenre) {
    const idx = hashStr(a || 'music') % UNIVERSAL_FALLBACK_GENRES.length;
    matchedGenre = UNIVERSAL_FALLBACK_GENRES[idx];
  }

  const sister = CANONICAL_GENRES[matchedGenre]?.sister || 'ROCK CLÁSICO & PSICODELIA';

  return {
    genre: matchedGenre,
    secondaryGenre: sister,
    rawGenre: rawGenreText || matchedGenre,
  };
}
