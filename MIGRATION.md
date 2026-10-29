# Migration Guide

## 0.3 to 0.4

Version 0.4.0 uses version 0.4.0 of the Swift and Kotlin SDKs. It replaces the wallet address and expiry APIs with the active wallet and session change APIs, and adds Tron wallets and claimable wallets.

### One-time sign-in after upgrading

The native SDKs store sessions in a new format and do not restore sessions saved by 0.3. Each user signs in once after the upgrade.

### Read the active wallet

`getWalletAddress()` was removed. `getActiveWallet()` returns the active `WalletAccount`, or `undefined` when signed out. Check its `type` before passing the address to chain-specific code.

```ts
// 0.3
const address = await omsWallet.wallet.getWalletAddress();

// 0.4
const activeWallet = await omsWallet.wallet.getActiveWallet();
if (activeWallet?.type === 'ethereum') {
  const address = activeWallet.address;
}
```

`walletAddress` was also removed from `WalletActivationResult` and `CompleteAuthResult`. Use `result.wallet.address`.

### `getSession()` returns `undefined` when signed out

`OMSWalletSessionState` was replaced by `OMSWalletSession`. `getSession()` now resolves to `OMSWalletSession | undefined` instead of an object whose fields were `undefined` when signed out. The session has no `walletAddress`; its `expiresAt` and `auth` are always set. It is defined exactly when there is an active wallet.

```ts
// 0.3
const email = (await omsWallet.wallet.getSession()).auth?.email;

// 0.4
const email = (await omsWallet.wallet.getSession())?.auth.email;
```

### `onSessionChange` replaces `onSessionExpired`

`onSessionChange` reports every change of the active wallet or session with a `reason`: `signedIn`, `walletChanged`, `expiryUpdated`, `signedOut`, or `expired`. An `expired` change carries the ended session as `expiredSession`, an `OMSWalletExpiredSession`, which replaces `OMSWalletSessionExpiredEvent`. Its `wallet` is the wallet that was active, or `undefined` when the session expired during a pending manual wallet selection.

```ts
// 0.3
omsWallet.wallet.onSessionExpired(({ session }) => showSignIn(session.auth));

// 0.4
omsWallet.wallet.onSessionChange((event) => {
  if (event.reason === 'expired') showSignIn(event.expiredSession.session.auth);
});
```

As before, a listener added while signed out first receives the last `expired` change. On iOS, a saved session that becomes readable once the device is unlocked is reported as `signedIn`.

### Session expiry extends with use

`session.expiresAt` is the current expiry, not a fixed end time. The wallet API extends it with use, up to the lifetime requested at sign-in, and ends an idle session after about 10 days. When `sessionLifetimeSeconds` is omitted, sign-in now requests 180 days instead of 7; pass a shorter value for a hard limit. Listen for `expiryUpdated` instead of treating `expiresAt` as final.

### Renamed parameters

`importEncryptedWallet` takes `walletType` instead of `type`, matching `createWallet`:

```ts
// 0.3
await omsWallet.wallet.importEncryptedWallet({ type: 'solana', keyMaterial });

// 0.4
await omsWallet.wallet.importEncryptedWallet({ walletType: 'solana', keyMaterial });
```

### Signature verification takes an address

`isValidMessageSignature`, `isValidTypedDataSignature`, and `isValidSolanaMessageSignature` accept an optional `walletAddress`. Pass it to verify any wallet, even while signed out; omit it to verify against the active wallet of that type. Without an address, verification still requires an active wallet of the matching type.

### Exhaustive wallet-type checks

`WalletType` and `ImportWalletParams` gained `tron`. `OMSWalletErrorCode` gained `OMS_WALLET_ADDRESS_ALREADY_IMPORTED`, which importing an already imported address now throws instead of `OMS_REQUEST_FAILED`. Update exhaustive `switch` statements over them.

### Behavior changes

