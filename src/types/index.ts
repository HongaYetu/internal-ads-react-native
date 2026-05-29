/**
 * Tipos partilhados entre hooks, componentes e cliente HTTP do SDK de anúncios.
 * Espelham a forma de resposta da API v2 da HongaYetu.
 */

export type AdAsset = {
  id: number;
  tipo: 'imagem' | 'video' | 'texto';
  url: string | null;
};

export type Anuncio = {
  id: number;
  nome: string;
  url: string | null;
  cpm: number;
  cpc: number;
  assets: AdAsset[];
};

export type AdTokens = {
  impression: string;
  click: string;
};

export type AdServeRequest = {
  espacoId: number;
  formatoId?: number | null;
  origem?: string | null;
  sublocal?: string | null;
  userAge?: number | null;
  geoCountry?: string | null;
};

export type AdServeResponse = {
  anuncio: Anuncio;
  tokens: AdTokens;
  ttl: number;
};

export type AdsMode = 'direct' | 'proxy';

export type AdsConfig = {
  /**
   * Endpoint base.
   * - `mode='direct'`: aponta para a central HongaYetu (ex: `https://anuncios.hongayetu.com/api/v2/ads`).
   * - `mode='proxy'`: aponta para o backend do consumer (ex: `https://humbi.com/api/ads-proxy`).
   */
  baseUrl: string;

  /**
   * Bearer token enviado em `Authorization: Bearer <token>`.
   * - `mode='direct'`: token ConnectedProject (fica no bundle — só usar se o teu modelo de ameaça aceitar isso).
   * - `mode='proxy'`: token de sessão do utilizador na tua app (Sanctum / JWT da tua app). O teu backend faz proxy e usa o token HongaYetu server-side.
   */
  token: string;

  /**
   * Modo de operação. **Recomendado: `'proxy'`** para apps mobile públicas.
   * Em `'direct'`, o token ConnectedProject fica visível no bundle e pode ser extraído.
   * Em `'proxy'`, o token HongaYetu nunca sai do servidor do consumer.
   * Default: `'direct'` (compat retroactiva).
   */
  mode?: AdsMode;

  /** Override do device_id (default: persistido em AsyncStorage). */
  deviceId?: string | null;

  /** Verbose logs em desenvolvimento. */
  debug?: boolean;
};
