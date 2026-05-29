# Changelog

Todas as alterações relevantes deste package estão documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/) e o versionamento segue [SemVer](https://semver.org/) — com a ressalva (típica de packages `internal-*`) que pode haver breaking changes em releases minor se sincronizados com a central.

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