- Any wallet call whose credential the wallet API rejects as not found or expired now fails with `OMS_SESSION_EXPIRED` instead of `OMS_REQUEST_FAILED`, and the session ends with an `expired` change. An expiry check that finds the credential revoked ends the session the same way.
- When the local expiry passes but the wallet API cannot be reached, the session is kept and calls fail with `OMS_REQUEST_FAILED`, not `OMS_SESSION_EXPIRED`.
- Requests signed with the session go one at a time, so a burst of calls takes longer. A request rejected for a stale nonce is signed again and resent, at most twice.
- An empty or whitespace-only `walletAddress` in a signature check fails with `OMS_VALIDATION_ERROR`. Omit it to verify against the active wallet.
- An invalid `sessionLifetimeSeconds` (not an integer from 1 to `MAX_SESSION_LIFETIME_SECONDS`) fails with `OMS_VALIDATION_ERROR` on both platforms before any request.
- Wallet API and indexer responses are checked more strictly: an Ethereum wallet address that is not `0x` followed by 40 hexadecimal digits, or an indexer response that uses an older field name, fails with `OMS_INVALID_RESPONSE`.
- On iOS, keychain items are now readable only while the device is unlocked and are never restored to another device from a backup; the user signs in again there.
- On Android, the SDK reads the session expiry only once the app has a started activity, so a process started in the background (for example for a push message) does not extend an idle session.
- `callContract` requires a bare function name such as `'transfer'`. A full signature such as `'transfer(address,uint256)'` now fails with `OMS_VALIDATION_ERROR` before any request.
- A transaction the wallet API refuses before submitting it, for example because simulation shows it would revert, fails with `OMS_REQUEST_FAILED` (or `OMS_SESSION_EXPIRED` when the session has ended) instead of `OMS_TRANSACTION_EXECUTION_UNCONFIRMED`. It was never submitted.
- Signed requests fail with `OMS_REQUEST_FAILED` after 30 seconds, counting the time spent waiting behind other signed requests. A transaction that times out after it was sent still fails with `OMS_TRANSACTION_EXECUTION_UNCONFIRMED`: check its status before sending it again.
- With automatic wallet selection, sign-in claims a claimable wallet of the requested type when the user owns none, instead of creating a new one.
- On an iOS device, the session signing key is generated in the Secure Enclave and cannot be exported. If the Secure Enclave cannot create it, sign-in fails with `OMS_STORAGE_ERROR`.

### New APIs

- `DEFAULT_SESSION_LIFETIME_SECONDS` and `MAX_SESSION_LIFETIME_SECONDS` (both 180 days)
- `upstreamError.cause`, the service's reason for an error when it gives one
- Indexer page cursors: `column`, `before`, `after`, and `sort` (`SortBy`) on `TokenBalancesPageRequest` and `TokenBalancesPage`
- `OMSWalletSessionChangeListener`
- Tron wallets: `signTronMessage`, `signTronTypedData`, `isValidTronMessageSignature`, `isValidTronTypedDataSignature`, `sendTronTransaction`, `callTronContract`, `indexer.getTronBalances`, and `TronNetworks`
- Claimable wallets: `claimWallet`, `claimableWallets` on auth results and `PendingWalletSelection`, and `PendingWalletSelection.claimAndSelectWallet`

## 0.2.0 to 0.3.1

Compared with 0.2.0, version 0.3.1 adds wallet import, Solana wallets and balances, remote smart-session access, and indexed fee-option selection.

### Wallet models

`WalletAccount` now requires `keyOrigin`, whose value is either `enclave` or `imported`. This field is returned by the SDK; callers do not construct it when creating or importing a wallet.

The exported `CredentialInfo` type has been renamed to `WalletCredential`. Update type-only imports and annotations:

```ts
import type { WalletCredential } from '@polygonlabs/oms-wallet-react-native';
```

`WalletType` now also accepts `solana`. Update exhaustive wallet-type handling before passing wallet addresses or messages to Ethereum-only code.

### Errors

`OMSWalletErrorCode` now includes `OMS_ATTESTATION_VERIFICATION_FAILED`. Update exhaustive handling of SDK error codes to include wallet-import attestation failures.

### Access grants

`listAccess`, `listAccessPage`, and `listAccessPages` now return discriminated `AccessGrant` values instead of bare credentials. A direct grant has `type: 'direct'`; a remote grant has `type: 'remote'` plus its session ID, display metadata, and smart-session grants.

For type annotations, replace `ListAccessResponse` with `AccessGrantPage`. `ListAccessPagesParams` has been removed because `listAccessPages` now accepts `ListAccessParams`. Page results expose `grants` instead of `credentials`.

```ts
const grants = await omsWallet.wallet.listAccess({ type: 'remote' });

for (const grant of grants) {
  if (grant.type === 'remote') {
    console.log(grant.sessionId, grant.metadata, grant.grants);
  }
}
```

The access-list parameter objects now accept an optional `type` filter. `revokeAccess` changes from a credential-ID string to an object and requires the remote session ID when revoking one remote grant:

```ts
await omsWallet.wallet.revokeAccess({
  credentialId: grant.credentialId,
  sessionId: grant.type === 'remote' ? grant.sessionId : undefined,
});
```

### Fee-option selection

`FeeOptionSelection` now includes an optional `index`. Selectors that return the provided `selection` object continue to work. If constructing a selection yourself, preserve the index when it is present:

```ts
selectFeeOption: (options) => options[0]?.selection
```

Sponsored transactions call the selector with an empty array. Return `undefined` to acknowledge the free fee, or throw to stop execution. `FeeOptionSelectors.firstAvailable` handles both sponsored and non-sponsored transactions.

### New APIs

Version 0.3.1 includes:

- `importWallet`, `getWalletImportRecipientKey`, and `importEncryptedWallet`
- Solana wallet creation/import, message signing and verification, and `sendSolanaTransfer`
- `SolanaNetworks` and `indexer.getSolanaBalances`
- Remote credential inspection, smart-session authorization, session lookup and usage lookup
