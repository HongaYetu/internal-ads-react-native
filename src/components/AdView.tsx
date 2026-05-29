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
};

export function AdView(props: AdViewProps) {
  const {
    style,
    mediaStyle,
    renderAd,
    renderEmpty,
    renderLoading,
    impressionDelayMs,
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

  return (
    <Pressable
      onPress={markClick}
      onLayout={handleLayout}
      style={[styles.container, style]}
    >
      {renderAsset(asset, mediaStyle, anuncio.nome)}
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

  if (asset.tipo === 'imagem' && asset.url) {
    return (
      <Image
        source={{ uri: asset.url }}
        style={[styles.media, mediaStyle as object]}
        resizeMode="cover"
      />
    );
  }

  if (asset.tipo === 'video') {
    return <VideoAsset asset={asset} mediaStyle={mediaStyle} />;
  }

  // Texto ou desconhecido — fallback simples.
  return (
    <View style={[styles.fallback, mediaStyle as object]}>
      <Text style={styles.fallbackText}>{fallbackName}</Text>
    </View>
  );
}

function VideoAsset({
  asset,
  mediaStyle,
}: {
  asset: AdAsset;
  mediaStyle: StyleProp<ViewStyle> | undefined;
}) {
  const sourceUrl = asset.hls_url || asset.url;
  const poster = asset.thumbnail_url;

  // Se expo-video não está disponível, renderiza thumbnail como fallback.
  if (!lazyVideoView || !lazyUseVideoPlayer) {
    return (
      <Image
        source={{ uri: poster || sourceUrl || undefined }}
        style={[styles.media, mediaStyle as object]}
        resizeMode="cover"
      />
    );
  }

  return (
    <ExpoVideoInner
      sourceUrl={sourceUrl ?? null}
      poster={poster ?? null}
      mediaStyle={mediaStyle}
    />
  );
}

// Wrapper interno para o expo-video — só renderiza se o módulo está disponível.
function ExpoVideoInner({
  sourceUrl,
  poster,
  mediaStyle,
}: {
  sourceUrl: string | null;
  poster: string | null;
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
        style={[styles.media, mediaStyle as object]}
        resizeMode="cover"
      />
    );
  }

  return (
    <VideoView
      style={[styles.media, mediaStyle as object]}
      player={player}
      contentFit="cover"
      nativeControls={false}
      allowsFullscreen={false}
      allowsPictureInPicture={false}
    />
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
