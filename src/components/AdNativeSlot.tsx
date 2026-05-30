import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Linking,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useAdsContext } from '../context/AdsProvider';
import { useAd } from '../hooks/useAd';
import type { AdServeRequest, NativeAdData, NativeAdHelpers } from '../types';
import { toNativeAdData } from '../utils/toNativeAdData';

export type AdNativeSlotProps = AdServeRequest & {
  /**
   * Renderiza o card nativo com os dados normalizados. O consumer deve
   * envolver o card num `<Pressable onPress={helpers.onPress}>` (ou
   * equivalente) — o SDK injecta o tracking de clique aqui.
   * O selo "Anúncio." é overlay automático no canto sup. esquerdo.
   */
  renderCard: (data: NativeAdData, helpers: NativeAdHelpers) => React.ReactNode;
  /** Lazy mount (default true). */
  lazy?: boolean;
  /** Estilo do container exterior. */
  containerStyle?: StyleProp<ViewStyle>;
  /** Default 1000ms (IAB MRC). */
  impressionDelayMs?: number;
};

/**
 * Anúncio nativo (RN) — copia a estrutura visual dos itens da lista do consumer.
 *
 * O consumer fornece um `renderCard` que recebe `NativeAdData` e renderiza
 * dentro do seu próprio componente de card (o mesmo usado para produtos
 * reais). O SDK trata: 1 fetch `/serve`, tracking de impressão (≥1s mounted),
 * click via proxy GET nativo (`Linking.openURL` em modo proxy), selo
 * **Anúncio.** absoluto top-left.
 */
export function AdNativeSlot(props: AdNativeSlotProps) {
  const {
    renderCard,
    lazy = true,
    containerStyle,
    impressionDelayMs,
    ...req
  } = props;

  const [visible, setVisible] = useState(!lazy);

  const handleLayout = (e: LayoutChangeEvent) => {
    if (visible) return;
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setVisible(true);
  };

  if (!visible) {
    return <View onLayout={handleLayout} style={containerStyle} />;
  }

  return (
    <NativeAdInner
      req={req}
      renderCard={renderCard}
      containerStyle={containerStyle}
      impressionDelayMs={impressionDelayMs}
    />
  );
}

function NativeAdInner({
  req,
  renderCard,
  containerStyle,
  impressionDelayMs,
}: {
  req: AdServeRequest;
  renderCard: (data: NativeAdData, helpers: NativeAdHelpers) => React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  impressionDelayMs?: number;
}) {
  const { anuncio, tokens, markImpression, markClick } = useAd(req);
  const { baseUrl, mode } = useAdsContext();
  const [mounted, setMounted] = useState(false);
  const impressionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLayout = (e: LayoutChangeEvent) => {
    if (mounted) return;
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setMounted(true);
  };

  useEffect(() => {
    if (!anuncio || !mounted) return;
    const delay = impressionDelayMs ?? 1000;
    impressionTimer.current = setTimeout(() => {
      markImpression();
    }, delay);
    return () => {
      if (impressionTimer.current) {
        clearTimeout(impressionTimer.current);
        impressionTimer.current = null;
      }
    };
  }, [anuncio?.id, mounted, impressionDelayMs, markImpression]);

  const useProxyClick = mode === 'proxy' && !!tokens?.click;
  const clickHref = useMemo(() => {
    if (!useProxyClick) return null;
    return `${baseUrl.replace(/\/+$/, '')}/click/${encodeURIComponent(tokens!.click)}`;
  }, [useProxyClick, baseUrl, tokens?.click]);

  if (!anuncio) {
    return null;
  }

  const data = toNativeAdData(anuncio);
  if (!data) {
    return null;
  }

  const handlePress = async () => {
    if (clickHref) {
      try {
        const canOpen = await Linking.canOpenURL(clickHref).catch(() => false);
        if (canOpen) {
          await Linking.openURL(clickHref);
          return;
        }
      } catch {
        // fallback abaixo
      }
    }
    await markClick();
  };

  const helpers: NativeAdHelpers = {
    clickHref,
    onPress: handlePress,
  };

  return (
    <View onLayout={handleLayout} style={[styles.wrap, containerStyle]}>
      {renderCard(data, helpers)}
      <View style={styles.adLabelWrap} pointerEvents="none">
        <Text style={styles.adLabelText}>Anúncio.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  adLabelWrap: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 3,
    zIndex: 5,
  },
  adLabelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
