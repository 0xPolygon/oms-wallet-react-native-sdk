# Migrating from 0.2.0 to 0.3.0

Version 0.3.0 aligns the React Native package with version 0.3.0 of the Swift and Kotlin SDKs. It adds wallet import, Solana wallets and balances, remote smart-session access, and indexed fee-option selection.

## Native build requirements

The package pins both native SDKs to `0.3.0`. Android projects must use Kotlin `2.4.10` or newer because the Kotlin SDK 0.3.0 artifact is compiled with Kotlin 2.4 metadata. The existing platform minimums remain Android API 24 and iOS 15.

## Wallet models

`WalletAccount` now requires `keyOrigin`, whose value is either `enclave` or `imported`. This field is returned by the SDK; callers do not construct it when creating or importing a wallet.

The exported `CredentialInfo` type has been renamed to `WalletCredential`. Update type-only imports and annotations:

```ts
import type { WalletCredential } from '@polygonlabs/oms-wallet-react-native';
```

`WalletType` now also accepts `solana`. Update exhaustive wallet-type handling before passing wallet addresses or messages to Ethereum-only code.

## Errors

`OMSWalletErrorCode` now includes `OMS_ATTESTATION_VERIFICATION_FAILED`. Update exhaustive handling of SDK error codes to include wallet-import attestation failures.

## Access grants

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

## Fee-option selection

`FeeOptionSelection` now includes an optional `index`. Selectors that return the provided `selection` object continue to work. If constructing a selection yourself, preserve the index when it is present:

```ts
selectFeeOption: (options) => options[0]?.selection
```

Sponsored transactions call the selector with an empty array. Return `undefined` to acknowledge the free fee, or throw to stop execution. `FeeOptionSelectors.firstAvailable` handles both sponsored and non-sponsored transactions.

## New APIs

The 0.3.0 release adds:

- `importWallet`, `getWalletImportRecipientKey`, and `importEncryptedWallet`
- Solana wallet creation/import, message signing and verification, and `sendSolanaTransfer`
- `SolanaNetworks` and `indexer.getSolanaBalances`
- Remote credential inspection, smart-session authorization, session lookup and usage lookup
