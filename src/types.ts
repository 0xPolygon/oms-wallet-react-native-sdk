import type { Network, SolanaNetwork, TronNetwork } from './networks';

export type WalletType = 'ethereum' | 'solana' | 'tron';

export type WalletKeyOrigin = 'enclave' | 'imported';

export type WalletSelectionBehavior = 'automatic' | 'manual';

export type OMSWalletEmailSessionAuth = {
  type: 'email';
  email: string;
};

export type OMSWalletOidcSessionAuthFlow = 'redirect' | 'id-token';

export type OMSWalletOidcSessionAuth = {
  type: 'oidc';
  flow: OMSWalletOidcSessionAuthFlow;
  issuer: string;
  provider: string | undefined;
  providerLabel: string | undefined;
  email: string | undefined;
};

export type OMSWalletSessionAuth =
  | OMSWalletEmailSessionAuth
  | OMSWalletOidcSessionAuth;

/** Expiry and auth metadata for the active session. */
export type OMSWalletSession = {
  /**
   * The current session expiry. The wallet API extends it with use, up to the
   * lifetime requested at sign-in, and the SDK refreshes it.
   */
  expiresAt: string;
  auth: OMSWalletSessionAuth;
};

/** A session that expired, as reported by an `expired` session change. */
export type OMSWalletExpiredSession = {
  /**
   * The wallet that was active when the session expired. `undefined` when the
   * credential expired while a manual wallet selection was still pending.
   */
  wallet: WalletAccount | undefined;
  session: OMSWalletSession;
  /** When the session ended. */
  expiredAt: string;
};

/**
 * Why the active wallet or session changed.
 *
 * - `signedIn`: a wallet became active, by a sign-in or by restoring a saved
 *   session once the device was unlocked.
 * - `walletChanged`: another wallet of the same sign-in became active.
 * - `expiryUpdated`: `session.expiresAt` moved. Safe to ignore unless you show
 *   the expiry.
 * - `signedOut`: there is no session any more and it did not expire.
 * - `expired`: the session expired, or the wallet API no longer accepts it.
 */
export type OMSWalletSessionChangeReason =
  | 'signedIn'
  | 'walletChanged'
  | 'expiryUpdated'
  | 'signedOut'
  | 'expired';

/** The state right after a session change. */
export type OMSWalletSessionChangeEvent =
  | {
      reason: 'signedIn' | 'walletChanged' | 'expiryUpdated';
      activeWallet: WalletAccount;
      session: OMSWalletSession;
      expiredSession?: undefined;
    }
  | {
      reason: 'signedOut';
      activeWallet: undefined;
      session: undefined;
      expiredSession?: undefined;
    }
  | {
      reason: 'expired';
      activeWallet: undefined;
      session: undefined;
      expiredSession: OMSWalletExpiredSession;
    };

export type OMSWalletParams = {
  publishableKey: string;
};

export type WalletAccount = {
  id: string;
  type: WalletType;
  address: string;
  reference?: string;
  keyOrigin: WalletKeyOrigin;
};

export type WalletActivationResult = {
  wallet: WalletAccount;
};

export type WalletCredential = {
  credentialId: string;
  expiresAt: string;
  isCaller: boolean;
};

export type PendingWalletSelection = {
  walletType: WalletType;
  wallets: WalletAccount[];
  /** Preallocated wallets of `walletType` that the signed-in user can claim. */
  claimableWallets: WalletAccount[];
  credential: WalletCredential;
  selectWallet(walletId: string): Promise<WalletActivationResult>;
  createAndSelectWallet(reference?: string): Promise<WalletActivationResult>;
  /** Claims one of `claimableWallets` and activates it. */
  claimAndSelectWallet(walletId: string): Promise<WalletActivationResult>;
};

export type CompleteAuthResult =
  | {
      type: 'walletSelected';
      wallet: WalletAccount;
      wallets: WalletAccount[];
      /**
       * Preallocated wallets the signed-in user can still claim, of every
       * wallet type. Excludes a wallet claimed during this sign-in.
       */
      claimableWallets: WalletAccount[];
      credential: WalletCredential;
      pendingSelection?: undefined;
    }
  | {
      type: 'walletSelection';
      wallet: undefined;
      wallets: WalletAccount[];
      /** Preallocated wallets of the requested type that the user can claim. */
      claimableWallets: WalletAccount[];
      credential: WalletCredential;
      pendingSelection: PendingWalletSelection;
    };

export type StartOidcRedirectAuthResult = {
  authorizationUrl: string;
};

