/**
 * Tipos partilhados entre hooks, componentes e cliente HTTP do SDK de anúncios.
 * Espelham a forma de resposta da API v2 da HongaYetu.
 */

export type AdAssetStatus = 'pronto' | 'processando' | 'erro';

export type AdAssetQuality = {
  resolucao: string;
  bitrate: number;
  url: string;
};

export type AdAsset = {
  id: number;
  tipo: 'imagem' | 'video' | 'texto';
  status?: AdAssetStatus | null;
  /**
   * - imagem: URL da imagem.
   * - video: URL do MP4 original (fallback se `hls_url` for null).
   */
  url: string | null;
  /** Manifest HLS (m3u8). Só presente quando `tipo === 'video'` e processado. */
  hls_url?: string | null;
  /** Thumbnail/poster do vídeo. */
  thumbnail_url?: string | null;
  /** Qualidades disponíveis — HLS já adapta, este campo é para selectors manuais. */
  qualities?: AdAssetQuality[] | null;
  /** Dimensões finais do asset escolhido (versão ou original). */
  largura?: number | null;
  altura?: number | null;
  /** `versao` quando há AnuncioAssetVersao aprovada; `original` em fallback. */
  fonte?: 'versao' | 'original' | null;
  /** Formato matching escolhido pela central (para debug/telemetria). */
  formato_id?: number | null;
  formato_slug?: string | null;
  /** Textos estruturados (anúncios nativos). Populado pela IA / criação manual. */
  texto_titulo?: string | null;
  texto_descricao?: string | null;
  texto_cta?: string | null;
  /** Duração do vídeo (apenas quando `tipo='video'`). */
  duracao_segundos?: number | null;
  /** MP4 direto (apenas vídeo). Usar como fallback quando `hls_url` indisponível. */
  mp4_url?: string | null;
};

export type Anuncio = {
  id: number;
  nome: string;
  url: string | null;
  cpm: number;
  cpc: number;
  assets: AdAsset[];
  /** URL pública do logo da marca (anúncios nativos). */
  logo_url?: string | null;
  /** Nome do anunciante para exibição (ex: "Unitel"). */
  anunciante?: string | null;
};

/**
 * Dados normalizados para anúncios nativos. Derivado de `Anuncio` + 1º asset
 * via `toNativeAdData()`. O consumer renderiza estes campos dentro do card.
 */
export type NativeAdData = {
  headline: string;
  descricao: string | null;
  cta: string;
  imageUrl: string | null;
  imageLargura: number | null;
  imageAltura: number | null;
  logoUrl: string | null;
  anunciante: string | null;
  url: string | null;
};

/**
 * Helpers passados a `renderCard()` do `<AdNativeSlot>`. Em RN, o consumer
 * aplica `onPress` num `<Pressable>` (ou recebe `clickHref` para Linking
 * directo se preferir construir o flow manualmente).
 */
export type NativeAdHelpers = {
  clickHref?: string | null;
  onPress: () => void | Promise<void>;
};

export type AdTokens = {
  impression: string;
  click: string;
};

export type AdServeRequest = {
  /** Slug do espaço/app (ex: `humbi_shop`). Identificador estável entre ambientes. */
  espacoSlug: string;
  formatoId?: number | null;
  /** Identificador do ecrã/local dentro do app (ex: `inicio`, `produto_show`). */
  sublocal?: string | null;
  userAge?: number | null;
  geoCountry?: string | null;
  /** Dimensões reais do slot (px). Opcional — só usado em matching aproximado. */
  slotWidth?: number | null;
  slotHeight?: number | null;
  /**
   * Lista de tamanhos exactos aceites pelo slot. Quando definida, a API só
   * devolve anúncios cuja versão (ou original) corresponda EXACTAMENTE a uma
   * das entradas. Sem match → `data: null` (no-fill).
   */
  formatos?: Array<{ largura: number; altura: number }> | null;
  /** Quando `false`, `useAd` não dispara `/serve`. Default: true. */
  enabled?: boolean;
};

/** Eventos de progresso de vídeo emitidos pelo `<AdInterstitial>` ao backend. */
export type VideoEvent =
  | 'start'
  | 'quartil_25'
  | 'quartil_50'
  | 'quartil_75'
  | 'complete'
  | 'skip'
  | 'close';

/**
 * Política de slot (skip/cap/min_view). Só presente quando o sublocal/espaço
 * tem configuração explícita. O `<AdInterstitial>` aplica; o `<AdSlot>` ignora.
 */
export type PoliticaInterstitial = {
  skip_after_ms: number;
  frequency_cap_dia: number;
  interstitial_min_view_ms: number;
  /**
   * Cooldown mínimo (segundos) entre duas exibições do mesmo sublocal para o
   * mesmo utilizador. Default 0 (sem cooldown). Protege contra spam quando o
   * user reabre o app várias vezes em sucessão.
   */
  intervalo_minimo_segundos: number;
  fonte: 'sublocal' | 'espaco';
};

export type AdServeResponse = {
  anuncio: Anuncio;
  tokens: AdTokens;
  ttl: number;
  politica?: PoliticaInterstitial;
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
