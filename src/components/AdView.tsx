import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useAdsContext } from '../context/AdsProvider';
import { useAd, type UseAdState } from '../hooks/useAd';
import type { AdAsset, AdServeRequest, Anuncio } from '../types';

// Lazy import de expo-video — se a app não tiver instalado, fallback automático
// para thumbnail (imagem estática).
let lazyVideoView: any = null;
let lazyUseVideoPlayer: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('expo-video');
  lazyVideoView = mod.VideoView ?? null;
  lazyUseVideoPlayer = mod.useVideoPlayer ?? null;
} catch {
  // expo-video não instalado — vídeos renderizam só com thumbnail.
}

export type AdViewProps = AdServeRequest & {
  style?: StyleProp<ViewStyle>;
  mediaStyle?: StyleProp<ViewStyle>;
  /** Render custom (override total). */
  renderAd?: (anuncio: Anuncio) => React.ReactNode;
  /** Render quando não há anúncio para o espaço. */
  renderEmpty?: () => React.ReactNode;
  /** Render durante o carregamento. */
  renderLoading?: () => React.ReactNode;
  /**
   * Quantos ms o anúncio precisa ficar "montado" antes da impressão contar.
   * Default: **1000ms para imagem, 2000ms para vídeo** (alinha com IAB MRC).
   * Passa explicitamente para override.
   */
  impressionDelayMs?: number;
  /**
   * Estado pré-fetchado de `useAd`. Quando fornecido, o componente NÃO
   * dispara o seu próprio pedido — usa o estado do parent (ex: AdSlot).
   */
  prefetched?: UseAdState;
};

export function AdView(props: AdViewProps) {
  const {
    style,
    mediaStyle,
    renderAd,
    renderEmpty,
    renderLoading,
    impressionDelayMs,
    prefetched,
    ...req
  } = props;

  const ownState = useAd({ ...req, enabled: !prefetched });
  const state = prefetched ?? ownState;
  const { anuncio, tokens, loading, markImpression, markClick } = state;
  const { baseUrl, mode } = useAdsContext();
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLayout = (e: LayoutChangeEvent) => {
    if (mounted) return;
    if (e.nativeEvent.layout.height > 0 && e.nativeEvent.layout.width > 0) {
      setMounted(true);
    }
  };

  const asset = anuncio?.assets?.[0];
  const effectiveDelay =
    impressionDelayMs ?? (asset?.tipo === 'video' ? 2000 : 1000);

  useEffect(() => {
    if (!anuncio || !mounted) return;
    timerRef.current = setTimeout(() => {
      markImpression();
    }, effectiveDelay);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [anuncio?.id, mounted, effectiveDelay, markImpression]);

  // Em modo proxy, o click vai por GET nativo: o `Pressable` abre o URL do
  // proxy via `Linking.openURL`. O proxy regista server-side e devolve 302
  // para o destino. Mais robusto contra falhas de rede de POST + redirect.
  const useProxyClick = mode === 'proxy' && !!tokens?.click;
  const proxyClickUrl = useMemo(() => {
    if (!useProxyClick) return null;
    return `${baseUrl.replace(/\/+$/, '')}/click/${encodeURIComponent(tokens!.click)}`;
  }, [useProxyClick, baseUrl, tokens?.click]);

  const handlePress = async () => {
    if (proxyClickUrl) {
      try {
        const canOpen = await Linking.canOpenURL(proxyClickUrl).catch(() => false);
        if (canOpen) {
          await Linking.openURL(proxyClickUrl);
          return;
        }
      } catch {
        // cai para fallback
      }
    }
    await markClick();
  };

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
      <Pressable onPress={handlePress} onLayout={handleLayout} style={style}>
        {renderAd(anuncio)}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      onLayout={handleLayout}
      style={[styles.container, style]}
    >
      <View style={styles.assetWrap}>
        {renderAsset(asset, mediaStyle, anuncio.nome)}
        <View style={styles.adLabelWrap} pointerEvents="none">
          <Text style={styles.adLabelText}>Anúncio.</Text>
        </View>
      </View>
    </Pressable>
  );
}

function renderAsset(
  asset: AdAsset | undefined,
  mediaStyle: StyleProp<ViewStyle> | undefined,
  fallbackName: string,
): React.ReactNode {
  if (!asset) {
    return (
      <View style={[styles.fallback, mediaStyle as object]}>
        <Text style={styles.fallbackText}>{fallbackName}</Text>
      </View>
    );
  }

  // Aspect ratio do asset (versão ou original). Quando indisponível, 16:9.
  const aspectRatio =
    asset.largura && asset.altura ? asset.largura / asset.altura : 16 / 9;
  const sizingStyle: ViewStyle = {
    width: '100%',
    aspectRatio,
    ...(asset.largura ? { maxWidth: asset.largura } : null),
    ...(asset.altura ? { maxHeight: asset.altura } : null),
  };

  if (asset.tipo === 'imagem' && asset.url) {
    return (
      <Image
        source={{ uri: asset.url }}
        style={[sizingStyle, mediaStyle as object]}
        resizeMode="contain"
      />
    );
  }

  if (asset.tipo === 'video') {
    return <VideoAsset asset={asset} sizingStyle={sizingStyle} mediaStyle={mediaStyle} />;
  }

  return (
    <View style={[styles.fallback, mediaStyle as object]}>
      <Text style={styles.fallbackText}>{fallbackName}</Text>
    </View>
  );
}

function VideoAsset({
  asset,
  sizingStyle,
  mediaStyle,
}: {
  asset: AdAsset;
  sizingStyle: ViewStyle;
  mediaStyle: StyleProp<ViewStyle> | undefined;
}) {
  const sourceUrl = asset.hls_url || asset.url;
  const poster = asset.thumbnail_url;

  if (!lazyVideoView || !lazyUseVideoPlayer) {
    return (
      <Image
        source={{ uri: poster || sourceUrl || undefined }}
        style={[sizingStyle, mediaStyle as object]}
        resizeMode="contain"
      />
    );
  }

  return (
    <ExpoVideoInner
      sourceUrl={sourceUrl ?? null}
      poster={poster ?? null}
      sizingStyle={sizingStyle}
      mediaStyle={mediaStyle}
    />
  );
}

function ExpoVideoInner({
  sourceUrl,
  poster,
  sizingStyle,
  mediaStyle,
}: {
  sourceUrl: string | null;
  poster: string | null;
  sizingStyle: ViewStyle;
  mediaStyle: StyleProp<ViewStyle> | undefined;
}) {
  const VideoView = lazyVideoView;
  const useVideoPlayer = lazyUseVideoPlayer;

  const player = useVideoPlayer(sourceUrl ?? '', (p: any) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  if (!sourceUrl) {
    return (
      <Image
        source={{ uri: poster || undefined }}
        style={[sizingStyle, mediaStyle as object]}
        resizeMode="contain"
      />
    );
  }

  return (
    <VideoView
      style={[sizingStyle, mediaStyle as object]}
      player={player}
      contentFit="contain"
      nativeControls={false}
      allowsFullscreen={false}
      allowsPictureInPicture={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetWrap: {
    position: 'relative',
    alignSelf: 'center',
  },
  adLabelWrap: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 3,
    zIndex: 2,
  },
  adLabelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
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
