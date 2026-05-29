import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useAd } from '../hooks/useAd';
import type { AdServeRequest, Anuncio } from '../types';

export type AdViewProps = AdServeRequest & {
  /** Estilo do container exterior. */
  style?: StyleProp<ViewStyle>;
  /** Estilo da imagem/vídeo. */
  mediaStyle?: StyleProp<ViewStyle>;
  /** Render custom (override total). */
  renderAd?: (anuncio: Anuncio) => React.ReactNode;
  /** Render quando não há anúncio para o espaço. */
  renderEmpty?: () => React.ReactNode;
  /** Render durante o carregamento. */
  renderLoading?: () => React.ReactNode;
  /** Quantos ms o anúncio precisa ficar "montado" antes da impressão contar.
   *  Default: 1000ms (alinha com o padrão IAB). */
  impressionDelayMs?: number;
};

/**
 * Componente auto-tracking. Faz tudo: carrega, renderiza, marca impressão
 * passado `impressionDelayMs` (default 1s — assumindo visibilidade gerida pelo
 * componente pai, ex: dentro de uma FlatList com viewability config) e marca
 * clique no `onPress`.
 *
 * Para tracking de visibility real (rolagem dentro de FlatList), usa o
 * `viewabilityConfig` da FlatList + chama `markImpression()` no callback —
 * neste caso usa `useAd` directo em vez de `<AdView>`.
 */
export function AdView(props: AdViewProps) {
  const {
    style,
    mediaStyle,
    renderAd,
    renderEmpty,
    renderLoading,
    impressionDelayMs = 1000,
    ...req
  } = props;

  const { anuncio, loading, markImpression, markClick } = useAd(req);
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLayout = (e: LayoutChangeEvent) => {
    if (mounted) return;
    if (e.nativeEvent.layout.height > 0 && e.nativeEvent.layout.width > 0) {
      setMounted(true);
    }
  };

  useEffect(() => {
    if (!anuncio || !mounted) return;
    timerRef.current = setTimeout(() => {
      markImpression();
    }, impressionDelayMs);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [anuncio?.id, mounted, impressionDelayMs, markImpression]);

  if (loading) {
    if (renderLoading) {
      return <>{renderLoading()}</>;
    }
    return (
      <View style={[styles.container, style]} onLayout={handleLayout}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!anuncio) {
    if (renderEmpty) {
      return <>{renderEmpty()}</>;
    }
    return null;
  }

  if (renderAd) {
    return (
      <Pressable onPress={markClick} onLayout={handleLayout} style={style}>
        {renderAd(anuncio)}
      </Pressable>
    );
  }

  const asset = anuncio.assets?.[0];

  return (
    <Pressable onPress={markClick} onLayout={handleLayout} style={[styles.container, style]}>
      {asset?.tipo === 'imagem' && asset.url ? (
        <Image
          source={{ uri: asset.url }}
          style={[styles.media, mediaStyle as object]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.fallback, mediaStyle as object]}>
          <Text style={styles.fallbackText}>{anuncio.nome}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  media: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  fallback: {
    padding: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: '#374151',
    fontWeight: '600',
  },
});
