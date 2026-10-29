---
'@polygonlabs/oms-wallet-react-native': minor
---

Uses version 0.4.0 of the Swift and Kotlin SDKs, with an active-wallet session API, Tron wallets, and claimable wallets.

### Breaking changes

- `getActiveWallet()` replaces `getWalletAddress()`, and `getSession()` resolves to `OMSWalletSession | undefined`.
- `onSessionChange` replaces `onSessionExpired` and reports every change of the active wallet or session.
- `walletAddress` was removed from `WalletActivationResult` and `CompleteAuthResult`; use `wallet.address`.
- `importEncryptedWallet` takes `walletType` instead of `type`.
- Users sign in once after upgrading: sessions saved by 0.3 are not restored.

### New

- Tron wallets: signing, verification, `sendTronTransaction`, `callTronContract`, `indexer.getTronBalances`, and `TronNetworks`.
- Claimable wallets: `claimWallet`, `claimableWallets`, and `PendingWalletSelection.claimAndSelectWallet`.
- Signature verification accepts a `walletAddress` and works while signed out.

See the migration guide for details.
