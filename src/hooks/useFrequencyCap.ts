import { getAdsStorage } from '../utils/mmkvStore';

/**
 * Frequency cap client-side persistido em MMKV. Espelha o cap do servidor —
 * o servidor é authority, isto é UX para evitar mostrar antes da resposta.
 */

type FreqEntry = { count: number; date: string };

function chave(espaco: string, sublocal: string | null | undefined): string {
  return `freq:${espaco}:${sublocal ?? '_'}`;
}

function hojeIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function lerFrequencia(espaco: string, sublocal: string | null | undefined): FreqEntry {
  try {
    const raw = getAdsStorage().getString(chave(espaco, sublocal));
    if (!raw) return { count: 0, date: hojeIso() };
    const parsed = JSON.parse(raw) as FreqEntry;
    if (parsed.date !== hojeIso()) return { count: 0, date: hojeIso() };
    return parsed;
  } catch {
    return { count: 0, date: hojeIso() };
  }
}

export function incrementarFrequencia(espaco: string, sublocal: string | null | undefined): void {
  const atual = lerFrequencia(espaco, sublocal);
  const novo: FreqEntry = { count: atual.count + 1, date: hojeIso() };
  try {
    getAdsStorage().set(chave(espaco, sublocal), JSON.stringify(novo));
  } catch {
    // ignore
  }
}

export function podeMostrar(
  espaco: string,
  sublocal: string | null | undefined,
  cap: number,
): boolean {
  if (!Number.isFinite(cap) || cap <= 0) return true;
  return lerFrequencia(espaco, sublocal).count < cap;
}

/**
 * Timestamp (ms epoch) da última exibição do par (espaco, sublocal). `0` se
 * nunca foi mostrado. Usado pelo `<AdInterstitial>` para respeitar o cooldown
 * (`politica.intervalo_minimo_segundos`).
 */
function lastShownKey(espaco: string, sublocal: string | null | undefined): string {
  return `lastShown:${espaco}:${sublocal ?? '_'}`;
}

export function lerUltimaExibicaoMs(espaco: string, sublocal: string | null | undefined): number {
  try {
    const raw = getAdsStorage().getString(lastShownKey(espaco, sublocal));
    return raw ? Number.parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function gravarUltimaExibicaoMs(espaco: string, sublocal: string | null | undefined): void {
  try {
    getAdsStorage().set(lastShownKey(espaco, sublocal), String(Date.now()));
  } catch {
    // ignore
  }
}
