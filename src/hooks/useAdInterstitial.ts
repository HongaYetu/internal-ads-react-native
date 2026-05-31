import React, { useCallback, useState } from 'react';
import { AdInterstitial, type AdInterstitialProps } from '../components/AdInterstitial';
import type { AdServeRequest } from '../types';

export type UseAdInterstitialResult = {
  show: () => void;
  hide: () => void;
  isOpen: boolean;
  AdInterstitialPortal: React.ReactElement;
};

/**
 * Hook conveniente para apps que querem disparar interstitials imperativamente
 * — ex: cold start (`interstitial_app_open`), pós-compra, mudança de tela.
 *
 * @example
 * const { show, AdInterstitialPortal } = useAdInterstitial({
 *   espacoSlug: 'humbi_shop',
 *   sublocal: 'interstitial_app_open',
 *   formatos: [{ largura: 1080, altura: 1920 }],
 * });
 * useEffect(() => { show() }, []);
 * return <>{AdInterstitialPortal}{rest}</>;
 */
export function useAdInterstitial(
  req: AdServeRequest,
  opcoes?: Pick<AdInterstitialProps, 'onPresented' | 'onSkip' | 'onCompleted'>,
): UseAdInterstitialResult {
  const [isOpen, setIsOpen] = useState(false);

  const show = useCallback(() => setIsOpen(true), []);
  const hide = useCallback(() => setIsOpen(false), []);

  const AdInterstitialPortal = React.createElement(AdInterstitial, {
    ...req,
    ...opcoes,
    open: isOpen,
    onClose: hide,
  });

  return { show, hide, isOpen, AdInterstitialPortal };
}
