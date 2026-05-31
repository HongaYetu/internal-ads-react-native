import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAd } from '../hooks/useAd';
import {
  incrementarFrequencia,
  podeMostrar,
  lerUltimaExibicaoMs,
  gravarUltimaExibicaoMs,
} from '../hooks/useFrequencyCap';
import type { AdServeRequest } from '../types';

// Lazy require de expo-video — peerDep optional. Sem ele, vídeos fazem fallback
// para thumbnail estático.
let lazyVideoView: any = null;
let lazyUseVideoPlayer: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('expo-video');
  lazyVideoView = mod.VideoView ?? null;
  lazyUseVideoPlayer = mod.useVideoPlayer ?? null;
} catch {
  // expo-video não instalado.
}

export type AdInterstitialProps = AdServeRequest & {
  open: boolean;
  onClose: () => void;
  onPresented?: () => void;
  onSkip?: () => void;
  onCompleted?: () => void;
};

/**
 * Anúncio intersticial full-screen (RN) — imagem ou vídeo via `expo-video`.
 *
 * Política (skip_after_ms, frequency_cap_dia, interstitial_min_view_ms) vem
 * do servidor via `useAd().politica`. Tracking de vídeo é automático.
 */
export function AdInterstitial(props: AdInterstitialProps) {
  const { open, onClose, onPresented, onSkip, onCompleted, ...req } = props;

  const {
    anuncio,
    politica,
    loading,
    markImpression,
    markClick,
    markVideoEvent,
  } = useAd(req);

  const [montadoEmMs, setMontadoEmMs] = useState<number | null>(null);
  const [agoraMs, setAgoraMs] = useState<number>(() => Date.now());
  const fechouRef = useRef(false);

  const asset = anuncio?.assets?.[0] ?? null;
  const ehVideo = asset?.tipo === 'video';
  const cap = politica?.frequency_cap_dia ?? Infinity;
  const cooldownMs = (politica?.intervalo_minimo_segundos ?? 0) * 1000;

  useEffect(() => {
    if (!open) {
      setMontadoEmMs(null);
      fechouRef.current = false;
      return;
    }
    if (loading) return;
    if (!anuncio || !asset) {
      if (!fechouRef.current) {
        fechouRef.current = true;
        onClose();
      }
      return;
    }
    if (!podeMostrar(req.espacoSlug, req.sublocal, cap)) {
      if (!fechouRef.current) {
        fechouRef.current = true;
        onClose();
      }
      return;
    }
    // Cooldown desde última exibição não passou — não mostra.
    if (cooldownMs > 0) {
      const lastMs = lerUltimaExibicaoMs(req.espacoSlug, req.sublocal);
      if (lastMs > 0 && Date.now() - lastMs < cooldownMs) {
        if (!fechouRef.current) {
          fechouRef.current = true;
          onClose();
        }
        return;
      }
    }
    setMontadoEmMs(Date.now());
    incrementarFrequencia(req.espacoSlug, req.sublocal);
    gravarUltimaExibicaoMs(req.espacoSlug, req.sublocal);
    onPresented?.();
    if (!ehVideo) {
      const t = setTimeout(() => markImpression(), 1000);
      return () => clearTimeout(t);
    }
  }, [open, loading, anuncio?.id, asset?.id, cap, cooldownMs, ehVideo, req.espacoSlug, req.sublocal, markImpression, onClose, onPresented]);

  useEffect(() => {
    if (!open || montadoEmMs === null) return;
    const id = setInterval(() => setAgoraMs(Date.now()), 250);
    return () => clearInterval(id);
  }, [open, montadoEmMs]);

  const elapsedMs = montadoEmMs ? agoraMs - montadoEmMs : 0;
  const skipDisponivel = elapsedMs >= (politica?.skip_after_ms ?? 5000);
  const fecharDisponivel = elapsedMs >= (politica?.interstitial_min_view_ms ?? 0);

  const handleSkip = useCallback(() => {
    markVideoEvent('skip');
    onSkip?.();
    onClose();
  }, [markVideoEvent, onClose, onSkip]);

  const handleClose = useCallback(() => {
    markVideoEvent('close');
    onClose();
  }, [markVideoEvent, onClose]);

  const handleCta = useCallback(() => {
    markClick();
    onClose();
  }, [markClick, onClose]);

  if (!open) return null;
  if (loading || !anuncio || !asset) return null;

  return (
    <Modal visible={open} animationType="fade" statusBarTranslucent transparent={false}>
      <StatusBar hidden />
      <View style={styles.container}>
        <View style={styles.label} pointerEvents="none">
          <Text style={styles.labelText}>Anúncio.</Text>
        </View>

        <View style={styles.midia}>
          {ehVideo ? (
            <InterstitialVideo
              src={asset.mp4_url || asset.url || asset.hls_url || ''}
              poster={asset.thumbnail_url ?? null}
              onStart={() => {
                markImpression();
                markVideoEvent('start', 0);
              }}
              onQuartil={(q, posMs) => markVideoEvent(q, posMs)}
              onComplete={() => {
                markVideoEvent('complete');
                onCompleted?.();
              }}
            />
          ) : (
            <Image
              source={{ uri: asset.url ?? undefined }}
              style={styles.imagem}
              resizeMode="contain"
            />
          )}
        </View>

        {asset.texto_cta && (
          <Pressable onPress={handleCta} style={styles.cta}>
            <Text style={styles.ctaTexto}>{asset.texto_cta}</Text>
          </Pressable>
        )}

        {skipDisponivel ? (
          <Pressable onPress={handleSkip} style={styles.skip}>
            <Text style={styles.skipTexto}>Skip Anúncio</Text>
          </Pressable>
        ) : (
          <View style={styles.skipDisabled}>
            <Text style={styles.skipDisabledTexto}>
              {Math.max(0, Math.ceil(((politica?.skip_after_ms ?? 5000) - elapsedMs) / 1000))}s
            </Text>
          </View>
        )}

        <Pressable
          onPress={fecharDisponivel ? handleClose : undefined}
          disabled={!fecharDisponivel}
          style={[styles.fechar, !fecharDisponivel && styles.fecharDisabled]}
          accessibilityLabel="Fechar"
        >
          <Text style={[styles.fecharX, !fecharDisponivel && styles.fecharXDisabled]}>×</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function InterstitialVideo({
  src,
  poster,
  onStart,
  onQuartil,
  onComplete,
}: {
  src: string;
  poster: string | null;
  onStart: () => void;
  onQuartil: (q: 'quartil_25' | 'quartil_50' | 'quartil_75', posMs: number) => void;
  onComplete: () => void;
}) {
  if (!lazyVideoView || !lazyUseVideoPlayer) {
    return (
      <Image
        source={{ uri: poster ?? src }}
        style={styles.imagem}
        resizeMode="contain"
      />
    );
  }
  return (
    <ExpoVideoInner
      src={src}
      onStart={onStart}
      onQuartil={onQuartil}
      onComplete={onComplete}
    />
  );
}

function ExpoVideoInner({
  src,
  onStart,
  onQuartil,
  onComplete,
}: {
  src: string;
  onStart: () => void;
  onQuartil: (q: 'quartil_25' | 'quartil_50' | 'quartil_75', posMs: number) => void;
  onComplete: () => void;
}) {
  const VideoView = lazyVideoView;
  const useVideoPlayer = lazyUseVideoPlayer;
  const startedRef = useRef(false);
  const quartisRef = useRef({ q25: false, q50: false, q75: false });

  const player = useVideoPlayer(src, (p: any) => {
    p.loop = false;
    p.muted = false;
    p.play();
  });

  useEffect(() => {
    if (!player) return;
    const id = setInterval(() => {
      const current = player.currentTime ?? 0;
      const duration = player.duration ?? 0;
      if (!startedRef.current && current > 0) {
        startedRef.current = true;
        onStart();
      }
      if (duration > 0) {
        const pct = current / duration;
        const pos = Math.floor(current * 1000);
        if (pct >= 0.25 && !quartisRef.current.q25) {
          quartisRef.current.q25 = true;
          onQuartil('quartil_25', pos);
        }
        if (pct >= 0.5 && !quartisRef.current.q50) {
          quartisRef.current.q50 = true;
          onQuartil('quartil_50', pos);
        }
        if (pct >= 0.75 && !quartisRef.current.q75) {
          quartisRef.current.q75 = true;
          onQuartil('quartil_75', pos);
        }
        if (current >= duration - 0.1 && duration > 0.1) {
          onComplete();
        }
      }
    }, 250);
    return () => clearInterval(id);
  }, [player, onStart, onQuartil, onComplete]);

  return (
    <VideoView
      style={styles.imagem}
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
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  midia: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagem: {
    width: '100%',
    height: '100%',
  },
  label: {
    position: 'absolute',
    top: 48,
    left: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    zIndex: 10,
  },
  labelText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  cta: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: '#f97316',
    borderRadius: 999,
  },
  ctaTexto: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  skip: {
    position: 'absolute',
    top: 48,
    right: 60,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  skipTexto: {
    color: '#fff',
    fontSize: 12,
  },
  skipDisabled: {
    position: 'absolute',
    top: 48,
    right: 60,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
  },
  skipDisabledTexto: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  fechar: {
    position: 'absolute',
    top: 48,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fecharDisabled: {
    opacity: 0.4,
  },
  fecharX: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  fecharXDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },
});
