import type { AdServeRequest, AdServeResponse } from '../types';

/**
 * Cliente HTTP fino para a API v2 de anúncios. Não é uma classe — funções
 * puras que recebem `baseUrl + token + deviceId`. Mantém o pacote sem estado
 * (o `AdsProvider` segura essa info via Context).
 */

type ClientCtx = {
  baseUrl: string;
  token: string;
  deviceId: string | null;
};

class AdsApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'AdsApiError';
  }
}

async function post<T>(ctx: ClientCtx, path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${ctx.baseUrl}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ctx.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.estado === 'erro') {
    throw new AdsApiError(
      data?.texto || `HTTP ${res.status}`,
      res.status,
    );
  }
  return data?.data ?? data;
}

export async function serve(
  ctx: ClientCtx,
  req: AdServeRequest,
): Promise<AdServeResponse | null> {
  const data = await post<AdServeResponse | null>(ctx, '/serve', {
    espaco_id: req.espacoId,
    formato_id: req.formatoId ?? null,
    origem: req.origem ?? null,
    sublocal: req.sublocal ?? null,
    device_id: ctx.deviceId,
    user_age: req.userAge ?? null,
    geo_country: req.geoCountry ?? null,
  });
  return data;
}

export async function trackImpression(ctx: ClientCtx, token: string): Promise<void> {
  await post(ctx, '/impression', {
    token,
    device_id: ctx.deviceId,
  });
}

export async function trackClick(
  ctx: ClientCtx,
  token: string,
): Promise<{ redirect_url: string | null }> {
  return post<{ redirect_url: string | null }>(ctx, '/click', {
    token,
    device_id: ctx.deviceId,
  });
}

export { AdsApiError };
