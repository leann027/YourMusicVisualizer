'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Compass,
  Disc3,
  Mic2,
  Search,
  X,
  ArrowUpRight,
} from 'lucide-react';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { MusicNode } from '../../types/music';

interface SearchResultItem {
  id: string;
  node: MusicNode;
  primaryLabel: string;
  secondaryLabel: string;
  typeBadge: 'SECTOR' | 'ARTISTA' | 'PISTA';
  affinityPct: number;
  accentColor: string;
}

export const StellarSearchBar: React.FC = () => {
  const inputId = useId();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLElement>(null);

  const data = useGalaxyStore((s) => s.data);
  const searchQuery = useGalaxyStore((s) => s.searchQuery);
  const setSearchQuery = useGalaxyStore((s) => s.setSearchQuery);
  const selectNode = useGalaxyStore((s) => s.selectNode);
  const selectSector = useGalaxyStore((s) => s.selectSector);

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  const allItems = useMemo<SearchResultItem[]>(() => {
    const genreMap = new Map(data.genres.map((g) => [g.id, g]));
    const artistMap = new Map(data.artists.map((a) => [a.id, a]));

    const genreItems: SearchResultItem[] = data.genres.map((g) => ({
      id: g.id,
      node: g,
      primaryLabel: g.name,
      secondaryLabel: `${g.songCount} canciones en constelación`,
      typeBadge: 'SECTOR',
      affinityPct: Math.round(g.affinity * 100),
      accentColor: g.color,
    }));

    const artistItems: SearchResultItem[] = data.artists.map((a) => {
      const genre = genreMap.get(a.genreId);
      const subgenreLabel = a.subgenre ? ` · [${a.subgenre}]` : '';
      return {
        id: a.id,
        node: a,
        primaryLabel: a.name,
        secondaryLabel: `${a.catalogCode}${subgenreLabel} · ${
          genre ? genre.name.split('&')[0].trim() : ''
        }`,
        typeBadge: 'ARTISTA',
        affinityPct: Math.round(a.affinity * 100),
        accentColor: a.sleeveAccent,
      };
    });

    const songItems: SearchResultItem[] = data.songs.map((s) => {
      const artist = artistMap.get(s.artistId);
      const subgenreLabel = s.subgenre ? ` · [${s.subgenre}]` : '';
      return {
        id: s.id,
        node: s,
        primaryLabel: s.title,
        secondaryLabel: `${artist ? artist.name : 'Artista'}${subgenreLabel} · ${s.album}`,
        typeBadge: 'PISTA',
        affinityPct: Math.round(s.affinity * 100),
        accentColor: artist ? artist.sleeveAccent : '#00F5D4',
      };
    });

    return [...artistItems, ...songItems, ...genreItems];
  }, [data]);

  const filteredResults = useMemo<SearchResultItem[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      // Suggested top stars by affinity when search input is focused with empty query
      return [...allItems]
        .sort((a, b) => b.affinityPct - a.affinityPct)
        .slice(0, 7);
    }

    return allItems
      .filter((item) => {
        const matchesPrimary = item.primaryLabel.toLowerCase().includes(q);
        const matchesSecondary = item.secondaryLabel.toLowerCase().includes(q);
        const matchesType = item.typeBadge.toLowerCase().includes(q);
        const nodeSubgenre =
          'subgenre' in item.node && item.node.subgenre
            ? item.node.subgenre.toLowerCase()
            : '';
        const nodeTags =
          'tags' in item.node && item.node.tags
            ? item.node.tags.map((t) => t.toLowerCase())
            : [];
        const matchesSubgenre = nodeSubgenre.includes(q);
        const matchesTags = nodeTags.some((t) => t.includes(q));

        return (
          matchesPrimary ||
          matchesSecondary ||
          matchesType ||
          matchesSubgenre ||
          matchesTags
        );
      })
      .slice(0, 9);
  }, [allItems, searchQuery]);

  // Global keyboard shortcut: '/' or Ctrl+K / Cmd+K focuses the stellar search input
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTypingInInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
        return;
      }

      if (!isTypingInInput && e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const triggerSelection = (item: SearchResultItem) => {
    if (item.node.type === 'genre') {
      selectSector(item.node.id);
    } else {
      selectNode(item.node);
    }
    setLiveAnnouncement(
      `Viajando hacia ${item.typeBadge.toLowerCase()} ${item.primaryLabel}, afinidad ${item.affinityPct} por ciento.`
    );
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(0);
      } else if (filteredResults.length > 0) {
        setActiveIndex((prev) => (prev + 1) % filteredResults.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(Math.max(0, filteredResults.length - 1));
      } else if (filteredResults.length > 0) {
        setActiveIndex(
          (prev) => (prev - 1 + filteredResults.length) % filteredResults.length
        );
      }
    } else if (e.key === 'Enter') {
      if (isOpen && filteredResults[activeIndex]) {
        e.preventDefault();
        triggerSelection(filteredResults[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (isOpen) {
        setIsOpen(false);
      } else if (searchQuery) {
        setSearchQuery('');
      }
      inputRef.current?.blur();
    }
  };

  const activeOptionId =
    isOpen && filteredResults[activeIndex]
      ? `${listboxId}-opt-${filteredResults[activeIndex].id}`
      : undefined;

  return (
    <search
      ref={containerRef}
      aria-label="Buscador estelar de artistas, canciones y sectores"
      className="relative w-full md:w-88 lg:w-96"
    >
      <label htmlFor={inputId} className="visually-hidden">
        Buscar artista, canción o sector musical (atajo tecla barra o Control K)
      </label>

      <div className="relative flex items-center">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 h-4 w-4 text-[#00F5D4]"
          strokeWidth={2}
        />

        <input
          ref={inputRef}
          id={inputId}
          name="stellarSearch"
          type="search"
          role="combobox"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          value={searchQuery}
          placeholder="Buscar artista, pista o sector... [/]"
          onFocus={() => {
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className="w-full min-h-9 rounded border border-[#00F5D4]/35 bg-[#090B12]/95 pl-9 pr-16 py-1.5 text-xs text-[#F2F4F8] placeholder:text-[#B8DCE8]/75 focus:border-[#00F5D4] focus:bg-[#050508] focus:shadow-[0_0_15px_rgba(0,245,212,0.2)] transition-all duration-200"
        />

        {searchQuery ? (
          <button
            type="button"
            aria-label="Limpiar texto de búsqueda"
            onClick={() => {
              setSearchQuery('');
              setActiveIndex(0);
              inputRef.current?.focus();
            }}
            className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded text-[#B8DCE8] hover:bg-[#131826] hover:text-[#F2F4F8] hover:shadow-[0_0_8px_rgba(0,245,212,0.2)] transition-all duration-150 active:scale-[0.95]"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        ) : (
          <kbd
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 hidden sm:inline-flex items-center rounded border border-[#00F5D4]/30 bg-[#050508] px-1.5 py-0.5 text-[10px] font-semibold text-[#B8DCE8]"
          >
            / · ⌘K
          </kbd>
        )}
      </div>

      {/* Screen-reader live region for camera flight feedback */}
      <div className="visually-hidden" role="status" aria-live="polite">
        {liveAnnouncement}
      </div>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Coordenadas estelares encontradas"
          className="hud-transition absolute left-0 right-0 top-full mt-1.5 z-40 max-h-80 overflow-y-auto rounded border border-[#00F5D4]/45 bg-[#050508]/98 backdrop-blur-md p-1.5 shadow-[0_0_20px_rgba(0,245,212,0.15),0_18px_40px_rgba(5,5,8,0.92)]"
        >
          {filteredResults.length > 0 ? (
            <>
              <div className="flex items-center justify-between px-2.5 py-1 text-[10px] text-[#B8DCE8] border-b border-[#00F5D4]/15 mb-1">
                <span>
                  {searchQuery.trim()
                    ? `${filteredResults.length} coordenadas encontradas`
                    : 'Estrellas de mayor afinidad (↑↓ Enter)'}
                </span>
                <span className="text-[#00F5D4]">VUELO DIRECTO</span>
              </div>

              {filteredResults.map((item, idx) => {
                const isSelected = idx === activeIndex;
                return (
                  <div
                    key={item.id}
                    id={`${listboxId}-opt-${item.id}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseDown={(e) => {
                      // Prevent input blur before click registers
                      e.preventDefault();
                      triggerSelection(item);
                    }}
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded px-2.5 py-2 text-xs transition-colors ${
                      isSelected
                        ? 'bg-[#131826] text-[#F2F4F8] border border-[#00F5D4]/60'
                        : 'text-[#B8DCE8] border border-transparent hover:bg-[#0A0C14]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.node.type === 'artist' ? (
                        <Mic2
                          className="h-3.5 w-3.5 shrink-0"
                          style={{ color: item.accentColor }}
                          strokeWidth={2}
                        />
                      ) : item.node.type === 'song' ? (
                        <Disc3
                          className="h-3.5 w-3.5 shrink-0"
                          style={{ color: item.accentColor }}
                          strokeWidth={2}
                        />
                      ) : (
                        <Compass
                          className="h-3.5 w-3.5 shrink-0"
                          style={{ color: item.accentColor }}
                          strokeWidth={2}
                        />
                      )}

                      <div className="min-w-0">
                        <div className="font-semibold text-[#F2F4F8] truncate">
                          {item.primaryLabel}
                        </div>
                        <div className="text-[11px] text-[#B8DCE8] truncate">
                          {item.secondaryLabel}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 tabular-nums">
                      <span className="rounded border border-[#00F5D4]/30 bg-[#050508] px-1.5 py-0.5 text-[10px] font-bold text-[#00F5D4]">
                        {item.typeBadge}
                      </span>
                      <span className="text-[11px] font-bold text-[#CCFF00]">
                        {item.affinityPct}%
                      </span>
                      <ArrowUpRight
                        className="h-3.5 w-3.5 text-[#00F5D4]"
                        strokeWidth={2}
                      />
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="flex flex-col items-start gap-2 p-3 text-xs text-[#B8DCE8]">
              <p className="text-[#F2F4F8] font-semibold">
                No se hallaron estrellas para «{searchQuery}».
              </p>
              <p className="text-[11px]">
                Intenta buscar por artista (ej. Radiohead, Daft Punk), pista o
                sector musical.
              </p>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setSearchQuery('');
                  setActiveIndex(0);
                }}
                className="mt-1 rounded border border-[#00F5D4]/50 bg-[#090B12] px-3 py-1.5 text-xs font-semibold text-[#00F5D4] hover:bg-[#00F5D4] hover:text-[#050508] transition-colors"
              >
                Restablecer búsqueda estelar
              </button>
            </div>
          )}
        </div>
      )}
    </search>
  );
};
