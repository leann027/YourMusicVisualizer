'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Orbit, AlertTriangle } from 'lucide-react';
import {
  exchangeSpotifyCodeForToken,
  fetchSpotifyLikedSongsGalaxy,
} from '../../lib/spotify/spotifyClient';
import { useGalaxyStore } from '../../store/useGalaxyStore';

export default function SpotifyCallbackPage() {
  const router = useRouter();
  const loadCustomGalaxyData = useGalaxyStore((s) => s.loadCustomGalaxyData);

  const [statusText, setStatusText] = useState(
    'Autenticando con Spotify y analizando tus últimas 50 canciones en "Me gusta"...'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');

      if (error) {
        setErrorMsg(`Spotify canceló o denegó el acceso: ${error}`);
        return;
      }

      if (!code) {
        router.replace('/');
        return;
      }

      try {
        setStatusText('Canjeando llave OAuth 2.0 PKCE con Spotify...');
        const token = await exchangeSpotifyCodeForToken(code);

        if (cancelled) return;
        setStatusText(
          'Leyendo tus últimas 50 canciones en "Me gusta" y calculando constelaciones por afinidad...'
        );
        const { galaxy, user, analyzedCount } =
          await fetchSpotifyLikedSongsGalaxy(token);

        if (cancelled) return;
        loadCustomGalaxyData(
          galaxy,
          `Spotify · ${user.displayName} (${analyzedCount} Me gusta)`,
          user
        );

        router.replace('/');
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(
            err instanceof Error
              ? err.message
              : 'Error inesperado al sincronizar con Spotify.'
          );
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [loadCustomGalaxyData, router]);

  return (
    <main className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-[#050508] p-6 text-[#F2F4F8] font-mono">
      <div className="w-full max-w-md rounded border border-[#00F5D4]/45 bg-[#090B12] p-6 text-center shadow-[0_18px_42px_rgba(5,5,8,0.9)]">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#00F5D4]/40 bg-[#050508]">
          {errorMsg ? (
            <AlertTriangle className="h-6 w-6 text-[#FF2A85]" strokeWidth={2} />
          ) : (
            <Orbit
              className="h-6 w-6 text-[#00F5D4] animate-spin"
              strokeWidth={2}
            />
          )}
        </div>

        <h1 className="font-[family-name:var(--font-syne)] text-xl font-extrabold tracking-tight text-[#F2F4F8]">
          {errorMsg
            ? 'Error de Sincronización Estelar'
            : 'Sincronizando Cosmos Spotify'}
        </h1>

        {errorMsg ? (
          <div className="mt-3 flex flex-col gap-4">
            <p className="text-xs text-[#FF2A85] leading-relaxed">{errorMsg}</p>
            <button
              type="button"
              onClick={() => router.replace('/')}
              className="min-h-9 w-full rounded bg-[#00F5D4] px-4 py-2 text-xs font-bold text-[#050508] hover:bg-[#CCFF00] transition-colors"
            >
              Volver al Cosmos 3D
            </button>
          </div>
        ) : (
          <p className="mt-3 text-xs text-[#B8DCE8] leading-relaxed">
            {statusText}
          </p>
        )}
      </div>
    </main>
  );
}
