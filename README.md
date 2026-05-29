# @hongayetu/internal-ads-react-native

SDK React Native para consumir a **API v2 de anúncios** da HongaYetu (`/api/v2/ads/*`).

> ⚠️ Package interno do ecossistema HongaYetu. As versões seguem o ritmo da central — breaking changes podem ocorrer dentro de releases minor. Não recomendado para terceiros fora do ecossistema.

## Instalação

```bash
npm install @hongayetu/internal-ads-react-native
# opcional mas recomendado para persistir device_id entre sessões:
npm install @react-native-async-storage/async-storage
```

## ⚠️ Modelo de segurança — leitura obrigatória

O SDK suporta **dois modos**: `direct` e `proxy`. **Para apps mobile públicas, usa sempre `proxy`.**

| Modo | Token no bundle? | Quando usar |
|---|---|---|
| `direct` | Sim — ConnectedProject token visível por reverse engineering | Apps internas, testes, ou web onde o servidor já é o cliente. |
| `proxy` | Não — só um token de sessão do utilizador da tua app | **Padrão para Humbi, TicketVerse, qualquer app distribuída publicamente.** |

A central tem mitigações server-side (HMAC + replay protection + frequency cap + circuit breaker de orçamento), mas um token estático embutido no bundle pode ser extraído. Em `proxy`, o token HongaYetu fica no servidor do consumer; o app mobile fala apenas com o backend dele, autenticado como o utilizador real.

Para o backend do consumer (Laravel) existe um **composer package companheiro** que implementa o proxy automaticamente — basta `composer require` + 2 vars no `.env`.

## Configuração — modo `proxy` (recomendado)