export type OidcRedirectAuthResult =
  | { type: 'completed'; result: CompleteAuthResult }
  | {
      type: 'notOidcRedirectCallback' | 'noPendingAuth';
      result?: undefined;
    };

export type StartEmailAuthParams = {
  email: string;
  sessionLifetimeSeconds?: number;
};

export type CompleteEmailAuthParams = {
  code: string;
  walletSelection?: WalletSelectionBehavior;
  walletType?: WalletType;
};

export type SignInWithOidcIdTokenParams = {
  idToken: string;
  issuer: string;
  audience: string;
  walletSelection?: WalletSelectionBehavior;
  walletType?: WalletType;
  sessionLifetimeSeconds?: number;
  provider?: string;
  providerLabel?: string;
};

export type OidcAuthMode = 'auth-code' | 'auth-code-pkce';

declare const omsRelayOidcProviderBrand: unique symbol;

/**
 * An opaque SDK-owned registry value. It must come from
 * `OmsRelayOidcProviders`; object literals are invalid.
 */
export type OmsRelayOidcProvider = {
  readonly provider: 'google' | 'apple';
  readonly [omsRelayOidcProviderBrand]: true;
};

export type CustomOidcProviderConfig = {
  issuer: string;
  clientId: string;
  authorizationUrl: string;
  providerRedirectUri: string;
  provider?: string;
  providerLabel?: string;
  scopes?: string[];
  authorizeParams?: Record<string, string>;
  authMode?: OidcAuthMode;
};

export type OidcProviderConfig =
  | OmsRelayOidcProvider
  | CustomOidcProviderConfig;

type StartOidcRedirectAuthParamsBase = {
  walletType?: WalletType;
  walletSelection?: WalletSelectionBehavior;
  sessionLifetimeSeconds?: number;
  loginHint?: string;
};

export type StartOidcRedirectAuthParams = StartOidcRedirectAuthParamsBase &
  (
    | {
        provider: OmsRelayOidcProvider;
        omsRelayReturnUri: string;
        authorizeParams?: never;
      }
    | {
        provider: CustomOidcProviderConfig;
        omsRelayReturnUri?: never;
        authorizeParams?: Record<string, string>;
      }
  );

export type HandleOidcRedirectCallbackParams = {
  callbackUrl: string;
  walletSelection?: WalletSelectionBehavior;
  sessionLifetimeSeconds?: number;
};

export type CreateWalletParams = {
  walletType?: WalletType;
  reference?: string;
};

export type WalletImportCipherSuite =
  | 'x25519-sha256-aes256gcm'
  | 'x25519-sha256-chacha20poly1305'
  | 'p256-sha256-aes256gcm'
  | 'p256-sha256-chacha20poly1305';

export type ImportWalletParams =
  | {
      type: 'ethereum';
      privateKey: string | Uint8Array;
      reference?: string;
    }
  | {
      type: 'solana';
      privateKey: string | Uint8Array;
      reference?: string;
    }
  | {
      type: 'tron';
      /** A secp256k1 private key: 32 raw bytes or 64 hex characters. */
      privateKey: string | Uint8Array;
      reference?: string;
    };

export type WalletImportRecipientKey = {
  keyId: string;
  cipherSuite: WalletImportCipherSuite;
  publicKey: string;
};

export type EncryptedWalletImportKeyMaterial = {
  keyId: string;
  cipherSuite: WalletImportCipherSuite;
  encapsulatedKey: string;
  ciphertext: string;
};

export type ImportEncryptedWalletParams = {
  walletType: WalletType;
  keyMaterial: EncryptedWalletImportKeyMaterial;
  reference?: string;
};

export type SignTypedDataParams = {
  network: Network;
  typedData: unknown;
};

export type SignMessageParams = {
  network: Network;
  message: string;
};

export type SignSolanaMessageParams = {
  message: string;
};

export type SignTronMessageParams = {
  message: string;
};

export type SignTronTypedDataParams = {
  /** TIP-712 typed data. Address values may be Base58Check (`T…`). */
  typedData: unknown;
};

export type CallContractArg = {
  type: string;
  value: unknown;
};

export type TransactionMode = 'native' | 'relayer';

export type TransactionStatus =
  | 'quoted'
  | 'pending'
  | 'executed'
  | 'failed'
  | 'unknown';

export type TransactionStatusResolution =
  | 'not-requested'
  | 'resolved'
  | 'timed-out';

