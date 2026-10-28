import { RawLibraryPayload } from '../../../src/lib/importers/libraryImporter';

// Edge case for the classic layout (M5.1): one artist whose tracks carry tags of two genres.
// Before A3 the importer emitted two ArtistNodes with the same id; since the dynamic
// classification the artist belongs to one nebula and the other style shows up as bridges.
export const SPLIT_ARTIST_PAYLOAD: RawLibraryPayload = {
  profileName: 'Split Artist Fixture',
  source: 'spotify',
  tracks: [
    { title: 'Warehouse Pulse', artist: 'Nova Split', genre: 'techno minimal', affinity: 0.91 },
    { title: 'Acid Drift', artist: 'Nova Split', genre: 'techno minimal', affinity: 0.84 },
    { title: 'Blue Hour Session', artist: 'Nova Split', genre: 'jazz fusion', affinity: 0.88 },
    { title: 'Late Quartet', artist: 'Nova Split', genre: 'jazz fusion', affinity: 0.79 },
    { title: 'Midnight City', artist: 'M83', genre: 'synthpop', affinity: 0.95 },
    { title: 'Teardrop', artist: 'Massive Attack', genre: 'trip hop', affinity: 0.93 },
  ],
};

// Secondary genre resolution: since A3 bridges emerge from song tags. A song tagged with both
// styles bridges; one tagged only with its own style, or with a style no nebula has, does not.
export const SECONDARY_GENRE_PAYLOAD: RawLibraryPayload = {
  profileName: 'Secondary Genre Fixture',
  source: 'spotify',
  tracks: [
    { title: 'Bridge Song', artist: 'Crosser', genre: 'techno minimal', trackTags: [{ name: 'techno minimal', weight: 100 }, { name: 'jazz fusion', weight: 100 }] },
    { title: 'Home Song', artist: 'Crosser', genre: 'techno minimal', trackTags: [{ name: 'techno minimal', weight: 100 }] },
    { title: 'Lost Song', artist: 'Crosser', genre: 'techno minimal', trackTags: [{ name: 'polka espacial', weight: 100 }] },
    { title: 'Plain Song', artist: 'Quartet Nine', genre: 'jazz fusion' },
    { title: 'Second Jazz', artist: 'Quartet Nine', genre: 'jazz fusion' },
    { title: 'Third Jazz', artist: 'Quartet Nine', genre: 'jazz fusion' }, // 3 songs: not a tiny group
    { title: 'Second Techno', artist: 'Crosser', genre: 'techno minimal' },
  ],
};
