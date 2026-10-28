/** TF-IDF tag similarity (`tfidf.ts`): shared by the importer's style links and dynamicGenres. */

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

/** Smooth inverse document frequency: ln(1 + N / (1 + DF)). */
export function smoothIdf(documentCount: number, documentFrequency: number): number {
  return Math.log(1 + documentCount / (1 + documentFrequency));
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
    const idf = smoothIdf(n, df);
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