export type TransactionStatusPollingOptions = {
  timeoutMs?: number;
  intervalMs?: number;
  fastIntervalMs?: number;
  fastPollCount?: number;
};

export type SendTransactionResponse = {
  txnId: string;
  status: TransactionStatus;
  txnHash?: string;
  statusResolution: TransactionStatusResolution;
};

export type TransactionStatusResponse = {
  status: TransactionStatus;
  txnHash?: string;
};

export type FeeToken = {
  network: string;
  name: string;
  symbol: string;
  type: string;
  decimals?: number;
  logoUrl?: string;
  contractAddress?: string;
  tokenId?: string;
};

export type FeeOption = {
  token: FeeToken;
  value: string;
  displayValue: string;
};

export type FeeOptionSelection = {
  token: string;
  index?: number;
};

export type TokenBalancesPage = {
  page: number;
  pageSize: number;
  more: boolean;
};

export type TokenContractInfo = {
  chainId: number;
  address: string;
  source: string;
  name: string;
  type: string;
  symbol: string;
  decimals?: number;
  logoURI?: string;
  deployed: boolean;
  bytecodeHash: string;
  extensions: Record<string, unknown>;
  updatedAt: string;
  queuedAt?: string;
  status: string;
};

export type TokenMetadataAsset = {
  id?: number;
  collectionId?: number;
  tokenId?: string;
  url?: string;
  metadataField?: string;
  name?: string;
  filesize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  updatedAt?: string;
};

export type TokenMetadata = {
  chainId?: number;
  contractAddress?: string;
  tokenId: string;
  source: string;
  name: string;
  description?: string;
  image?: string;
  video?: string;
  audio?: string;
  properties?: Record<string, unknown>;
  attributes: Record<string, unknown>[];
  imageData?: string;
  externalUrl?: string;
  backgroundColor?: string;
  animationUrl?: string;
  decimals?: number;
  updatedAt?: string;
  assets?: TokenMetadataAsset[];
  status: string;
  queuedAt?: string;
  lastFetched?: string;
};

export type NativeTokenBalance = {
  contractType: 'NATIVE';
  contractAddress?: undefined;
  accountAddress: string;
  tokenId?: undefined;
  name: string;
  symbol: string;
  balance: string;
  chainId: number;
  balanceUSD?: string;
  priceUSD?: string;
  priceUpdatedAt?: string;
};

export type ContractTokenBalance = {
  contractType: string;
  contractAddress: string;
  accountAddress: string;
  tokenId: string;
  balance: string;
  blockHash: string;
  blockNumber: number;
  chainId: number;
  balanceUSD?: string;
  priceUSD?: string;
  priceUpdatedAt?: string;
  uniqueCollectibles?: string;
  isSummary?: boolean;
  contractInfo?: TokenContractInfo;
  tokenMetadata?: TokenMetadata;
};

export type TokenBalance = NativeTokenBalance | ContractTokenBalance;

export type FeeOptionWithBalance = {
  feeOption: FeeOption;
  selection: FeeOptionSelection;
  balance?: TokenBalance;
  available?: string;
  availableRaw?: string;
  decimals?: number;
};

export type FeeOptionSelector = (
  feeOptions: FeeOptionWithBalance[]
) => FeeOptionSelection | undefined | Promise<FeeOptionSelection | undefined>;

export type SendTransactionParams = {
  network: Network;
  to: string;
  value: string;
  data?: string;
  mode?: TransactionMode;
  selectFeeOption?: FeeOptionSelector;
  waitForStatus?: boolean;
  statusPolling?: TransactionStatusPollingOptions;
};

export type SendSolanaTransferParams = {
  network: SolanaNetwork;
  asset: string;
  to: string;
  amount: string;
  mode?: TransactionMode;
  selectFeeOption?: FeeOptionSelector;
  waitForStatus?: boolean;
  statusPolling?: TransactionStatusPollingOptions;
};

/**
 * A Tron transaction. Tron wallets always execute in native mode.
 *
 * Omitting `data` sends a plain TRX transfer. Passing `data` (including `'0x'`)
 * makes the transaction a contract call.
 */
export type SendTronTransactionParams = {
  network: TronNetwork;
  /** Base58Check recipient address (`T…`). */
  to: string;
  /** Amount in sun (1 TRX = 1,000,000 sun). Defaults to `'0'`. */
  value?: string;
  data?: string;
  selectFeeOption?: FeeOptionSelector;
  waitForStatus?: boolean;
  statusPolling?: TransactionStatusPollingOptions;
};

