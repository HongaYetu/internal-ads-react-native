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
   * Altura reservada do slot quando `formatos` não é fornecido. Evita layout
   * shift em listas. Quando `formatos` está presente, a altura deriva-se do
   * primeiro formato (proporcional à largura). Default: 180.
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
 * Filosofia (v0.3+): o tamanho do slot **vem da prop `formatos`**, não da
 * medição via `onLayout`. O consumer declara
 * `formatos={[{largura:728,altura:90}]}` e o slot reserva exactamente 728×90
 * (centrado), faz 1 só fetch com `formatos_aceites`, e a API devolve um asset
 * desse tamanho ou no-fill.
 *
 * - **Lazy mount**: só chama `/serve` quando o slot fica no viewport.
 * - **Sem auto-medição**: o `onLayout` apenas detecta visibilidade (lazy mount).
 *   As dimensões do slot vêm de `formatos`.
 * - **Collapse-on-empty**: 0px quando não há anúncio.
 * - **Sem `formatos`** (legacy): usa `reservedHeight` como altura e não envia
 *   slot dims — a API faz matching aproximado.
 *
 * ```tsx
 * <AdSlot
 *   espacoSlug="humbi_shop"
 *   sublocal="lista_produtos"
 *   formatos={[{ largura: 728, altura: 90 }]}
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

  const handleLayout = (e: LayoutChangeEvent) => {
    if (visible) return;
    if (e.nativeEvent.layout.height > 0 && e.nativeEvent.layout.width > 0) {
      setVisible(true);
    }
  };

  // Dimensão preferida derivada de `formatos[0]`. Se múltiplos formatos,
  // usamos o 1º como referência visual; a API decide qual devolver e
  // o `<AdView>` ajusta-se via aspect-ratio do asset.
  const primario = adProps.formatos?.[0] ?? null;
  const intrinsicStyle: ViewStyle = primario
    ? {
        width: '100%',
        maxWidth: primario.largura,
        aspectRatio: primario.largura / primario.altura,
        alignSelf: 'center',
      }
    : { height: reservedHeight, width: '100%' };

  if (lazy && !visible) {
    return (
      <View
        onLayout={handleLayout}
        style={[
          styles.skeleton,
          intrinsicStyle,
          { backgroundColor: skeletonColor },
          containerStyle,
        ]}
      />
    );
  }

  return (
    <View style={[intrinsicStyle, containerStyle]}>
      <AdView
        {...adProps}
        style={{ width: '100%', height: '100%' }}
        renderLoading={() => (
          <View
            style={[
              styles.skeleton,
              { width: '100%', height: '100%', backgroundColor: skeletonColor },
            ]}
          />
        )}
        renderEmpty={() => null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    borderRadius: 8,
  },
});
