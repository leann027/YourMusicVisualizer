'use client';

import React, { useMemo } from 'react';
import { ArrowLeft, Music2, Radio } from 'lucide-react';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { getNebulaLayout } from '../../lib/layout/nebulaLayout';
import { collisionBadge, collisionCardModel, collisionSummary } from '../../lib/layout/collisionModel';

/**
 * Collision card (Nebulosas v3 · M7.4): replaces the artist card while a collision is selected.
 * Bridge-song chips select the song (the regular card then offers playback); genre chips fly
 * to either nebula; "Volver" returns to the galaxy view.
 */
export const CollisionCard: React.FC = () => {
  const selectedCollision = useGalaxyStore((s) => s.selectedCollision);
  const baseData = useGalaxyStore((s) => s.baseData);
  const data = useGalaxyStore((s) => s.data);
  const selectNode = useGalaxyStore((s) => s.selectNode);
  const selectSector = useGalaxyStore((s) => s.selectSector);
  const selectCollision = useGalaxyStore((s) => s.selectCollision);

  const model = useMemo(() => collisionCardModel(getNebulaLayout(baseData), selectedCollision), [baseData, selectedCollision]);
  if (!model) return null;

  return (
    <aside
      aria-label={`Ficha del choque ${model.title}`}
      className="pointer-events-auto fixed top-18 md:top-20 right-3 md:right-6 z-30 w-full sm:w-80 md:w-84 max-h-[calc(100dvh-10.5rem)] overflow-y-auto rounded-2xl border border-[#CCFF00]/35 bg-[#080A14]/85 backdrop-blur-xl p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.7)] hud-transition"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1 mb-1" aria-hidden="true">
            {model.genres.map((g) => (
              <span key={g.id} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} />
            ))}
          </div>
          <h2 className="font-[family-name:var(--font-syne)] text-lg md:text-xl font-extrabold tracking-tight text-[#F2F4F8] leading-tight">
            {model.title}
          </h2>
          <p className="mt-0.5 text-xs text-[#B8DCE8] tabular-nums">
            <span className="text-[#CCFF00] font-semibold">{collisionBadge(model.sharedSongs)}</span>{' '}
            {collisionSummary(model.sharedSongs)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => selectCollision(null)}
          className="min-h-7 shrink-0 flex items-center gap-1 rounded-lg border border-[#00F5D4]/30 bg-[#050508]/80 px-2 py-1 text-[11px] font-semibold text-[#00F5D4] hover:border-[#00F5D4] transition-colors"
        >
          <ArrowLeft className="h-3 w-3" strokeWidth={2.2} />
          <span>Volver</span>
        </button>
      </div>

      {model.bridgeSongs.length > 0 && (
        <div className="mt-3 border-t border-[#00F5D4]/20 pt-3">
          <h3 className="font-[family-name:var(--font-syne)] text-sm font-bold text-[#F2F4F8] mb-2">Canciones puente</h3>
          <ul role="list" className="flex flex-col gap-1.5 text-xs">
            {model.bridgeSongs.map((s) => (
              <li key={s.songId}>
                <button
                  type="button"
                  onClick={() => {
                    const song = data.songs.find((n) => n.id === s.songId);
                    if (song) selectNode(song);
                  }}
                  className="w-full min-h-9 flex items-center justify-between gap-2 py-1.5 px-2.5 rounded border border-[#CCFF00]/25 bg-[#050508] hover:border-[#CCFF00] text-left transition-colors duration-150"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Music2 className="h-3.5 w-3.5 shrink-0 text-[#CCFF00]" strokeWidth={2} />
                    <span className="font-semibold text-[#F2F4F8] truncate">{s.title}</span>
                  </span>
                  <span className="text-[11px] text-[#B8DCE8] truncate shrink-0 max-w-[45%]">{s.artistName}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 border-t border-[#00F5D4]/20 pt-3">
        <h3 className="font-[family-name:var(--font-syne)] text-sm font-bold text-[#F2F4F8] mb-2">Ir al género</h3>
        <div className="flex flex-wrap gap-1.5">
          {model.genres.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => selectSector(g.id)}
              className="min-h-8 flex items-center gap-1.5 rounded-full border border-[#00F5D4]/30 bg-[#050508] px-2.5 py-1 text-xs font-semibold text-[#F2F4F8] hover:border-[#00F5D4] transition-colors"
            >
              <Radio className="h-3 w-3" style={{ color: g.color }} strokeWidth={2} />
              <span>{g.name.split(/\s*[&,]\s*/)[0]}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};