/** A Tron contract call, ABI-encoded by the wallet service. */
export type CallTronContractParams = {
  network: TronNetwork;
  /** Base58Check contract address (`T…`). */
  contractAddress: string;
  /** Function name only, e.g. `'transfer'`. */
  method: string;
  args?: CallContractArg[];
  selectFeeOption?: FeeOptionSelector;
  waitForStatus?: boolean;
  statusPolling?: TransactionStatusPollingOptions;
};

export type CallContractParams = {
  network: Network;
  contractAddress: string;
  /** Function name only, e.g. `'transfer'`. */
  method: string;
  args?: CallContractArg[];
  mode?: TransactionMode;
  selectFeeOption?: FeeOptionSelector;
  waitForStatus?: boolean;
  statusPolling?: TransactionStatusPollingOptions;
};

export type IndexerNetworkType = 'MAINNETS' | 'TESTNETS' | 'ALL';

export type ContractVerificationStatus = 'VERIFIED' | 'UNVERIFIED' | 'ALL';

export type MetadataOptions = {
  verifiedOnly?: boolean;
  unverifiedOnly?: boolean;
  includeContracts?: string[];
};

export type TokenBalancesPageRequest = {
  page?: number;
  pageSize?: number;
};

export type BalancesResult = {
  status: number;
  page?: TokenBalancesPage;
  nativeBalances: NativeTokenBalance[];
  balances: ContractTokenBalance[];
};

export type SolanaVerificationStatus = 'verified' | 'unverified' | 'unknown';

export type SolanaVerificationSource = 'jupiter' | 'solflare-utl' | 'none';

type SolanaBalanceBase = {
  network: SolanaNetwork;
  accountAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
  formattedBalance: string;
  imageUrl?: string;
  metadataUri?: string;
  verificationStatus: SolanaVerificationStatus;
  verificationSource: SolanaVerificationSource;
  priceUSD?: string;
  balanceUSD?: string;
};

export type SolanaNativeBalance = SolanaBalanceBase & {
  assetType: 'native';
  tokenProgram?: undefined;
  mintAddress?: undefined;
};

export type SolanaFungibleTokenBalance = SolanaBalanceBase & {
  assetType: 'fungible-token';
  tokenProgram: 'spl-token' | 'token-2022';
  mintAddress: string;
};

export type SolanaBalance = SolanaNativeBalance | SolanaFungibleTokenBalance;

export type SolanaNetworkError = {
  network: SolanaNetwork;
  reason: string;
};

export type GetSolanaBalancesParams = {
  walletAddress: string;
  networks?: SolanaNetwork[];
  includeMetadata?: boolean;
  omitNativeBalances?: boolean;
  mintAddresses?: string[];
  excludedMintAddresses?: string[];
};

export type SolanaBalancesResult = {
  status: number;
  balances: SolanaBalance[];
  errors: SolanaNetworkError[];
};

export type TronVerificationStatus = 'verified' | 'unverified' | 'unknown';

type TronBalanceBase = {
  network: TronNetwork;
  accountAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  /** Raw balance in the token's base units (sun for TRX). */
  balance: string;
  formattedBalance: string;
  imageUrl?: string;
  metadataUri?: string;
  verificationStatus: TronVerificationStatus;
  verificationSource: string;
  priceUSD?: string;
  balanceUSD?: string;
};

export type TronNativeBalance = TronBalanceBase & {
  assetType: 'native';
  tokenStandard?: undefined;
  contractAddress?: undefined;
};

export type TronFungibleTokenBalance = TronBalanceBase & {
  assetType: 'fungible-token';
  tokenStandard: 'trc20';
  contractAddress: string;
};

export type TronBalance = TronNativeBalance | TronFungibleTokenBalance;

export type TronNetworkError = {
  network: TronNetwork;
  reason: string;
};

export type GetTronBalancesParams = {
  /** Base58Check wallet address (`T…`). */
  walletAddress: string;
  /** Defaults to Tron mainnet and Nile. */
  networks?: TronNetwork[];
  includeMetadata?: boolean;
  omitNativeBalances?: boolean;
  /** Only return these TRC-20 contracts (`T…`). */
  contractAddresses?: string[];
  /** Exclude these TRC-20 contracts (`T…`). */
  excludedContractAddresses?: string[];
};

export type TronBalancesResult = {
  status: number;
  balances: TronBalance[];
  errors: TronNetworkError[];
};

