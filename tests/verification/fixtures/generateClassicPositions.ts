// Snapshot of the classic layout positions, generated BEFORE extracting it to
// src/lib/layout/classicLayout.ts (M5.1). The m5_classic_layout test compares against it.
// Only regenerate when the classic layout is meant to change:
//   npx tsx tests/verification/fixtures/generateClassicPositions.ts
import fs from 'node:fs';
import path from 'node:path';
import { buildMusicGalaxyFromPayload, SAMPLE_STREAMING_PAYLOAD } from '../../../src/lib/importers/libraryImporter';
import { GALAXY_PRESET_50, GALAXY_PRESET_150, GALAXY_PRESET_300 } from '../../../src/data/galaxyPresets';
import { MusicGalaxyData } from '../../../src/types/music';
import { SPLIT_ARTIST_PAYLOAD } from './syntheticPayloads';

type Vec3 = [number, number, number];
export interface PositionSnapshot {
  genres: [string, Vec3][];
  artists: [string, string, Vec3][]; // [genreId, id, position] — ids can repeat across genres
  songs: [string, Vec3][];
}

export function snapshotPositions(data: MusicGalaxyData): PositionSnapshot {
  return {
    genres: data.genres.map((g) => [g.id, g.position]),
    artists: data.artists.map((a) => [a.genreId, a.id, a.position]),
    songs: data.songs.map((s) => [s.id, s.position]),
  };
}

if (process.argv[1]?.endsWith('generateClassicPositions.ts')) {
  const snapshot = {
    preset50: snapshotPositions(GALAXY_PRESET_50),
    preset150: snapshotPositions(GALAXY_PRESET_150),
    preset300: snapshotPositions(GALAXY_PRESET_300),
    sampleStreaming: snapshotPositions(buildMusicGalaxyFromPayload(SAMPLE_STREAMING_PAYLOAD)),
    splitArtist: snapshotPositions(buildMusicGalaxyFromPayload(SPLIT_ARTIST_PAYLOAD)),
  };
  const out = path.join(path.dirname(new URL(import.meta.url).pathname), 'classic_positions.json');
  fs.writeFileSync(out, JSON.stringify(snapshot) + '\n');
  console.log(`Wrote ${out}`);
}
