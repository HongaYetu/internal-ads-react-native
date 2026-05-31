// Provider
export { AdsProvider, type AdsProviderProps } from './context/AdsProvider';

// Hooks
export { useAd, type UseAdState } from './hooks/useAd';
export { useDeviceId } from './hooks/useDeviceId';
export { useAdInterstitial, type UseAdInterstitialResult } from './hooks/useAdInterstitial';

// Components
export { AdView, type AdViewProps } from './components/AdView';
export { AdSlot, type AdSlotProps } from './components/AdSlot';
export { AdNativeSlot, type AdNativeSlotProps } from './components/AdNativeSlot';
export { AdInterstitial, type AdInterstitialProps } from './components/AdInterstitial';

// Utilities
export { toNativeAdData } from './utils/toNativeAdData';

// Types
export type {
  AdAsset,
  AdAssetQuality,
  AdAssetStatus,
  Anuncio,
  AdTokens,
  AdServeRequest,
  AdServeResponse,
  AdsConfig,
  AdsMode,
  NativeAdData,
  NativeAdHelpers,
  VideoEvent,
  PoliticaInterstitial,
} from './types';

// API (low-level — para casos avançados)
export * as adsApi from './api/client';
