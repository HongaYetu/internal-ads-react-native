import { useEffect, useState } from 'react';
import { getAdsStorage } from '../utils/mmkvStore';

const STORAGE_KEY = '@hongayetu/internal-ads/device_id';

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Devolve um `device_id` estável por dispositivo, persistido em MMKV.
 *
 * Permite override via prop — útil para testes ou quando a app já tem o seu
 * próprio ID anonimizado.
 */
export function useDeviceId(override?: string | null): string | null {
  const [id, setId] = useState<string | null>(override ?? null);

  useEffect(() => {
    if (override) {
      setId(override);
      return;
    }
    try {
      const storage = getAdsStorage();
      let stored = storage.getString(STORAGE_KEY);
      const novo = !stored;
      if (!stored) {
        stored = uuidv4();
        storage.set(STORAGE_KEY, stored);
      }
      // eslint-disable-next-line no-console
      console.log('[hongayetu/ads] useDeviceId:', { deviceId: stored, novo });
      setId(stored);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[hongayetu/ads] useDeviceId: MMKV falhou, fallback UUID em memória', { erro: String(e) });
      setId(uuidv4());
    }
  }, [override]);

  return id;
}
