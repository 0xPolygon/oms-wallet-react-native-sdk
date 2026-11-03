---
'@polygonlabs/oms-wallet-react-native': minor
---

Uses version 0.4.0 of the Swift and Kotlin SDKs, with an active-wallet session API, Tron wallets, and claimable wallets.

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
