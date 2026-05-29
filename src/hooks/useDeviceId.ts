import { useEffect, useState } from 'react';

const STORAGE_KEY = '@hongayetu/internal-ads/device_id';

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type AsyncStorageLike = {
  getItem: (k: string) => Promise<string | null>;
  setItem: (k: string, v: string) => Promise<void>;
};

let cachedStorage: AsyncStorageLike | null = null;
function getStorage(): AsyncStorageLike | null {
  if (cachedStorage !== null) {
    return cachedStorage;
  }
  try {
    // Lazy import — AsyncStorage é peerDep opcional; se a app não tiver
    // instalado, o SDK degrada para device_id por sessão (não persistido).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-async-storage/async-storage');
    cachedStorage = (mod.default ?? mod) as AsyncStorageLike;
  } catch {
    cachedStorage = null;
  }
  return cachedStorage;
}

/**
 * Devolve um `device_id` estável por dispositivo, persistido em AsyncStorage
 * (ou só em memória se a app não tiver AsyncStorage instalado).
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
    let cancelado = false;
    (async () => {
      const storage = getStorage();
      if (!storage) {
        // Fallback: usa um UUID de sessão (perde-se no reload).
        if (!cancelado) {
          setId((prev) => prev ?? uuidv4());
        }
        return;
      }
      try {
        let stored = await storage.getItem(STORAGE_KEY);
        if (!stored) {
          stored = uuidv4();
          await storage.setItem(STORAGE_KEY, stored);
        }
        if (!cancelado) {
          setId(stored);
        }
      } catch {
        if (!cancelado) {
          setId(uuidv4());
        }
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [override]);

  return id;
}
