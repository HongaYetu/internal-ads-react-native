// Provider
export { AdsProvider, type AdsProviderProps } from './context/AdsProvider';

// Hooks
export { useAd, type UseAdState } from './hooks/useAd';
export { useDeviceId } from './hooks/useDeviceId';

// Components
export { AdView, type AdViewProps } from './components/AdView';

// Types
export type {
  AdAsset,
  Anuncio,
  AdTokens,
  AdServeRequest,
  AdServeResponse,
  AdsConfig,
} from './types';

// API (low-level — para casos avançados)
export * as adsApi from './api/client';
