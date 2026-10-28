import { artistTagProfile, songTagProfile } from '../../../src/lib/music/tagModel';
import { classifyLibrary, LibraryClassification } from '../../../src/lib/music/dynamicGenres';
import { SyntheticArtist } from './syntheticLibraries';

/** Runs the classifier on a synthetic library and measures it against the ground truth. */
export function runClassification(library: SyntheticArtist[]) {
  const t0 = performance.now();
  const result: LibraryClassification = classifyLibrary({
    artists: library.map((a) => ({
      id: a.id,
      songCount: a.songs.length,
      profile: artistTagProfile({ spotifyGenres: a.spotifyGenres, artistTags: a.artistTags, trackTags: a.songs.map((s) => s.tags) }),
    })),
    songs: library.flatMap((a) => a.songs.map((s) => ({ id: s.id, artistId: a.id, profile: songTagProfile(s.tags) }))),
  });
  const ms = performance.now() - t0;
  const styleOf = new Map(library.map((a) => [a.id, a.style]));
  // purity: share of artists whose nebula's majority style is their own
  let pure = 0;
  const composition = result.genres.map((g) => {
    const counts = new Map<string, number>();
    for (const id of g.artistIds) counts.set(styleOf.get(id)!, (counts.get(styleOf.get(id)!) ?? 0) + 1);
    const [major, majorCount] = [...counts.entries()].sort((x, y) => y[1] - x[1])[0];
    pure += majorCount;
    return { name: g.name, major, counts: Object.fromEntries(counts), size: g.artistIds.length };
  });
  const purity = pure / library.length;
  // bridges: expected secondary style vs the majority style of the assigned bridge genre
  const majorOf = new Map(composition.map((c) => [c.name, c.major]));
  const bridgeSongs = library.flatMap((a) => a.songs.filter((s) => s.bridgeStyle));
  const bridgesOk = bridgeSongs.filter((s) => majorOf.get(result.songSecondaryGenre.get(s.id) ?? '') === s.bridgeStyle).length;
  const falseBridges = library.flatMap((a) => a.songs.filter((s) => !s.bridgeStyle && result.songSecondaryGenre.has(s.id))).length;
  return { result, ms, purity, composition, bridgeSongs: bridgeSongs.length, bridgesOk, falseBridges };
}