No backend do consumer (Laravel):
```bash
composer require hongayetu/internal-ads-proxy
```
```dotenv
HONGAYETU_ADS_BASE_URL=https://anuncios.hongayetu.com/api/v2/ads
HONGAYETU_ADS_TOKEN=<bearer-token-da-Filament>
```
Rotas `POST /api/ads-proxy/{serve,impression,click}` ficam disponíveis com `auth:sanctum` por defeito. Ver [`hongayetu/internal-ads-proxy`](https://github.com/HongaYetu/internal-ads-proxy) para customização (prefix, middleware, etc).

App mobile:
```tsx
import { AdsProvider } from '@hongayetu/internal-ads-react-native';

export default function App() {
  return (
    <AdsProvider
      config={{
        baseUrl: 'https://api.humbi.com/ads-proxy', // teu backend
        token: usuario.sanctumToken,                 // sessão da tua app
        mode: 'proxy',
      }}
    >
      <RootNavigator />
    </AdsProvider>
  );
}
```

## Configuração — modo `direct` (só para casos controlados)

```tsx
<AdsProvider
  config={{
    baseUrl: 'https://anuncios.hongayetu.com/api/v2/ads',
    token: '<ConnectedProject bearer token>',
    mode: 'direct', // explícito
  }}
>
  <RootNavigator />
</AdsProvider>
```

O `device_id` é gerado automaticamente (UUID v4) e persistido em AsyncStorage.

## Vídeo (opcional)

O SDK renderiza vídeos via [`expo-video`](https://docs.expo.dev/versions/latest/sdk/video/). É um **peerDep opcional** — instala se a tua app for receber anúncios de vídeo:

```bash
npx expo install expo-video
```

Se não instalares, vídeos caem em fallback gracioso (mostra o thumbnail estático). Os anúncios de imagem continuam a funcionar sem `expo-video`.

Quando instalado, o vídeo:
- Prefere `hls_url` (HLS adaptive) > `url` (MP4 progressive).
- Autoplay, muted, loop, sem controles.
- Thumbnail como poster antes de carregar.
- Impressão conta após 2s visível (vs 1s para imagem — alinha com IAB MRC).

## Uso em listas — `<AdSlot>`

**Recomendado para qualquer FlatList/ScrollView.** Faz lazy mount (só chama `/serve` quando entra no viewport), reserva altura para evitar layout shift e colapsa a 0px quando não há anúncio.

```tsx
import { AdSlot } from '@hongayetu/internal-ads-react-native';

function ProductList({ produtos }) {
  // Interpola um AdSlot a cada 6 produtos.
  const items = interpolarComAds(produtos, 6);

  return (
    <FlatList
      data={items}
      keyExtractor={(item, idx) => item.tipo === 'ad' ? `ad-${idx}` : item.id}
      renderItem={({ item }) =>
        item.tipo === 'ad' ? (
          <AdSlot
            espacoId={1}
            origem="humbi_shop"
            sublocal="lista_produtos"
            reservedHeight={180}
          />
        ) : (
          <ProductCard produto={item} />
        )
      }
    />
  );
}

function interpolarComAds<T>(items: T[], intervalo: number): Array<T | { tipo: 'ad' }> {
  const out: Array<T | { tipo: 'ad' }> = [];
  items.forEach((it, i) => {
    out.push(it);
    if ((i + 1) % intervalo === 0) out.push({ tipo: 'ad' });
  });
  return out;
}
```

## Uso simples — `<AdView>`

Componente auto-tracking que trata de tudo (load → render → impressão → clique → redirect). **Para listas usa `<AdSlot>`**; para um anúncio fixo (ex: banner numa screen estática), `<AdView>` chega:

```tsx
import { AdView } from '@hongayetu/internal-ads-react-native';

function Feed() {
  return (
    <ScrollView>
      <AdView
        espacoId={1}
        origem="humbi_shop"
        sublocal="feed"
        userAge={user.idade}
        style={{ marginVertical: 12 }}
      />
      {/* outros itens do feed */}
    </ScrollView>
  );
}
```

### Customização

```tsx
<AdView
  espacoId={1}
  renderLoading={() => <Skeleton />}
  renderEmpty={() => null}
  renderAd={(anuncio) => (
    <YourCustomCard
      titulo={anuncio.nome}
      imagem={anuncio.assets[0]?.url}
    />
  )}
  impressionDelayMs={1500}
/>
```

## Uso avançado — `useAd`

Se precisares de controlo manual (ex: tracking de visibilidade dentro de uma `FlatList`):

```tsx
import { useAd } from '@hongayetu/internal-ads-react-native';

function PromoCard() {
  const { anuncio, loading, error, markImpression, markClick, refresh } = useAd({
    espacoId: 2,
    origem: 'ticketverse',
    sublocal: 'evento_show',
  });

  if (loading) return <Spinner />;
  if (!anuncio) return null;

  return (
    <Pressable onPress={markClick}>
      <Image source={{ uri: anuncio.assets[0]?.url }} />
      <Text>{anuncio.nome}</Text>
    </Pressable>
  );
}
```

### Tracking de visibility com FlatList

```tsx
import { FlatList, ViewToken } from 'react-native';
import { useAd } from '@hongayetu/internal-ads-react-native';

const espacoId = 1;

function MyFeed({ items }) {
  const { anuncio, tokens, markImpression, markClick } = useAd({ espacoId });

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.some((v) => v.key === 'ad-slot')) {
      markImpression();
    }
  }, [markImpression]);

  return (
    <FlatList
      data={[{ key: 'ad-slot' }, ...items]}
      renderItem={({ item }) => {
        if (item.key === 'ad-slot' && anuncio) {
          return (
            <Pressable onPress={markClick}>
              <Image source={{ uri: anuncio.assets[0]?.url }} />
            </Pressable>
          );
        }
        return <YourItem item={item} />;
      }}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={{ itemVisiblePercentThreshold: 50, minimumViewTime: 1000 }}
    />
  );
}
```

## API

### `AdsProvider`

| Prop | Tipo | Descrição |
|------|------|-----------|
| `config.baseUrl` | `string` | URL completa até `/api/v2/ads` (sem barra final). |
| `config.token` | `string` | Bearer token emitido pela HongaYetu (ConnectedProject ou JWT interno). |
| `config.deviceId` | `string?` | Override do device_id (default: persistido em AsyncStorage). |
| `config.debug` | `boolean?` | Log de erros e eventos em dev. |

### `useAd(req)`

Retorna `{ anuncio, tokens, loading, error, refresh, markImpression, markClick }`.

### `AdView` — props extra além de `req`

| Prop | Tipo | Default | Descrição |
|------|------|---------|-----------|
| `impressionDelayMs` | `number` | `1000` | Tempo até marcar impressão depois de montar. |
| `renderLoading` | `() => ReactNode` | spinner | Estado de carregamento. |
| `renderEmpty` | `() => ReactNode` | `null` | Quando não há anúncio para o espaço. |
| `renderAd` | `(anuncio) => ReactNode` | imagem + nome | Render custom. |
| `style` | `ViewStyle` | — | Container. |
| `mediaStyle` | `ViewStyle` | 16:9 | Imagem/vídeo. |

## Comportamento de segurança

### No SDK (cliente)
- **device_id**: UUID v4 anónimo (não correlaciona com user, conta ou outros IDs).
- **Sem inspecção de tokens**: o SDK trata `impression_token` / `click_token` como opacos. Replay e tampering bloqueados server-side.
- **Modo proxy**: token HongaYetu nunca presente no bundle (ver acima).

### No servidor (central HongaYetu)
- **HMAC assinada** em cada token de impressão/clique. Tampering é rejeitado.
- **Nonce one-shot** via Redis SETNX. Replay → 422.
- **Device hash matching**: o token só pode ser redeemed pelo mesmo `device_id` que pediu o `/serve`.
- **Frequency cap** por (device, anúncio, dia) — default 5x/dia, override por anúncio.
- **Circuit breaker de orçamento por projecto**: cap diário em Kz por ConnectedProject configurado no Filament. Quando atingido, `/serve` devolve `null` automaticamente até ao dia seguinte. Recomendado para apps mobile públicas em **modo direct**.
- **Anomaly detection**: alerta nos logs quando um projecto recebe > 200 devices distintos por minuto (sinal típico de fraude automatizada).

> **Resumo prático**: mesmo em `mode: 'direct'` (token no bundle), um atacante que extraia o token é limitado pelo circuit breaker (gasto máximo diário) + frequency cap (1 impressão por device-anúncio-dia) + rate limit (120 serves/min por token). Para reduzir o risco a zero, usa `mode: 'proxy'`.

## Build local

```bash
npm install
npm run build  # gera dist/index.cjs, dist/index.mjs, dist/index.d.ts
npm run lint   # tsc --noEmit
```
