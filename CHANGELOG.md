# Changelog

## 0.4.0

### Minor Changes

- [`76bc812`](https://github.com/0xPolygon/oms-wallet-react-native-sdk/commit/76bc8125b690ad000c62b7f8101173bc8e12b4f7) Thanks [@tolgahan-arikan](https://github.com/tolgahan-arikan)! - Uses version 0.4.0 of the Swift and Kotlin SDKs, with an active-wallet session API, Tron wallets, and claimable wallets.

  ### Breaking changes
  - The synchronous `activeWallet` and `session` properties replace `getWalletAddress()` and `getSession()`. They are current as soon as a sign-in or wallet change returns, and work with React's `useSyncExternalStore`.
  - `onSessionChange` replaces `onSessionExpired`, reports every change of the active wallet or session, and returns a function that removes the listener.
  - `new OMSWallet()` creates the native client synchronously and throws `OMSWalletError` when it cannot be created.
  - `walletAddress` was removed from `WalletActivationResult` and `CompleteAuthResult`; use `wallet.address`.
  - `importEncryptedWallet` takes `walletType` instead of `type`.
  - Users sign in once after upgrading: sessions saved by 0.3 are not restored.
  - On iOS, the Swift SDK now comes from Swift Package Manager instead of CocoaPods. Run `pod install` after upgrading, and keep `react_native_post_install` in your `Podfile`.

  ### New
  - Tron wallets: signing, verification, `sendTronTransaction`, `callTronContract`, `indexer.getTronBalances`, and `TronNetworks`.
  - Claimable wallets: `claimWallet`, `claimableWallets`, and `PendingWalletSelection.claimAndSelectWallet`.
  - Signature verification accepts a `walletAddress` and works while signed out.
  - Indexer page cursors (`column`, `before`, `after`, `sort`), `upstreamError.cause`, and the `DEFAULT_SESSION_LIFETIME_SECONDS` and `MAX_SESSION_LIFETIME_SECONDS` constants.

  ### Fixes
  - A session change listener on a newer `OMSWallet` no longer stops receiving changes when a listener of an earlier instance is removed.
  - A session change listener that throws no longer keeps the other listeners from receiving the change.
  - An invalid `sessionLifetimeSeconds` fails with `OMS_VALIDATION_ERROR` on both iOS and Android.

  See the migration guide for details.

## 0.3.2

### Patch Changes

- [#126](https://github.com/0xPolygon/oms-wallet-react-native-sdk/pull/126) [`583950f`](https://github.com/0xPolygon/oms-wallet-react-native-sdk/commit/583950f301210c602608c3d392bbe3266faa855a) Thanks [@tolgahan-arikan](https://github.com/tolgahan-arikan)! - Use Swift SDK 0.3.1 and Kotlin SDK 0.3.2 so wallet import trusts the WaaS v1.1.1 enclave measurements on Staging and Production.

## 0.3.1

### Patch Changes

- [#113](https://github.com/0xPolygon/oms-wallet-react-native-sdk/pull/113) [`47bdb55`](https://github.com/0xPolygon/oms-wallet-react-native-sdk/commit/47bdb55a0614985a97e171eb910f141cbef4579e) Thanks [@tolgahan-arikan](https://github.com/tolgahan-arikan)! - Use Kotlin SDK 0.3.1 so Android consumers, including Expo apps, compile with the supported Kotlin toolchain.

## 0.3.0

### Minor Changes

- [#95](https://github.com/0xPolygon/oms-wallet-react-native-sdk/pull/95) [`457ba2d`](https://github.com/0xPolygon/oms-wallet-react-native-sdk/commit/457ba2d438d5e5f944e93c51dafe46a2e616edc4) Thanks [@tolgahan-arikan](https://github.com/tolgahan-arikan)! - Add wallet import, Solana wallet and balance APIs, and bounded remote smart-session access through the React Native SDK.

  This release aligns the bridge with version 0.3.0 of the Swift and Kotlin SDKs. It also exposes wallet key origin, indexed fee selections, typed direct and remote access grants, session-specific access revocation, and typed wallet-import attestation failures.

### Patch Changes

- [#66](https://github.com/0xPolygon/oms-wallet-react-native-sdk/pull/66) [`8173ae0`](https://github.com/0xPolygon/oms-wallet-react-native-sdk/commit/8173ae021a4974fcc0fdd050dd84dd9fb1cdf13d) Thanks [@tolgahan-arikan](https://github.com/tolgahan-arikan)! - Declare the package module type, supported Node.js engines, and tree-shaking metadata.

All notable changes to `@polygonlabs/oms-wallet-react-native` are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] - 2026-07-15

### Added

- Added the `OMSWallet` root client with wallet and indexer sub-clients aligned to the Swift and Kotlin SDKs.
- Added email, OIDC ID-token, and OIDC redirect authentication with automatic or manual wallet selection.
- Added session state and expiration events, wallet management, signing and verification, transactions, access management, balances, and transaction history.
- Added bare React Native and Expo development-build guidance, native Google ID-token examples, and native autolinking checks.

### Changed

- Renamed the npm package to `@polygonlabs/oms-wallet-react-native`.
- Updated the native Swift and Kotlin dependencies to `0.2.0`.
- Renamed public wallet records to `WalletAccount` and normalized absent JavaScript values to `undefined`.
- Aligned public result unions, errors, networks, fee selection, and indexer models across Android and iOS.
- Changed the package license to Apache 2.0.

## [0.1.0-alpha.4] — 2026-06-26

### Changed

- Lowered the Android OMS SDK requirement to `minSdk 24`.
- Aligned Android Kotlin, coroutine, and serialization versions with current
  React Native and Expo defaults.
- Updated the iOS OMS SDK dependency to `0.1.0-alpha.4`.
- Aligned iOS promise rejection metadata with the current native error contract.

### Fixed

- Expo and bare React Native apps can use the standard Android build
  requirements for OMS.

## [0.1.0-alpha.3] — 2026-06-26

### Added

- Support for Android and iOS OMS SDK `0.1.0-alpha.3`.
- `OMSClient` class API with `wallet`, `indexer`, and synchronous `supportedNetworks`.
- Public wallet APIs for OIDC ID-token sign-in, redirect auth, wallet selection, session state,
  signing, transaction submission, transaction status, ID tokens, access listing, and access revoke.
- Public indexer APIs for balances and transaction history.
- Public unit parsing and formatting helpers.

### Changed

- Updated transaction fee selection to use the native SDK fee option selection payload.
- Updated README and API reference for the current public TypeScript API.
- Updated SDK and Trails examples for the alpha.3 public API.

### Fixed

- Corrected supported network metadata URLs.
- Fixed Android fee option handling and transaction parameter bridging.
- Aligned CI dependency setup for iOS, Android, and Claude review workflows.

## [0.1.0-alpha.2] — 2026-06-10

### Added

- Support for Android and iOS OMS SDK `0.1.0-alpha.2`.
- Session expiry event handling with replay for late JS listeners.
- Session lifetime options for email and OIDC sign-in flows.
- OIDC redirect login hints.
- Standalone Expo example app.
- Native bridge test coverage.

### Changed

- Expanded SDK and Trails example apps with session controls and session expiry handling.
- Upgraded the React Native baseline to `0.85.3` and refreshed build/dev dependencies.
- Tightened published package contents to exclude generated example artifacts.

## [0.1.0-alpha.1] — 2025-05-27

### Added

- Initial alpha release of `@0xsequence/oms-react-native-sdk` (renamed from `oms-client-react-native-sdk`).
- TypeScript public API: `configure`, `startEmailAuth`, `completeEmailAuth`, `startOidcRedirectAuth`,
  `handleOidcRedirectCallback`, `getWalletAddress`, `signMessage`, `sendTransaction`,
  `getTokenBalances`, `formatUnits`, `parseUnits`.
- React Native Turbo Module bridging iOS (Swift `oms-client-swift-sdk`) and Android (Kotlin
  `oms-client-kotlin-sdk`).
- SDK example app and Trails actions demo with redirect auth and pagination.
- GitHub Actions CI: lint, typecheck, Android build, iOS build.
