import { createMMKV, type MMKV } from 'react-native-mmkv';

/**
 * Instância MMKV partilhada por todos os hooks/utils do SDK.
 *
 * Notas importantes:
 * - `react-native-mmkv` v4 abandonou a forma `new MMKV(...)`. A factory é
 *   `createMMKV()` — `MMKV` passou a ser apenas um type. Usar o construtor
 *   antigo lança `TypeError: Cannot read property 'prototype' of undefined`.
 * - O import é top-level para o Metro resolver, mas `createMMKV()` só corre
 *   no primeiro acesso porque NitroModules pode não estar pronto no momento
 *   em que o módulo é avaliado.
 */
let instancia: MMKV | null = null;

export function getAdsStorage(): MMKV {
  if (!instancia) {
    instancia = createMMKV({ id: 'hongayetu-internal-ads' });
  }
  return instancia;
}
