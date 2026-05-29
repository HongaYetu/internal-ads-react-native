# Changelog

Todas as alterações relevantes deste package estão documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/) e o versionamento segue [SemVer](https://semver.org/) — com a ressalva (típica de packages `internal-*`) que pode haver breaking changes em releases minor se sincronizados com a central.

## [0.2.0] — 2026-05-29

### Adicionado
- **Suporte a vídeo** via `expo-video` (peerDep opcional). `<AdView />` detecta `asset.tipo === 'video'`, prefere `hls_url > url`, usa `thumbnail_url` como poster. Autoplay + muted + loop + sem controles. Se `expo-video` não estiver instalado, renderiza thumbnail estática como fallback.
- **`<AdSlot />`** — wrapper recomendado para inserção em listas (FlatList/ScrollView). Faz lazy mount (só chama `/serve` quando entra no viewport), reserva altura para evitar layout shift, e colapsa a 0px quando não há anúncio.
- **Tipos extendidos** em `AdAsset`: `hls_url`, `thumbnail_url`, `qualities[]`, `status`.
- **Impressão por tipo**: default 1s para imagem, **2s para vídeo** (alinha com IAB MRC). Continua override-able via `impressionDelayMs`.

### Compatível
- Apps que já usam v0.1 continuam a funcionar sem mudanças — `<AdView />` para imagens é idêntico. Vídeo só aparece se o consumer instalar `expo-video`.

## [0.1.0] — 2026-05-29

### Adicionado
- Primeira versão pública.
- `AdsProvider` com configuração `baseUrl + token + mode`.
- `useAd()` hook para servir + tracking manual (impressão + clique).
- `<AdView />` componente auto-tracking (impressão após 1s montado, clique → `Linking.openURL`).
- `useDeviceId()` com persistência via `@react-native-async-storage/async-storage` (peerDep opcional; fallback a UUID de sessão).
- Suporte ao modo `mode: 'proxy'` (recomendado para apps mobile públicas) e `mode: 'direct'` (default).
- Tipos exportados: `Anuncio`, `AdAsset`, `AdTokens`, `AdServeRequest`, `AdsConfig`, `AdsMode`.
- Cliente HTTP low-level exportado como `adsApi` para casos avançados.
