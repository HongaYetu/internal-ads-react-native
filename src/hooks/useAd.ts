import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { useAdsContext } from '../context/AdsProvider';
import * as api from '../api/client';
import type { Anuncio, AdServeRequest, AdTokens } from '../types';

export type UseAdState = {
  /** Anúncio resolvido (null = ainda a carregar OU sem candidatos elegíveis). */
  anuncio: Anuncio | null;
  /** Tokens HMAC para tracking. */
  tokens: AdTokens | null;
  loading: boolean;
  error: Error | null;
  /** Re-fetch (útil para refresh manual). */
  refresh: () => void;
  /** Marca impressão (chama /impression). Idempotente — só chama uma vez. */
  markImpression: () => Promise<void>;
  /** Marca clique e abre `redirect_url` via `Linking.openURL`. */
  markClick: () => Promise<void>;
};

/**
 * Hook principal. Faz um pedido `/serve` à API v2 com o contexto dado.
 *
 * O `<AdView>` (preferível) usa este hook por baixo. Usa o `useAd` directo
 * só se quiseres construir uma UI custom.
 *
 * O `useAd` **não** marca impressão automaticamente — chamas `markImpression()`
 * quando o anúncio fica visível ≥1s (ex: dentro de um IntersectionObserver
 * equivalente em RN: `onLayout` + `measure`).
 */
export function useAd(req: AdServeRequest): UseAdState {
  const { baseUrl, token, deviceId, debug } = useAdsContext();
  const [anuncio, setAnuncio] = useState<Anuncio | null>(null);
  const [tokens, setTokens] = useState<AdTokens | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const impressionMarked = useRef(false);

  // Stabilize key deps to avoid loops.
  const espacoId = req.espacoId;
  const formatoId = req.formatoId ?? null;
  const origem = req.origem ?? null;
  const sublocal = req.sublocal ?? null;
  const userAge = req.userAge ?? null;
  const geoCountry = req.geoCountry ?? null;

  const fetchAd = useCallback(async () => {
    if (!deviceId) return; // espera deviceId resolver
    setLoading(true);
    setError(null);
    impressionMarked.current = false;
    try {
      const data = await api.serve(
        { baseUrl, token, deviceId },
        { espacoId, formatoId, origem, sublocal, userAge, geoCountry },
      );
      if (!data) {
        setAnuncio(null);
        setTokens(null);
      } else {
        setAnuncio(data.anuncio);
        setTokens(data.tokens);
      }
    } catch (e) {
      if (debug) {
        console.warn('[hongayetu/ads] serve falhou:', e);
      }
      setError(e as Error);
      setAnuncio(null);
      setTokens(null);
    } finally {
      setLoading(false);
    }
  }, [
    baseUrl,
    token,
    deviceId,
    espacoId,
    formatoId,
    origem,
    sublocal,
    userAge,
    geoCountry,
    debug,
  ]);

  useEffect(() => {
    fetchAd();
  }, [fetchAd]);

  const markImpression = useCallback(async () => {
    if (!tokens?.impression || impressionMarked.current) return;
    impressionMarked.current = true;
    try {
      await api.trackImpression({ baseUrl, token, deviceId }, tokens.impression);
    } catch (e) {
      // Reverter para permitir retry no próximo evento (raro).
      impressionMarked.current = false;
      if (debug) {
        console.warn('[hongayetu/ads] impressão falhou:', e);
      }
    }
  }, [baseUrl, token, deviceId, tokens?.impression, debug]);

  const markClick = useCallback(async () => {
    if (!tokens?.click) return;
    try {
      const res = await api.trackClick({ baseUrl, token, deviceId }, tokens.click);
      const url = res?.redirect_url ?? anuncio?.url;
      if (url) {
        const canOpen = await Linking.canOpenURL(url).catch(() => false);
        if (canOpen) {
          await Linking.openURL(url);
        } else if (debug) {
          console.warn('[hongayetu/ads] URL não abre:', url);
        }
      }
    } catch (e) {
      if (debug) {
        console.warn('[hongayetu/ads] clique falhou:', e);
      }
    }
  }, [baseUrl, token, deviceId, tokens?.click, anuncio?.url, debug]);

  return {
    anuncio,
    tokens,
    loading,
    error,
    refresh: fetchAd,
    markImpression,
    markClick,
  };
}