export type GetBalancesParams = {
  walletAddress: string;
  networks?: Network[];
  networkType?: IndexerNetworkType;
  contractAddresses?: string[];
  includeMetadata?: boolean;
  omitPrices?: boolean;
  tokenIds?: string[];
  contractStatus?: ContractVerificationStatus;
  page?: TokenBalancesPageRequest;
};

export type TransactionTransfer = {
  transferType: string;
  contractAddress: string;
  contractType: string;
  from: string;
  to: string;
  tokenIds?: string[];
  amounts: string[];
  logIndex: number;
  amountsUSD?: string[];
  pricesUSD?: string[];
  contractInfo?: TokenContractInfo;
  tokenMetadata?: Record<string, TokenMetadata>;
};

export type Transaction = {
  txnHash: string;
  blockNumber: number;
  blockHash: string;
  chainId: number;
  metaTxnId?: string;
  transfers: TransactionTransfer[];
  timestamp: string;
};

export type TransactionHistoryResult = {
  status: number;
  page?: TokenBalancesPage;
  transactions: Transaction[];
};

export type GetTransactionHistoryParams = {
  walletAddress: string;
  networks?: Network[];
  networkType?: IndexerNetworkType;
  contractAddresses?: string[];
  transactionHashes?: string[];
  metaTransactionIds?: string[];
  fromBlock?: number;
  toBlock?: number;
  tokenId?: string;
  includeMetadata?: boolean;
  omitPrices?: boolean;
  metadataOptions?: MetadataOptions;
  page?: TokenBalancesPageRequest;
};

export type IsValidMessageSignatureParams = {
  network: Network;
  /** Address to verify against. Omit to use the active Ethereum wallet's address. */
  walletAddress?: string;
  message: string;
  signature: string;
};

export type IsValidSolanaMessageSignatureParams = {
  /** Address to verify against. Omit to use the active Solana wallet's address. */
  walletAddress?: string;
  message: string;
  signature: string;
};

export type IsValidTypedDataSignatureParams = {
  network: Network;
  /** Address to verify against. Omit to use the active Ethereum wallet's address. */
  walletAddress?: string;
  typedData: unknown;
  signature: string;
};

export type IsValidTronMessageSignatureParams = {
  /** Base58Check address (`T…`). Omit to use the active Tron wallet's address. */
  walletAddress?: string;
  message: string;
  signature: string;
};

export type IsValidTronTypedDataSignatureParams = {
  /** Base58Check address (`T…`). Omit to use the active Tron wallet's address. */
  walletAddress?: string;
  typedData: unknown;
  signature: string;
};

export type GetIdTokenParams = {
  ttlSeconds?: number;
  customClaims?: Record<string, unknown>;
};

export type AccessPage = {
  limit?: number;
  cursor?: string;
};

export type RemoteCredentialMetadata = {
  appUrl: string;
  appName: string;
  appLogoUrl: string;
  custom: Record<string, string>;
};

export type SmartSessionGrant =
  | {
      kind: 'nativeTransfer';
      to: string;
      limit: string;
    }
  | {
      kind: 'erc20Transfer';
      token: string;
      to?: string;
      limit: string;
      cumulative?: boolean;
    };

export type DirectAccessGrant = WalletCredential & {
  type: 'direct';
};

export type RemoteAccessGrant = WalletCredential & {
  type: 'remote';
  sessionId: string;
  metadata: RemoteCredentialMetadata;
  grants: SmartSessionGrant[];
};

export type AccessGrant = DirectAccessGrant | RemoteAccessGrant;

export type AccessGrantType = AccessGrant['type'];

export type AccessGrantPage = {
  grants: AccessGrant[];
  page?: AccessPage;
};

export type ListAccessParams = {
  pageSize?: number;
  type?: AccessGrantType;
};

export type ListAccessPageParams = {
  pageSize?: number;
  cursor?: string;
  type?: AccessGrantType;
};

export type AuthorizeRemoteAccessParams = {
  credentialId: string;
  network: Network;
  grants: SmartSessionGrant[];
  expiresAt: string;
  sessionId?: string;
};

export type AuthorizedRemoteAccess = {
  walletId: string;
  sessionId: string;
  expiresAt: string;
};

export type RemoteAccessSession = {
  sessionId: string;
  walletId: string;
  signerAddress: string;
  grants: SmartSessionGrant[];
  chainId: number;
  expiresAt: string;
};

export type SmartSessionGrantUsage = {
  grant: SmartSessionGrant;
  used?: string;
};

export type RevokeAccessParams = {
  credentialId: string;
  sessionId?: string;
};
