'use client';

import React, { useMemo } from 'react';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { getNebulaLayout } from '../../lib/layout/nebulaLayout';
import { collisionBadge, collisionSummary, genreCollisions } from '../../lib/layout/collisionModel';

/**
 * "Choca con" row for the genre card (Nebulosas v3 · M7.4): one chip per collision of the
 * genre, strongest first; a chip flies the camera to that collision. Nebula mode only.
 */
export const GenreCollisionsRow: React.FC<{ genreId: string }> = ({ genreId }) => {
  const rendererMode = useGalaxyStore((s) => s.rendererMode);
  const baseData = useGalaxyStore((s) => s.baseData);
  const selectCollision = useGalaxyStore((s) => s.selectCollision);

  const collisions = useMemo(
    () => (rendererMode === 'nebula' ? genreCollisions(getNebulaLayout(baseData), genreId) : []),
    [rendererMode, baseData, genreId]
  );
  if (!collisions.length) return null;

  return (
    <div className="border-t border-[#00F5D4]/20 pt-3">
      <h3 className="font-[family-name:var(--font-syne)] text-sm font-bold text-[#F2F4F8] mb-2">Choca con</h3>
      <ul role="list" className="flex flex-wrap gap-1.5 text-xs">
        {collisions.map((c) => (
          <li key={c.otherGenreId}>
            <button
              type="button"
              onClick={() => selectCollision({ a: c.a, b: c.b })}
              aria-label={`Ver choque con ${c.otherName}: ${c.sharedSongs > 0 ? `${c.sharedSongs} ` : ''}${collisionSummary(c.sharedSongs)}`}
              className="min-h-8 flex items-center gap-1.5 rounded-full border border-[#CCFF00]/30 bg-[#050508] px-2.5 py-1 hover:border-[#CCFF00] transition-colors duration-150 tabular-nums"
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: c.otherColor }} aria-hidden="true" />
              <span className="font-semibold text-[#F2F4F8]">{c.otherName.split(/\s*[&,]\s*/)[0]}</span>
              <span className="text-[11px] text-[#CCFF00]">{collisionBadge(c.sharedSongs)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
