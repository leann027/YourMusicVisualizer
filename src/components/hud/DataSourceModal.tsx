'use client';

import React, { useId, useRef, useState } from 'react';
import {
  CheckCircle2,
  Database,
  FileJson,
  LogOut,
  Radio,
  RotateCcw,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import {
  buildMusicGalaxyFromPayload,
  RawLibraryPayload,
  SAMPLE_STREAMING_PAYLOAD,
} from '../../lib/importers/libraryImporter';
import {
  clearSpotifySession,
  fetchSpotifyLikedSongsGalaxy,
  getStoredAccessToken,
  startSpotifyLogin,
} from '../../lib/spotify/spotifyClient';
import { webAudioEngine } from '../../lib/audio/WebAudioEngine';

export const DataSourceModal: React.FC = () => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputId = useId();
  const profileRadiosName = useId();

  const dataSourceLabel = useGalaxyStore((s) => s.dataSourceLabel);
  const spotifyUser = useGalaxyStore((s) => s.spotifyUser);
  const loadCustomGalaxyData = useGalaxyStore((s) => s.loadCustomGalaxyData);
  const restoreDefaultGalaxy = useGalaxyStore((s) => s.restoreDefaultGalaxy);

  const [selectedPreset, setSelectedPreset] = useState<'default' | 'streaming'>('default');
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSyncingSpotify, setIsSyncingSpotify] = useState(false);

  const openModal = () => {
    setErrorMsg('');
    setStatusMsg('');
    dialogRef.current?.showModal();
  };

  const closeModal = () => {
    dialogRef.current?.close();
  };

  const handleSpotifyConnect = async () => {
    setErrorMsg('');
    setStatusMsg('');
    webAudioEngine.stopCurrentSource();

    const existingToken = getStoredAccessToken();
    if (existingToken) {
      setIsSyncingSpotify(true);
      try {
        const { galaxy, user, analyzedCount } =
          await fetchSpotifyLikedSongsGalaxy(existingToken);
        loadCustomGalaxyData(
          galaxy,
          `Spotify · ${user.displayName} (${analyzedCount} Me gusta)`,
          user
        );
        setStatusMsg(
          `Sincronizado con Spotify (${user.displayName}): ${analyzedCount} canciones en "Me gusta" analizadas.`
        );
        setTimeout(() => closeModal(), 400);
        return;
      } catch {
        clearSpotifySession();
      } finally {
        setIsSyncingSpotify(false);
      }
    }

    await startSpotifyLogin();
  };

  const handleSpotifyLogout = () => {
    webAudioEngine.stopCurrentSource();
    clearSpotifySession();
    restoreDefaultGalaxy();
    setStatusMsg('Sesión de Spotify cerrada. Universo Base restaurado.');
  };

  const handleApplyPreset = (e: React.FormEvent) => {
    e.preventDefault();
    webAudioEngine.stopCurrentSource();

    if (selectedPreset === 'default') {
      restoreDefaultGalaxy();
      setStatusMsg('Universo Base restaurado (42 nodos estelares).');
    } else {
      const galaxy = buildMusicGalaxyFromPayload(SAMPLE_STREAMING_PAYLOAD);
      loadCustomGalaxyData(
        galaxy,
        SAMPLE_STREAMING_PAYLOAD.profileName || 'Spotify / Last.fm Snapshot'
      );
      setStatusMsg(
        `Perfil Streaming cargado: ${galaxy.genres.length} sectores, ${galaxy.artists.length} artistas y ${galaxy.songs.length} pistas.`
      );
    }

    setTimeout(() => {
      closeModal();
    }, 350);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setStatusMsg('');

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as RawLibraryPayload;
      const galaxy = buildMusicGalaxyFromPayload(parsed);

      webAudioEngine.stopCurrentSource();
      loadCustomGalaxyData(
        galaxy,
        parsed.profileName || `Archivo Local (${file.name})`
      );
      setStatusMsg(
        `Archivo "${file.name}" importado con éxito (${galaxy.artists.length} artistas, ${galaxy.songs.length} pistas).`
      );
      setTimeout(() => {
        closeModal();
      }, 450);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No se pudo parsear el archivo JSON. Verifica el formato de pistas.'
      );
    } finally {
      e.target.value = '';
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="min-h-9 flex items-center gap-1.5 rounded border border-[#00F5D4]/40 bg-[#050508] px-3 py-1.5 text-xs font-semibold text-[#00F5D4] hover:border-[#00F5D4] hover:bg-[#00F5D4]/15 transition-colors"
      >
        <Database className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        <span>
          {spotifyUser
            ? `Spotify: ${spotifyUser.displayName}`
            : 'Conectar Spotify / Datos'}
        </span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="datasource-dialog-title"
        onClick={(e) => {
          if (e.target === dialogRef.current) closeModal();
        }}
        className="m-auto w-full max-w-lg rounded border border-[#00F5D4]/55 bg-[#090B12] p-5 text-[#F2F4F8] font-mono shadow-[0_24px_60px_rgba(5,5,8,0.95)] backdrop:bg-[#050508]/80"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#00F5D4]/20 pb-3">
          <div>
            <h2
              id="datasource-dialog-title"
              className="font-[family-name:var(--font-syne)] text-lg font-extrabold tracking-tight text-[#F2F4F8]"
            >
              Sincronización de Biblioteca Musical
            </h2>
            <p className="mt-1 text-xs text-[#B8DCE8]">
              Fuente activa: <strong className="text-[#CCFF00]">{dataSourceLabel}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={closeModal}
            aria-label="Cerrar ventana de fuente de datos"
            className="flex min-h-8 min-w-8 items-center justify-center rounded border border-[#00F5D4]/30 bg-[#050508] text-[#B8DCE8] hover:border-[#00F5D4] hover:text-[#F2F4F8]"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Story 1: Real Spotify OAuth 2.0 PKCE Login & 50 Liked Songs Analyzer */}
        <div className="mt-4 flex flex-col gap-2.5 rounded border border-[#CCFF00]/45 bg-[#050508] p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-[#CCFF00]">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
              <span>Cuenta Oficial de Spotify (Últimos 50 &quot;Me gusta&quot;)</span>
            </span>
            {spotifyUser && (
              <span className="rounded bg-[#CCFF00] px-2 py-0.5 text-[10px] font-bold text-[#050508]">
                CONECTADO
              </span>
            )}
          </div>

          <p className="text-[11px] text-[#B8DCE8]">
            Conecta tu cuenta mediante OAuth 2.0 PKCE para analizar tus últimas 50
            canciones en &quot;Me gusta&quot;, agrupar tus artistas por afinidad y
            reproducir sus previews con el analizador FFT.
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isSyncingSpotify}
              onClick={handleSpotifyConnect}
              className="min-h-9 flex-1 flex items-center justify-center gap-2 rounded bg-[#CCFF00] px-3.5 py-2 text-xs font-bold text-[#050508] hover:bg-[#00F5D4] transition-colors disabled:opacity-50"
            >
              <Radio className="h-3.5 w-3.5" strokeWidth={2.2} />
              <span>
                {isSyncingSpotify
                  ? 'Analizando tus 50 "Me gusta"...'
                  : spotifyUser
                  ? `Re-sincronizar 50 "Me gusta" (${spotifyUser.displayName})`
                  : 'Iniciar sesión con Spotify (50 "Me gusta")'}
              </span>
            </button>

            {spotifyUser && (
              <button
                type="button"
                onClick={handleSpotifyLogout}
                className="min-h-9 flex items-center gap-1.5 rounded border border-[#FF2A85]/50 bg-[#090B12] px-3 py-2 text-xs font-semibold text-[#FF2A85] hover:bg-[#FF2A85] hover:text-[#050508] transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Desconectar</span>
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleApplyPreset} className="mt-3 flex flex-col gap-3">
          <fieldset className="flex flex-col gap-2 rounded border border-[#00F5D4]/20 bg-[#050508] p-3">
            <legend className="px-1.5 text-xs font-bold text-[#00F5D4]">
              Perfiles Instantáneos (Demo / Snapshot)
            </legend>

            <label className="flex cursor-pointer items-start gap-2.5 rounded border border-[#00F5D4]/20 bg-[#090B12] p-2 text-xs hover:border-[#00F5D4]/60">
              <input
                type="radio"
                name={profileRadiosName}
                value="default"
                checked={selectedPreset === 'default'}
                onChange={() => setSelectedPreset('default')}
                className="mt-0.5 accent-[#00F5D4]"
              />
              <div>
                <div className="font-bold text-[#F2F4F8]">
                  Universo Base · Synthwave, Art Rock, IDM & Dream Pop
                </div>
                <div className="text-[11px] text-[#B8DCE8]">
                  4 sectores, 15 artistas (Daft Punk, Radiohead, Aphex Twin...) y 22 pistas.
                </div>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-2.5 rounded border border-[#00F5D4]/20 bg-[#090B12] p-2 text-xs hover:border-[#00F5D4]/60">
              <input
                type="radio"
                name={profileRadiosName}
                value="streaming"
                checked={selectedPreset === 'streaming'}
                onChange={() => setSelectedPreset('streaming')}
                className="mt-0.5 accent-[#00F5D4]"
              />
              <div>
                <div className="flex items-center gap-1.5 font-bold text-[#F2F4F8]">
                  <Radio className="h-3.5 w-3.5 text-[#CCFF00]" strokeWidth={2} />
                  <span>Snapshot Streaming · Sesión Neo-Tokyo & Bristol</span>
                </div>
                <div className="text-[11px] text-[#B8DCE8]">
                  Massive Attack, Portishead, Burial, Ryuichi Sakamoto y YMO.
                </div>
              </div>
            </label>

            <button
              type="submit"
              className="mt-1 min-h-9 flex items-center justify-center gap-2 rounded bg-[#00F5D4] px-3.5 py-1.5 text-xs font-bold text-[#050508] hover:bg-[#CCFF00] transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.2} />
              <span>Cargar Perfil Seleccionado</span>
            </button>
          </fieldset>

          {/* Local JSON File Importer */}
          <div className="flex flex-col gap-1.5 rounded border border-[#FF2A85]/35 bg-[#050508] p-3">
            <label
              htmlFor={fileInputId}
              className="flex items-center gap-1.5 text-xs font-bold text-[#FF2A85]"
            >
              <FileJson className="h-3.5 w-3.5" strokeWidth={2} />
              <span>Importar Archivo JSON Local</span>
            </label>
            <label
              htmlFor={fileInputId}
              className="mt-0.5 min-h-9 flex cursor-pointer items-center justify-center gap-2 rounded border border-[#FF2A85]/50 bg-[#090B12] px-3 py-1.5 text-xs font-semibold text-[#F2F4F8] hover:border-[#FF2A85] hover:bg-[#FF2A85]/15 transition-colors"
            >
              <Upload className="h-3.5 w-3.5 text-[#FF2A85]" strokeWidth={2} />
              <span>Seleccionar archivo .json desde tu equipo</span>
            </label>
            <input
              id={fileInputId}
              name="libraryJsonFile"
              type="file"
              accept="application/json,.json"
              onChange={handleFileUpload}
              className="visually-hidden"
            />
          </div>

          {/* Live feedback region */}
          <div role="status" aria-live="polite" className="min-h-5 text-xs">
            {statusMsg && (
              <p className="flex items-center gap-1.5 text-[#CCFF00] font-semibold">
                <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} />
                <span>{statusMsg}</span>
              </p>
            )}
            {errorMsg && (
              <p className="text-[#FF2A85] font-semibold">{errorMsg}</p>
            )}
          </div>
        </form>
      </dialog>
    </>
  );
};
