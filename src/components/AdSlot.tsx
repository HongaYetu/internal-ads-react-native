import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { AdView, type AdViewProps } from './AdView';

export type AdSlotProps = AdViewProps & {
  /**
   * Altura reservada do slot enquanto carrega (placeholder).
   * Evita layout shift em listas. Default: 180.
   */
  reservedHeight?: number;
  /**
   * Quando true, só faz o pedido `/serve` quando o slot entra no viewport
   * (cria um placeholder primeiro). Default: true.
   */
  lazy?: boolean;
  /** Cor do skeleton. Default: '#f3f4f6' (gray-100). */
  skeletonColor?: string;
  /** Estilo do container exterior. */
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Wrapper recomendado para inserção em listas (FlatList/ScrollView).
 *
 * Diferenças vs. `<AdView>`:
 * - **Lazy mount**: só chama `/serve` quando o slot fica no viewport.
 * - **Skeleton com altura reservada**: evita layout shift quando o anúncio carrega.
 * - **Collapse-on-empty**: quando não há anúncio para o espaço, o slot ocupa 0px
 *   (em vez do skeleton) — não afecta a leitura da lista.
 *
 * ```tsx
 * <FlatList
 *   data={interpolarComAds(produtos, 6)}
 *   renderItem={({ item }) =>
 *     item.tipo === 'ad'
 *       ? <AdSlot espacoId={1} origem="humbi_shop" sublocal="lista_produtos" />
 *       : <ProdutoCard produto={item} />
 *   }
 * />
 * ```
 */
export function AdSlot(props: AdSlotProps) {
  const {
    reservedHeight = 180,
    lazy = true,
    skeletonColor = '#f3f4f6',
    containerStyle,
    ...adProps
  } = props;

  const [visible, setVisible] = useState(!lazy);
  const [resolved, setResolved] = useState(false);

  const handleLayout = (e: LayoutChangeEvent) => {
    if (visible) return;
    if (e.nativeEvent.layout.height > 0 && e.nativeEvent.layout.width > 0) {
      setVisible(true);
    }
  };

  if (lazy && !visible) {
    return (
      <View
        onLayout={handleLayout}
        style={[
          styles.skeleton,
          { height: reservedHeight, backgroundColor: skeletonColor },
          containerStyle,
        ]}
      />
    );
  }

  return (
    <View style={containerStyle}>
      <AdView
        {...adProps}
        renderLoading={() => (
          <View
            style={[
              styles.skeleton,
              { height: reservedHeight, backgroundColor: skeletonColor },
            ]}
          />
        )}
        renderEmpty={() => {
          // Collapse total quando não há anúncio: ocupa 0px.
          if (!resolved) {
            // setTimeout evita re-render durante render
            setTimeout(() => setResolved(true), 0);
          }
          return null;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    width: '100%',
    borderRadius: 8,
  },
});
