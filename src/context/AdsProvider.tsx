import React, { createContext, useContext, useMemo } from 'react';
import { useDeviceId } from '../hooks/useDeviceId';
import type { AdsConfig, AdsMode } from '../types';

type AdsContextValue = {
  baseUrl: string;
  token: string;
  mode: AdsMode;
  deviceId: string | null;
  debug: boolean;
};

const AdsContext = createContext<AdsContextValue | null>(null);

export type AdsProviderProps = {
  config: AdsConfig;
  children: React.ReactNode;
};

/**
 * Topo da árvore — encapsula a configuração (baseUrl + bearer token) e
 * resolve o `device_id` persistido. Tudo o que está abaixo pode chamar
 * `useAd()` ou renderizar `<AdView />`.
 *
 * Recomendação de segurança: usa `mode: 'proxy'` quando o consumidor é uma
 * app mobile pública. Em modo direct, o token ConnectedProject fica embutido
 * no bundle e pode ser extraído por reverse engineering — ver README.
 */
export function AdsProvider({ config, children }: AdsProviderProps) {
  const deviceId = useDeviceId(config.deviceId ?? null);
  const value = useMemo<AdsContextValue>(
    () => ({
      baseUrl: config.baseUrl.replace(/\/+$/, ''),
      token: config.token,
      mode: config.mode ?? 'direct',
      deviceId,
      debug: config.debug ?? false,
    }),
    [config.baseUrl, config.token, config.mode, config.debug, deviceId],
  );

  if (value.debug && value.mode === 'direct') {
    // eslint-disable-next-line no-console
    console.warn(
      '[@hongayetu/internal-ads-react-native] A correr em modo "direct" — token visível no bundle. Considera mode="proxy" para apps mobile públicas.',
    );
  }

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

/** @internal — usado pelo `useAd` e `<AdView>`. */
export function useAdsContext(): AdsContextValue {
  const ctx = useContext(AdsContext);
  if (!ctx) {
    throw new Error(
      '[@hongayetu/internal-ads-react-native] useAd/AdView devem estar dentro de <AdsProvider>.',
    );
  }
  return ctx;
}
