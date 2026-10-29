# @polygonlabs/oms-wallet-react-native

OMS Wallet SDK for bare React Native apps and Expo development builds on iOS and Android.

[API reference](https://docs.polygon.technology/wallets/sdk/react-native/api-reference)

## Requirements

- React Native 0.85 or newer with React 19.2 or newer
- Expo SDK 56 or newer for Expo development builds
- Android `minSdk 24`, `compileSdk 36`, Java 17, Kotlin 2.1.20 (SDK default), and Android 10 / API 29 or newer at runtime
- iOS 15.1 or newer with Xcode 26 for bare React Native; Expo apps use their Expo SDK's iOS and Xcode minimums

The package contains native code. Expo Go and React Native Web are not supported.

## Bare React Native

Install the package:

```sh
npm install @polygonlabs/oms-wallet-react-native
```

React Native autolinking connects the native modules. Install the iOS pods after adding the package:

```sh
npx pod-install
```

## Expo

Install the package in an app on Expo SDK 56 or newer:

```sh
npx expo install @polygonlabs/oms-wallet-react-native
```

Create a native development build with prebuild or EAS Build:

```sh
npx expo prebuild
npx expo run:ios
# or: npx expo run:android
```

No SDK config plugin is required. Add your redirect scheme to the app's Expo configuration when using redirect authentication.

## Create The Client

Create one `OMSWallet` and reuse it for the lifetime of the app:

```ts
import { OMSWallet } from '@polygonlabs/oms-wallet-react-native';

const omsWallet = new OMSWallet({
  publishableKey: '<publishable-key>',
});
```

Constructing another `OMSWallet` replaces the native client. Calls on the earlier instance then throw `This OMSWallet instance has been replaced`. Create the instance once in its own module, as above, and import it where needed. Fast Refresh re-runs a module that exports non-component values when you edit it, so editing that module creates a new instance; reload the app after changing it.

## Authenticate With Email

```ts
await omsWallet.wallet.startEmailAuth({
  email: 'player@example.com',
});

const { wallet } = await omsWallet.wallet.completeEmailAuth({
  code: '<otp-code>',
});

console.log(wallet?.address);
```

Automatic wallet selection is the default. Handle `walletSelection` only when an authentication call requests manual selection. When the user owns no wallet of the requested type but has a claimable one, automatic selection claims it.

## Keep Your UI In Sync

Subscribe to session changes, then read the current state:

```ts
const subscription = omsWallet.wallet.onSessionChange((event) => {
  if (event.reason === 'expired') {
    showSignIn(event.expiredSession.session.auth);
  }
});

const activeWallet = await omsWallet.wallet.getActiveWallet();
const session = await omsWallet.wallet.getSession();
```

`reason` is `signedIn`, `walletChanged`, `expiryUpdated`, `signedOut`, or `expired`. A listener added while signed out first receives the last `expired` change. `session.expiresAt` moves as the wallet API extends the session with use, up to the lifetime requested at sign-in.

## Authenticate With An OIDC ID Token

For mobile integrations, prefer the provider's native SDK when it can return an ID token:

```ts
await omsWallet.wallet.signInWithOidcIdToken({
  idToken,
  issuer: 'https://accounts.google.com',
  audience: '<google-client-id>',
  provider: 'google',
  providerLabel: 'Google',
});
```

## Authenticate With A Redirect

The app presents the browser and passes the returned callback URI to OMS Wallet. For the fixed OMS Google and Apple configurations, use `OmsRelayOidcProviders`:

```ts
import { OmsRelayOidcProviders } from '@polygonlabs/oms-wallet-react-native';

const callbackUri = 'com.example.app://auth/callback';
const started = await omsWallet.wallet.startOidcRedirectAuth({
  provider: OmsRelayOidcProviders.google,
  omsRelayReturnUri: callbackUri,
});

// Present started.authorizationUrl with the app's authentication browser.

const callback = await omsWallet.wallet.handleOidcRedirectCallback({
  callbackUrl: returnedCallbackUrl,
});
```

Bare React Native apps can use an authentication-browser package such as `react-native-inappbrowser-reborn`. Expo apps can use `expo-web-browser` in a development build. `CustomOidcProviderConfig` is for a provider configuration owned by your project.

## Use The Wallet

```ts
import {
  FeeOptionSelectors,
  Networks,
  parseUnits,
} from '@polygonlabs/oms-wallet-react-native';

const signature = await omsWallet.wallet.signMessage({
  network: Networks.polygon,
  message: 'Hello from React Native',
});

const transaction = await omsWallet.wallet.sendTransaction({
  network: Networks.polygon,
  to: '0xRecipient',
  value: parseUnits('0.01', 18),
  selectFeeOption: FeeOptionSelectors.firstAvailable,
});
```

`sendTransaction` and `callContract` wait for transaction status by default. Set `waitForStatus: false` to return after submission.

## Solana Wallets

Create or import Solana wallets, sign messages, and submit native SOL or SPL-token transfers:

```ts
import { SolanaNetworks } from '@polygonlabs/oms-wallet-react-native';

const { wallet } = await omsWallet.wallet.createWallet({
  walletType: 'solana',
});

const signature = await omsWallet.wallet.signSolanaMessage({
  message: 'Hello from React Native',
});

await omsWallet.wallet.sendSolanaTransfer({
  network: SolanaNetworks.devnet,
  asset: 'SOL',
  to: '<solana-address>',
  amount: '1000000',
});
```

`amount` uses the asset's smallest unit. `importWallet` accepts an Ethereum private key as 32 raw bytes or 64 hexadecimal digits, optionally prefixed with `0x`. Solana imports accept a 32-byte seed or 64-byte keypair as raw bytes, or the base58 encoding of either. The native SDK encrypts the key locally for the attested wallet-import transport.

## Tron Wallets

Create or import Tron wallets, sign messages and TIP-712 typed data, and send TRX or call TRC-20 contracts:

```ts
import { TronNetworks } from '@polygonlabs/oms-wallet-react-native';

await omsWallet.wallet.createWallet({ walletType: 'tron' });

await omsWallet.wallet.sendTronTransaction({
  network: TronNetworks.nile,
  to: '<tron-address>',
  value: '1000000',
});

await omsWallet.wallet.callTronContract({
  network: TronNetworks.nile,
  contractAddress: '<trc20-contract-address>',
  method: 'transfer',
  args: [
    { type: 'address', value: '<tron-address>' },
    { type: 'uint256', value: '1000000' },
  ],
});
```

Tron addresses use Base58Check (`T…`), and `value` is in sun (1 TRX = 1,000,000 sun). Tron transactions always run in native mode.

## Remote Access

Inspect a remote credential before approval, authorize bounded smart-session grants, inspect their usage, and revoke direct or remote access through the methods on `omsWallet.wallet`. See the [Public TypeScript API](./API.md) for the exact grant and response types.

## Query The Indexer

```ts
const activeWallet = await omsWallet.wallet.getActiveWallet();

const balances = await omsWallet.indexer.getBalances({
  walletAddress: activeWallet!.address,
  networks: [Networks.polygon],
  includeMetadata: true,
});

const solanaBalances = await omsWallet.indexer.getSolanaBalances({
  walletAddress: '<solana-address>',
  networks: [SolanaNetworks.devnet],
});

const tronBalances = await omsWallet.indexer.getTronBalances({
  walletAddress: '<tron-address>',
  networks: [TronNetworks.nile],
});
```

## Documentation

- [React Native SDK guide](https://docs.polygon.technology/wallets/sdk/react-native/quickstart)
- [Public TypeScript API](./API.md)
- [Migration guide](./MIGRATION.md)

## Examples

- `examples/sdk-example`: bare React Native wallet demo
- `examples/trails-actions-example`: bare React Native Trails actions demo
- `examples/expo-example`: Expo development-build wallet demo

## License

Apache-2.0
