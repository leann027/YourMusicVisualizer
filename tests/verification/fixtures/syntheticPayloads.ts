import { RawLibraryPayload } from '../../../src/lib/importers/libraryImporter';

// Edge case for the classic layout (M5.1): one artist whose tracks land in two genres,
// which makes the importer emit two ArtistNodes with the same id.
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
