import type { EventSubscription } from 'react-native';
import type { Network } from './networks';
import NativeOmsWalletReactNativeSdk from './NativeOmsWalletReactNativeSdk';
import { normalizeNativeError } from './errors';
import { isOmsRelayOidcProvider } from './oidcProviders';
import type {
  OmsNativeFeeOptionSelectionRequest,
  OmsNativeCompleteAuthResult,
  OmsNativeAccessGrant,
  OmsNativeAccessGrantPage,
  OmsNativeFeeOption,
  OmsNativeFeeOptionWithBalance,
  OmsNativeOidcRedirectAuthResult,
  OmsNativePendingWalletSelection,
  OmsNativeSendTransactionResponse,
  OmsNativeSessionExpiredEvent,
  OmsNativeSessionState,
  OmsNativeTransactionStatus,
  OmsNativeTokenBalance,
  OmsNativeNativeTokenBalance,
  OmsNativeContractTokenBalance,
  OmsNativeTokenBalancesPage,
  OmsNativeTokenContractInfo,
  OmsNativeTokenMetadata,
  OmsNativeTokenMetadataAsset,
  OmsNativeTransaction,
  OmsNativeTransactionTransfer,
  OmsNativeWalletAccount,
  OmsNativeWalletActivationResult,
  OmsNativeSmartSessionGrant,
  OmsNativeSolanaBalance,
} from './NativeOmsWalletReactNativeSdk';
import type {
  AccessGrant,
  AccessGrantPage,
  AuthorizeRemoteAccessParams,
  AuthorizedRemoteAccess,
  CallContractParams,
  CompleteEmailAuthParams,
  CreateWalletParams,
  GetBalancesParams,
  GetIdTokenParams,
  GetSolanaBalancesParams,
  GetTransactionHistoryParams,
  HandleOidcRedirectCallbackParams,
  ListAccessPageParams,
  ListAccessParams,
  BalancesResult,
  OMSWalletParams,
  OMSWalletSessionExpiredEvent,
  OMSWalletSessionState,
  CompleteAuthResult,
  ImportEncryptedWalletParams,
  ImportWalletParams,
  IsValidSolanaMessageSignatureParams,
  FeeOption,
  FeeOptionWithBalance,
  FeeOptionSelector,
  OidcRedirectAuthResult,
  PendingWalletSelection,
  SendTransactionResponse,
  StartOidcRedirectAuthResult,
  TransactionHistoryResult,
  TransactionStatusResponse,
  WalletAccount,
  WalletActivationResult,
  SendTransactionParams,
  SendSolanaTransferParams,
  SignMessageParams,
  SignSolanaMessageParams,
  SignInWithOidcIdTokenParams,
  SignTypedDataParams,
  StartEmailAuthParams,
  StartOidcRedirectAuthParams,
  TransactionStatus,
  TokenBalance,
  NativeTokenBalance,
  ContractTokenBalance,
  TokenBalancesPage,
  TokenContractInfo,
  TokenMetadata,
  TokenMetadataAsset,
  Transaction,
  TransactionTransfer,
  IsValidMessageSignatureParams,
  IsValidTypedDataSignatureParams,
  RemoteAccessSession,
  RemoteCredentialMetadata,
  RevokeAccessParams,
  SmartSessionGrant,
  SmartSessionGrantUsage,
  SolanaBalance,
  SolanaBalancesResult,
  SolanaFungibleTokenBalance,
  WalletImportCipherSuite,
  WalletImportRecipientKey,
} from './types';

const OmsWalletReactNativeSdk = new Proxy(NativeOmsWalletReactNativeSdk, {
  get(target, property, receiver) {
    const value = Reflect.get(target, property, receiver);
    if (typeof value !== 'function') {
      return value;
    }
    return (...args: unknown[]) => {
      try {
        const result = Reflect.apply(value, target, args);
        if (
          result != null &&
          typeof (result as { then?: unknown }).then === 'function'
        ) {
          return Promise.resolve(result).catch((error) => {
            throw normalizeNativeError(error);
          });
        }
        return result;
      } catch (error) {
        throw normalizeNativeError(error);
      }
    };
  },
}) as typeof NativeOmsWalletReactNativeSdk;

type IndexerParamsWithNetworks =
  | GetBalancesParams
  | GetTransactionHistoryParams;

function stringifyRequiredJson(value: unknown, name: string): string {
  const json = JSON.stringify(value);
  if (json == null) {
    throw new Error(`${name} must be JSON serializable`);
  }
  return json;
}

function stringifyOptionalJson(value: unknown | undefined): string | null {
  if (value == null) {
    return null;
  }
  return stringifyRequiredJson(value, 'value');
}

function stringifyOptionalNumber(value: number | undefined): string | null {
  return value == null ? null : String(value);
}

function serializePrivateKey(privateKey: string | Uint8Array): {
  text: string | null;
  bytesJson: string | null;
} {
  if (typeof privateKey === 'string') {
    return { text: privateKey, bytesJson: null };
  }
  if (!(privateKey instanceof Uint8Array)) {
    throw new Error('privateKey must be a string or Uint8Array');
  }
  return {
    text: null,
    bytesJson: stringifyRequiredJson(Array.from(privateKey), 'privateKey'),
  };
}

function serializeOidcProvider(params: StartOidcRedirectAuthParams): string {
  if (isOmsRelayOidcProvider(params.provider)) {
    return stringifyRequiredJson(
      { type: 'oms-relay', provider: params.provider.provider },
      'provider'
    );
  }

  if (
    typeof params.provider.providerRedirectUri !== 'string' ||
    params.provider.providerRedirectUri.length === 0
  ) {
    throw new Error('Custom OIDC provider requires providerRedirectUri');
  }
  return stringifyRequiredJson(
    { ...params.provider, type: 'custom' },
    'provider'
  );
}

function omsRelayReturnUri(params: StartOidcRedirectAuthParams): string | null {
  if (!isOmsRelayOidcProvider(params.provider)) {
    return null;
  }
  if (
    typeof params.omsRelayReturnUri !== 'string' ||
    params.omsRelayReturnUri.length === 0
  ) {
    throw new Error('OMS relay OIDC provider requires omsRelayReturnUri');
  }
  return params.omsRelayReturnUri;
}

function serializeIndexerParams(params: IndexerParamsWithNetworks): string {
  return stringifyRequiredJson(
    {
      ...params,
      networks: params.networks?.map((network) => String(network.id)),
    },
    'params'
  );
}

function requireNativeField<T>(
  value: T | null | undefined,
  name: string,
  source = 'auth result'
): T {
  if (value == null) {
    throw new Error(`Native ${source} is missing ${name}`);
  }
  return value;
}

function optionalNativeField<T>(value: T | null | undefined): T | undefined {
  return value == null ? undefined : value;
}

const nativeClientIdValue = 'oms-wallet';
let nextFeeOptionSelectorId = 0;
let currentClientGeneration = 0;
const clientGenerations = new WeakMap<OMSWallet, number>();
const clientReadiness = new WeakMap<OMSWallet, Promise<void>>();

function nativeClientId(owner: OMSWallet): string {
  if (!clientReadiness.has(owner)) {
    throw new Error('OMSWallet is not initialized');
  }
  if (clientGenerations.get(owner) !== currentClientGeneration) {
    throw new Error('This OMSWallet instance has been replaced');
  }
  return nativeClientIdValue;
}

function ensureReady(owner: OMSWallet): Promise<void> {
  const ready = clientReadiness.get(owner);
  if (ready == null) {
    throw new Error('OMSWallet is not initialized');
  }
  return ready;
}

function resetSessionExpiredReplay(owner: OMSWallet) {
  latestSessionExpiredEvents.delete(nativeClientId(owner));
}

let feeOptionSelectionSubscription: EventSubscription | null = null;
const feeOptionSelectors = new Map<string, FeeOptionSelector>();
let sessionExpiredSubscription: EventSubscription | null = null;
const latestSessionExpiredEvents = new Map<
  string,
  OMSWalletSessionExpiredEvent
>();
const sessionExpiredListeners = new Map<
  string,
  Set<(event: OMSWalletSessionExpiredEvent) => void>
>();
const activateNativeWallet = OmsWalletReactNativeSdk.useWallet.bind(
  OmsWalletReactNativeSdk
);

function ensureFeeOptionSelectionListener() {
  feeOptionSelectionSubscription ??=
    OmsWalletReactNativeSdk.onFeeOptionSelectionRequest(
      handleFeeOptionSelectionRequest
    );
}

function handleNativeSessionExpired(event: OmsNativeSessionExpiredEvent) {
  const sessionExpiredEvent: OMSWalletSessionExpiredEvent = {
    session: hydrateSessionState(event.session),
    expiredAt: event.expiredAt,
  };
  latestSessionExpiredEvents.set(event.clientId, sessionExpiredEvent);
  const listeners = sessionExpiredListeners.get(event.clientId);
  if (listeners == null) {
    return;
  }
  for (const listener of Array.from(listeners)) {
    listener(sessionExpiredEvent);
  }
}

function ensureSessionExpiredListener() {
  sessionExpiredSubscription ??= OmsWalletReactNativeSdk.onSessionExpired(
    handleNativeSessionExpired
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function handleFeeOptionSelectionRequest(
  event: OmsNativeFeeOptionSelectionRequest
) {
  const selector = feeOptionSelectors.get(event.selectorId);
  if (selector == null) {
    await OmsWalletReactNativeSdk.respondToFeeOptionSelection(
      event.requestId,
      null,
      null,
      `Fee option selector ${event.selectorId} is no longer registered`
    );
    return;
  }

  try {
    const selection = await selector(
      event.options.map(hydrateFeeOptionWithBalance)
    );
    await OmsWalletReactNativeSdk.respondToFeeOptionSelection(
      event.requestId,
      selection?.token ?? null,
      selection?.index == null ? null : String(selection.index),
      null
    );
  } catch (error) {
    await OmsWalletReactNativeSdk.respondToFeeOptionSelection(
      event.requestId,
      null,
      null,
      errorMessage(error)
    );
  }
}

function hydrateWalletType(value: string): WalletAccount['type'] {
  if (value !== 'ethereum' && value !== 'solana') {
    throw new Error(`Unsupported wallet type from native SDK: ${value}`);
  }
  return value;
}

function hydrateWalletKeyOrigin(value: string): WalletAccount['keyOrigin'] {
  if (value !== 'enclave' && value !== 'imported') {
    throw new Error(`Unsupported wallet key origin from native SDK: ${value}`);
  }
  return value;
}

function hydrateObject(value: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value));
}

function hydrateTokenBalancesPage(
  page: OmsNativeTokenBalancesPage
): TokenBalancesPage {
  return {
    page: page.page,
    pageSize: page.pageSize,
    more: page.more,
  };
}

function hydrateTokenContractInfo(
  info: OmsNativeTokenContractInfo
): TokenContractInfo {
  return {
    chainId: info.chainId,
    address: info.address,
    source: info.source,
    name: info.name,
    type: info.type,
    symbol: info.symbol,
    decimals: optionalNativeField(info.decimals),
    logoURI: optionalNativeField(info.logoURI),
    deployed: info.deployed,
    bytecodeHash: info.bytecodeHash,
    extensions: hydrateObject(info.extensions),
    updatedAt: info.updatedAt,
    queuedAt: optionalNativeField(info.queuedAt),
    status: info.status,
  };
}

function hydrateTokenMetadataAsset(
  asset: OmsNativeTokenMetadataAsset
): TokenMetadataAsset {
  return {
    id: optionalNativeField(asset.id),
    collectionId: optionalNativeField(asset.collectionId),
    tokenId: optionalNativeField(asset.tokenId),
    url: optionalNativeField(asset.url),
    metadataField: optionalNativeField(asset.metadataField),
    name: optionalNativeField(asset.name),
    filesize: optionalNativeField(asset.filesize),
    mimeType: optionalNativeField(asset.mimeType),
    width: optionalNativeField(asset.width),
    height: optionalNativeField(asset.height),
    updatedAt: optionalNativeField(asset.updatedAt),
  };
}

function hydrateTokenMetadata(metadata: OmsNativeTokenMetadata): TokenMetadata {
  return {
    chainId: optionalNativeField(metadata.chainId),
    contractAddress: optionalNativeField(metadata.contractAddress),
    tokenId: metadata.tokenId,
    source: metadata.source,
    name: metadata.name,
    description: optionalNativeField(metadata.description),
    image: optionalNativeField(metadata.image),
    video: optionalNativeField(metadata.video),
    audio: optionalNativeField(metadata.audio),
    properties:
      metadata.properties == null
        ? undefined
        : hydrateObject(metadata.properties),
    attributes: metadata.attributes.map(hydrateObject),
    imageData: optionalNativeField(metadata.imageData),
    externalUrl: optionalNativeField(metadata.externalUrl),
    backgroundColor: optionalNativeField(metadata.backgroundColor),
    animationUrl: optionalNativeField(metadata.animationUrl),
    decimals: optionalNativeField(metadata.decimals),
    updatedAt: optionalNativeField(metadata.updatedAt),
    assets: metadata.assets?.map(hydrateTokenMetadataAsset),
    status: metadata.status,
    queuedAt: optionalNativeField(metadata.queuedAt),
    lastFetched: optionalNativeField(metadata.lastFetched),
  };
}

function hydrateTokenBalance(
  balance: OmsNativeNativeTokenBalance
): NativeTokenBalance;
function hydrateTokenBalance(
  balance: OmsNativeContractTokenBalance
): ContractTokenBalance;
function hydrateTokenBalance(balance: OmsNativeTokenBalance): TokenBalance;
function hydrateTokenBalance(balance: OmsNativeTokenBalance): TokenBalance {
  if (balance.contractAddress == null) {
    const nativeBalance: NativeTokenBalance = {
      contractType: 'NATIVE',
      accountAddress: balance.accountAddress,
      name: requireNativeField(balance.name, 'name', 'native token balance'),
      symbol: requireNativeField(
        balance.symbol,
        'symbol',
        'native token balance'
      ),
      balance: balance.balance,
      chainId: balance.chainId,
      balanceUSD: optionalNativeField(balance.balanceUSD),
      priceUSD: optionalNativeField(balance.priceUSD),
      priceUpdatedAt: optionalNativeField(balance.priceUpdatedAt),
    };
    return nativeBalance;
  }

  const contractBalance: ContractTokenBalance = {
    contractType: balance.contractType,
    contractAddress: balance.contractAddress,
    accountAddress: balance.accountAddress,
    tokenId: requireNativeField(balance.tokenId, 'tokenId', 'token balance'),
    balance: balance.balance,
    blockHash: requireNativeField(
      balance.blockHash,
      'blockHash',
      'token balance'
    ),
    blockNumber: requireNativeField(
      balance.blockNumber,
      'blockNumber',
      'token balance'
    ),
    chainId: balance.chainId,
    balanceUSD: optionalNativeField(balance.balanceUSD),
    priceUSD: optionalNativeField(balance.priceUSD),
    priceUpdatedAt: optionalNativeField(balance.priceUpdatedAt),
    uniqueCollectibles: optionalNativeField(balance.uniqueCollectibles),
    isSummary: optionalNativeField(balance.isSummary),
    contractInfo:
      balance.contractInfo == null
        ? undefined
        : hydrateTokenContractInfo(balance.contractInfo),
    tokenMetadata:
      balance.tokenMetadata == null
        ? undefined
        : hydrateTokenMetadata(balance.tokenMetadata),
  };
  return contractBalance;
}

function hydrateFeeOption(option: OmsNativeFeeOption): FeeOption {
  return {
    token: {
      network: option.token.network,
      name: option.token.name,
      symbol: option.token.symbol,
      type: option.token.type,
      decimals: optionalNativeField(option.token.decimals),
      logoUrl: optionalNativeField(option.token.logoUrl),
      contractAddress: optionalNativeField(option.token.contractAddress),
      tokenId: optionalNativeField(option.token.tokenId),
    },
    value: option.value,
    displayValue: option.displayValue,
  };
}

function hydrateFeeOptionWithBalance(
  option: OmsNativeFeeOptionWithBalance
): FeeOptionWithBalance {
  return {
    feeOption: hydrateFeeOption(option.feeOption),
    selection: {
      token: option.selection.token,
      index: optionalNativeField(option.selection.index),
    },
    balance:
      option.balance == null ? undefined : hydrateTokenBalance(option.balance),
    available: optionalNativeField(option.available),
    availableRaw: optionalNativeField(option.availableRaw),
    decimals: optionalNativeField(option.decimals),
  };
}

function hydrateTransactionTransfer(
  transfer: OmsNativeTransactionTransfer
): TransactionTransfer {
  return {
    transferType: transfer.transferType,
    contractAddress: transfer.contractAddress,
    contractType: transfer.contractType,
    from: transfer.from,
    to: transfer.to,
    tokenIds: optionalNativeField(transfer.tokenIds),
    amounts: transfer.amounts,
    logIndex: transfer.logIndex,
    amountsUSD: optionalNativeField(transfer.amountsUSD),
    pricesUSD: optionalNativeField(transfer.pricesUSD),
    contractInfo:
      transfer.contractInfo == null
        ? undefined
        : hydrateTokenContractInfo(transfer.contractInfo),
    tokenMetadata:
      transfer.tokenMetadata == null
        ? undefined
        : hydrateTokenMetadataRecord(transfer.tokenMetadata),
  };
}

function hydrateTokenMetadataRecord(
  metadata: object
): Record<string, TokenMetadata> {
  return Object.fromEntries(
    Object.entries(metadata as Record<string, unknown>).map(
      ([tokenId, value]) => [
        tokenId,
        hydrateTokenMetadata(value as OmsNativeTokenMetadata),
      ]
    )
  );
}

function hydrateTransaction(transaction: OmsNativeTransaction): Transaction {
  return {
    txnHash: requireNativeField(
      transaction.txnHash,
      'txnHash',
      'indexer transaction'
    ),
    blockNumber: requireNativeField(
      transaction.blockNumber,
      'blockNumber',
      'indexer transaction'
    ),
    blockHash: requireNativeField(
      transaction.blockHash,
      'blockHash',
      'indexer transaction'
    ),
    chainId: requireNativeField(
      transaction.chainId,
      'chainId',
      'indexer transaction'
    ),
    metaTxnId: optionalNativeField(transaction.metaTxnId),
    transfers: requireNativeField(
      transaction.transfers,
      'transfers',
      'indexer transaction'
    ).map(hydrateTransactionTransfer),
    timestamp: requireNativeField(
      transaction.timestamp,
      'timestamp',
      'indexer transaction'
    ),
  };
}

function hydrateWalletAccount(wallet: OmsNativeWalletAccount): WalletAccount {
  return {
    id: wallet.id,
    type: hydrateWalletType(wallet.type),
    address: wallet.address,
    reference: optionalNativeField(wallet.reference),
    keyOrigin: hydrateWalletKeyOrigin(wallet.keyOrigin),
  };
}

function hydrateWalletActivationResult(
  result: OmsNativeWalletActivationResult
): WalletActivationResult {
  return {
    walletAddress: result.walletAddress,
    wallet: hydrateWalletAccount(result.wallet),
  };
}

function hydrateTransactionStatus(value: string): TransactionStatus {
  switch (value) {
    case 'quoted':
    case 'pending':
    case 'executed':
    case 'failed':
    case 'unknown':
      return value;
    default:
      throw new Error(
        `Unsupported transaction status from native SDK: ${value}`
      );
  }
}

function hydrateSendTransactionResponse(
  response: OmsNativeSendTransactionResponse
): SendTransactionResponse {
  return {
    txnId: response.txnId,
    status: hydrateTransactionStatus(response.status),
    txnHash: optionalNativeField(response.txnHash),
    statusResolution: response.statusResolution,
  };
}

function hydrateTransactionStatusResponse(
  response: OmsNativeTransactionStatus
): TransactionStatusResponse {
  return {
    status: hydrateTransactionStatus(response.status),
    txnHash: optionalNativeField(response.txnHash),
  };
}

function hydrateSessionState(
  session: OmsNativeSessionState
): OMSWalletSessionState {
  const auth = session.auth;
  if (auth == null) {
    return {
      walletAddress: optionalNativeField(session.walletAddress),
      expiresAt: optionalNativeField(session.expiresAt),
      auth: undefined,
    };
  }
  if (auth.type === 'email') {
    return {
      walletAddress: optionalNativeField(session.walletAddress),
      expiresAt: optionalNativeField(session.expiresAt),
      auth: {
        type: 'email',
        email: requireNativeField(auth.email, 'email', 'email session auth'),
      },
    };
  }
  if (auth.type === 'oidc') {
    if (auth.flow !== 'redirect' && auth.flow !== 'id-token') {
      throw new Error(
        `Unsupported OIDC auth flow from native SDK: ${auth.flow}`
      );
    }
    if (auth.issuer == null) {
      throw new Error('Native OIDC session is missing issuer');
    }
    return {
      walletAddress: optionalNativeField(session.walletAddress),
      expiresAt: optionalNativeField(session.expiresAt),
      auth: {
        type: 'oidc',
        flow: auth.flow,
        issuer: auth.issuer,
        provider: optionalNativeField(auth.provider),
        providerLabel: optionalNativeField(auth.providerLabel),
        email: optionalNativeField(auth.email),
      },
    };
  }
  throw new Error(
    `Unsupported session auth type from native SDK: ${auth.type}`
  );
}

async function withFeeOptionSelector<T>(
  selector: FeeOptionSelector | undefined,
  operation: (selectorId: string | null) => Promise<T>
): Promise<T> {
  if (selector == null) {
    return operation(null);
  }

  ensureFeeOptionSelectionListener();
  const selectorId = `fee-option-selector-${++nextFeeOptionSelectorId}`;
  feeOptionSelectors.set(selectorId, selector);
  try {
    return await operation(selectorId);
  } finally {
    feeOptionSelectors.delete(selectorId);
  }
}

function hydratePendingWalletSelection(
  owner: OMSWallet,
  pendingSelection: OmsNativePendingWalletSelection
): PendingWalletSelection {
  const { id } = pendingSelection;
  return {
    walletType: hydrateWalletType(pendingSelection.walletType),
    wallets: pendingSelection.wallets.map(hydrateWalletAccount),
    credential: pendingSelection.credential,
    async selectWallet(walletId: string) {
      await ensureReady(owner);
      const result =
        await OmsWalletReactNativeSdk.selectWalletForPendingSelection(
          nativeClientId(owner),
          id,
          walletId
        );
      resetSessionExpiredReplay(owner);
      return hydrateWalletActivationResult(result);
    },
    async createAndSelectWallet(reference?: string) {
      await ensureReady(owner);
      const result =
        await OmsWalletReactNativeSdk.createAndSelectWalletForPendingSelection(
          nativeClientId(owner),
          id,
          reference ?? null
        );
      resetSessionExpiredReplay(owner);
      return hydrateWalletActivationResult(result);
    },
  };
}

function hydrateCompleteAuthResult(
  owner: OMSWallet,
  result: OmsNativeCompleteAuthResult
): CompleteAuthResult {
  switch (result.type) {
    case 'walletSelected': {
      const wallet = hydrateWalletAccount(
        requireNativeField(result.wallet, 'wallet')
      );
      const walletAddress = requireNativeField(
        result.walletAddress,
        'walletAddress'
      );
      return {
        type: 'walletSelected',
        walletAddress,
        wallet,
        wallets: result.wallets.map(hydrateWalletAccount),
        credential: result.credential,
      };
    }
    case 'walletSelection': {
      const pendingSelection = hydratePendingWalletSelection(
        owner,
        requireNativeField(result.pendingSelection, 'pendingSelection')
      );
      return {
        type: 'walletSelection',
        walletAddress: undefined,
        wallet: undefined,
        wallets: pendingSelection.wallets,
        credential: pendingSelection.credential,
        pendingSelection,
      };
    }
    default:
      throw new Error(`Unsupported auth result type: ${result.type}`);
  }
}

function hydrateOidcRedirectAuthResult(
  owner: OMSWallet,
  result: OmsNativeOidcRedirectAuthResult
): OidcRedirectAuthResult {
  switch (result.type) {
    case 'completed':
      return {
        type: 'completed',
        result: hydrateCompleteAuthResult(
          owner,
          requireNativeField(result.result, 'result')
        ),
      };
    case 'notOidcRedirectCallback':
    case 'noPendingAuth':
      return { type: result.type };
    default:
      throw new Error(
        `Unsupported OIDC redirect auth result type: ${result.type}`
      );
  }
}

function hydrateSmartSessionGrant(
  grant: OmsNativeSmartSessionGrant
): SmartSessionGrant {
  if (grant.kind === 'nativeTransfer') {
    return {
      kind: 'nativeTransfer',
      to: requireNativeField(grant.to, 'to', 'native transfer grant'),
      limit: grant.limit,
    };
  }
  if (grant.kind === 'erc20Transfer') {
    return {
      kind: 'erc20Transfer',
      token: requireNativeField(grant.token, 'token', 'ERC-20 transfer grant'),
      to: optionalNativeField(grant.to),
      limit: grant.limit,
      cumulative: optionalNativeField(grant.cumulative),
    };
  }
  throw new Error(
    `Unsupported smart-session grant from native SDK: ${grant.kind}`
  );
}

function hydrateRemoteCredentialMetadata(metadata: {
  appUrl: string;
  appName: string;
  appLogoUrl: string;
  custom: object;
}): RemoteCredentialMetadata {
  return {
    appUrl: metadata.appUrl,
    appName: metadata.appName,
    appLogoUrl: metadata.appLogoUrl,
    custom: Object.fromEntries(
      Object.entries(metadata.custom).map(([key, value]) => [
        key,
        String(value),
      ])
    ),
  };
}

function hydrateAccessGrant(grant: OmsNativeAccessGrant): AccessGrant {
  const credential = grant.credential;
  if (grant.type === 'direct') {
    return { type: 'direct', ...credential };
  }
  if (grant.type === 'remote') {
    return {
      type: 'remote',
      ...credential,
      sessionId: requireNativeField(
        grant.sessionId,
        'sessionId',
        'remote access grant'
      ),
      metadata: hydrateRemoteCredentialMetadata(
        requireNativeField(grant.metadata, 'metadata', 'remote access grant')
      ),
      grants: grant.grants.map(hydrateSmartSessionGrant),
    };
  }
  throw new Error(`Unsupported access grant from native SDK: ${grant.type}`);
}

function hydrateAccessGrantPage(
  response: OmsNativeAccessGrantPage
): AccessGrantPage {
  return {
    grants: response.grants.map(hydrateAccessGrant),
    page:
      response.page == null
        ? undefined
        : {
            limit: optionalNativeField(response.page.limit),
            cursor: optionalNativeField(response.page.cursor),
          },
  };
}

function hydrateSolanaBalance(balance: OmsNativeSolanaBalance): SolanaBalance {
  const common = {
    network: hydrateSolanaNetwork(balance.network),
    accountAddress: balance.accountAddress,
    name: balance.name,
    symbol: balance.symbol,
    decimals: balance.decimals,
    balance: balance.balance,
    formattedBalance: balance.formattedBalance,
    imageUrl: optionalNativeField(balance.imageUrl),
    metadataUri: optionalNativeField(balance.metadataUri),
    verificationStatus: hydrateSolanaVerificationStatus(
      balance.verificationStatus
    ),
    verificationSource: hydrateSolanaVerificationSource(
      balance.verificationSource
    ),
    priceUSD: optionalNativeField(balance.priceUSD),
    balanceUSD: optionalNativeField(balance.balanceUSD),
  };
  if (balance.assetType === 'native') {
    return { ...common, assetType: 'native' };
  }
  if (balance.assetType === 'fungible-token') {
    return {
      ...common,
      assetType: 'fungible-token',
      tokenProgram: hydrateSolanaTokenProgram(
        requireNativeField(
          balance.tokenProgram,
          'tokenProgram',
          'Solana token balance'
        )
      ),
      mintAddress: requireNativeField(
        balance.mintAddress,
        'mintAddress',
        'Solana token balance'
      ),
    };
  }
  throw new Error(
    `Unsupported Solana asset type from native SDK: ${balance.assetType}`
  );
}

function hydrateSolanaNetwork(value: string): SolanaBalance['network'] {
  if (value !== 'solana:devnet' && value !== 'solana:mainnet') {
    throw new Error(`Unsupported Solana network from native SDK: ${value}`);
  }
  return value;
}

function hydrateSolanaVerificationStatus(
  value: string
): SolanaBalance['verificationStatus'] {
  if (value !== 'verified' && value !== 'unverified' && value !== 'unknown') {
    throw new Error(
      `Unsupported Solana verification status from native SDK: ${value}`
    );
  }
  return value;
}

function hydrateSolanaVerificationSource(
  value: string
): SolanaBalance['verificationSource'] {
  if (value !== 'jupiter' && value !== 'solflare-utl' && value !== 'none') {
    throw new Error(
      `Unsupported Solana verification source from native SDK: ${value}`
    );
  }
  return value;
}

function hydrateSolanaTokenProgram(
  value: string
): SolanaFungibleTokenBalance['tokenProgram'] {
  if (value !== 'spl-token' && value !== 'token-2022') {
    throw new Error(
      `Unsupported Solana token program from native SDK: ${value}`
    );
  }
  return value;
}

export class OMSWallet {
  public readonly wallet: OMSWalletClient;
  public readonly indexer: OMSIndexerClient;

  constructor(config: OMSWalletParams) {
    ensureSessionExpiredListener();
    currentClientGeneration += 1;
    clientGenerations.set(this, currentClientGeneration);
    feeOptionSelectors.clear();
    sessionExpiredListeners.delete(nativeClientIdValue);
    latestSessionExpiredEvents.delete(nativeClientIdValue);
    clientReadiness.set(
      this,
      OmsWalletReactNativeSdk.createClient(
        nativeClientIdValue,
        config.publishableKey
      )
    );
    this.wallet = new OMSWalletClient(this);
    this.indexer = new OMSIndexerClient(this);
  }
}

export class OMSWalletClient {
  constructor(private readonly owner: OMSWallet) {}

  async getWalletAddress(): Promise<string | undefined> {
    await ensureReady(this.owner);
    return optionalNativeField(
      await OmsWalletReactNativeSdk.getWalletAddress(nativeClientId(this.owner))
    );
  }

  async getSession(): Promise<OMSWalletSessionState> {
    await ensureReady(this.owner);
    return hydrateSessionState(
      await OmsWalletReactNativeSdk.getSession(nativeClientId(this.owner))
    );
  }

  onSessionExpired(
    listener: (event: OMSWalletSessionExpiredEvent) => void
  ): EventSubscription {
    ensureSessionExpiredListener();
    const clientId = nativeClientId(this.owner);
    let listeners = sessionExpiredListeners.get(clientId);
    if (listeners == null) {
      listeners = new Set();
      sessionExpiredListeners.set(clientId, listeners);
    }
    listeners.add(listener);

    const latestSessionExpiredEvent = latestSessionExpiredEvents.get(clientId);
    if (latestSessionExpiredEvent != null) {
      listener(latestSessionExpiredEvent);
    }

    return {
      remove: () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          sessionExpiredListeners.delete(clientId);
        }
      },
    };
  }

  async startEmailAuth(params: StartEmailAuthParams): Promise<void> {
    await ensureReady(this.owner);
    resetSessionExpiredReplay(this.owner);
    return OmsWalletReactNativeSdk.startEmailAuth(
      nativeClientId(this.owner),
      params.email,
      stringifyOptionalNumber(params.sessionLifetimeSeconds)
    );
  }

  async completeEmailAuth(
    params: CompleteEmailAuthParams
  ): Promise<CompleteAuthResult> {
    await ensureReady(this.owner);
    const result = hydrateCompleteAuthResult(
      this.owner,
      await OmsWalletReactNativeSdk.completeEmailAuth(
        nativeClientId(this.owner),
        params.code,
        params.walletSelection ?? null,
        params.walletType ?? null
      )
    );
    resetSessionExpiredReplay(this.owner);
    return result;
  }

  async signInWithOidcIdToken(
    params: SignInWithOidcIdTokenParams
  ): Promise<CompleteAuthResult> {
    await ensureReady(this.owner);
    resetSessionExpiredReplay(this.owner);
    return hydrateCompleteAuthResult(
      this.owner,
      await OmsWalletReactNativeSdk.signInWithOidcIdToken(
        nativeClientId(this.owner),
        params.idToken,
        params.issuer,
        params.audience,
        params.walletSelection ?? null,
        params.walletType ?? null,
        stringifyOptionalNumber(params.sessionLifetimeSeconds),
        params.provider ?? null,
        params.providerLabel ?? null
      )
    );
  }

  async startOidcRedirectAuth(
    params: StartOidcRedirectAuthParams
  ): Promise<StartOidcRedirectAuthResult> {
    await ensureReady(this.owner);
    resetSessionExpiredReplay(this.owner);
    return OmsWalletReactNativeSdk.startOidcRedirectAuth(
      nativeClientId(this.owner),
      serializeOidcProvider(params),
      omsRelayReturnUri(params),
      params.walletType ?? null,
      params.walletSelection ?? null,
      stringifyOptionalNumber(params.sessionLifetimeSeconds),
      stringifyOptionalJson(params.authorizeParams),
      params.loginHint ?? null
    );
  }

  async handleOidcRedirectCallback(
    params: HandleOidcRedirectCallbackParams
  ): Promise<OidcRedirectAuthResult> {
    await ensureReady(this.owner);
    const result = hydrateOidcRedirectAuthResult(
      this.owner,
      await OmsWalletReactNativeSdk.handleOidcRedirectCallback(
        nativeClientId(this.owner),
        params.callbackUrl,
        params.walletSelection ?? null,
        stringifyOptionalNumber(params.sessionLifetimeSeconds)
      )
    );
    if (
      result.type !== 'notOidcRedirectCallback' &&
      result.type !== 'noPendingAuth'
    ) {
      resetSessionExpiredReplay(this.owner);
    }
    return result;
  }

  async listWallets(): Promise<WalletAccount[]> {
    await ensureReady(this.owner);
    return (
      await OmsWalletReactNativeSdk.listWallets(nativeClientId(this.owner))
    ).map(hydrateWalletAccount);
  }

  async useWallet(walletId: string): Promise<WalletActivationResult> {
    await ensureReady(this.owner);
    const result = await activateNativeWallet(
      nativeClientId(this.owner),
      walletId
    );
    resetSessionExpiredReplay(this.owner);
    return hydrateWalletActivationResult(result);
  }

  async createWallet(
    params: CreateWalletParams = {}
  ): Promise<WalletActivationResult> {
    await ensureReady(this.owner);
    const result = await OmsWalletReactNativeSdk.createWallet(
      nativeClientId(this.owner),
      params.walletType ?? null,
      params.reference ?? null
    );
    resetSessionExpiredReplay(this.owner);
    return hydrateWalletActivationResult(result);
  }

  async importWallet(
    params: ImportWalletParams
  ): Promise<WalletActivationResult> {
    await ensureReady(this.owner);
    const privateKey = serializePrivateKey(params.privateKey);
    const result = await OmsWalletReactNativeSdk.importWallet(
      nativeClientId(this.owner),
      params.type,
      privateKey.text,
      privateKey.bytesJson,
      params.reference ?? null
    );
    resetSessionExpiredReplay(this.owner);
    return hydrateWalletActivationResult(result);
  }

  async getWalletImportRecipientKey(params: {
    cipherSuite: WalletImportCipherSuite;
  }): Promise<WalletImportRecipientKey> {
    await ensureReady(this.owner);
    const key = await OmsWalletReactNativeSdk.getWalletImportRecipientKey(
      nativeClientId(this.owner),
      params.cipherSuite
    );
    if (key.cipherSuite !== params.cipherSuite) {
      throw new Error(
        `Unexpected wallet import cipher suite from native SDK: ${key.cipherSuite}`
      );
    }
    return { ...key, cipherSuite: params.cipherSuite };
  }

  async importEncryptedWallet(
    params: ImportEncryptedWalletParams
  ): Promise<WalletActivationResult> {
    await ensureReady(this.owner);
    const result = await OmsWalletReactNativeSdk.importEncryptedWallet(
      nativeClientId(this.owner),
      params.type,
      params.keyMaterial.keyId,
      params.keyMaterial.cipherSuite,
      params.keyMaterial.encapsulatedKey,
      params.keyMaterial.ciphertext,
      params.reference ?? null
    );
    resetSessionExpiredReplay(this.owner);
    return hydrateWalletActivationResult(result);
  }

  async signOut(): Promise<void> {
    await ensureReady(this.owner);
    resetSessionExpiredReplay(this.owner);
    return OmsWalletReactNativeSdk.signOut(nativeClientId(this.owner));
  }

  async signMessage(params: SignMessageParams): Promise<string> {
    await ensureReady(this.owner);
    return OmsWalletReactNativeSdk.signMessage(
      nativeClientId(this.owner),
      String(params.network.id),
      params.message
    );
  }

  async signSolanaMessage(params: SignSolanaMessageParams): Promise<string> {
    await ensureReady(this.owner);
    return OmsWalletReactNativeSdk.signSolanaMessage(
      nativeClientId(this.owner),
      params.message
    );
  }

  async signTypedData(params: SignTypedDataParams): Promise<string> {
    await ensureReady(this.owner);
    return OmsWalletReactNativeSdk.signTypedData(
      nativeClientId(this.owner),
      String(params.network.id),
      stringifyRequiredJson(params.typedData, 'typedData')
    );
  }

  async sendTransaction(
    params: SendTransactionParams
  ): Promise<SendTransactionResponse> {
    await ensureReady(this.owner);
    return hydrateSendTransactionResponse(
      await withFeeOptionSelector(params.selectFeeOption, (selectorId) =>
        OmsWalletReactNativeSdk.sendTransaction(
          nativeClientId(this.owner),
          String(params.network.id),
          params.to,
          params.value,
          params.data ?? null,
          params.mode ?? null,
          selectorId,
          params.waitForStatus ?? true,
          stringifyOptionalNumber(params.statusPolling?.timeoutMs),
          stringifyOptionalNumber(params.statusPolling?.intervalMs),
          stringifyOptionalNumber(params.statusPolling?.fastIntervalMs),
          stringifyOptionalNumber(params.statusPolling?.fastPollCount)
        )
      )
    );
  }

  async callContract(
    params: CallContractParams
  ): Promise<SendTransactionResponse> {
    await ensureReady(this.owner);
    return hydrateSendTransactionResponse(
      await withFeeOptionSelector(params.selectFeeOption, (selectorId) =>
        OmsWalletReactNativeSdk.callContract(
          nativeClientId(this.owner),
          String(params.network.id),
          params.contractAddress,
          params.method,
          stringifyOptionalJson(params.args),
          params.mode ?? null,
          selectorId,
          params.waitForStatus ?? true,
          stringifyOptionalNumber(params.statusPolling?.timeoutMs),
          stringifyOptionalNumber(params.statusPolling?.intervalMs),
          stringifyOptionalNumber(params.statusPolling?.fastIntervalMs),
          stringifyOptionalNumber(params.statusPolling?.fastPollCount)
        )
      )
    );
  }

  async sendSolanaTransfer(
    params: SendSolanaTransferParams
  ): Promise<SendTransactionResponse> {
    await ensureReady(this.owner);
    return hydrateSendTransactionResponse(
      await withFeeOptionSelector(params.selectFeeOption, (selectorId) =>
        OmsWalletReactNativeSdk.sendSolanaTransfer(
          nativeClientId(this.owner),
          params.network,
          params.asset,
          params.to,
          params.amount,
          params.mode ?? null,
          selectorId,
          params.waitForStatus ?? true,
          stringifyOptionalNumber(params.statusPolling?.timeoutMs),
          stringifyOptionalNumber(params.statusPolling?.intervalMs),
          stringifyOptionalNumber(params.statusPolling?.fastIntervalMs),
          stringifyOptionalNumber(params.statusPolling?.fastPollCount)
        )
      )
    );
  }

  async getTransactionStatus(
    txnId: string
  ): Promise<TransactionStatusResponse> {
    await ensureReady(this.owner);
    return hydrateTransactionStatusResponse(
      await OmsWalletReactNativeSdk.getTransactionStatus(
        nativeClientId(this.owner),
        txnId
      )
    );
  }

  async isValidMessageSignature(
    params: IsValidMessageSignatureParams
  ): Promise<boolean> {
    await ensureReady(this.owner);
    return OmsWalletReactNativeSdk.verifyMessageSignature(
      nativeClientId(this.owner),
      String(params.network.id),
      params.message,
      params.signature
    );
  }

  async isValidSolanaMessageSignature(
    params: IsValidSolanaMessageSignatureParams
  ): Promise<boolean> {
    await ensureReady(this.owner);
    return OmsWalletReactNativeSdk.verifySolanaMessageSignature(
      nativeClientId(this.owner),
      params.message,
      params.signature
    );
  }

  async isValidTypedDataSignature(
    params: IsValidTypedDataSignatureParams
  ): Promise<boolean> {
    await ensureReady(this.owner);
    return OmsWalletReactNativeSdk.verifyTypedDataSignature(
      nativeClientId(this.owner),
      String(params.network.id),
      stringifyRequiredJson(params.typedData, 'typedData'),
      params.signature
    );
  }

  async getIdToken(params: GetIdTokenParams = {}): Promise<string> {
    await ensureReady(this.owner);
    return OmsWalletReactNativeSdk.getIdToken(
      nativeClientId(this.owner),
      params.ttlSeconds == null ? null : String(params.ttlSeconds),
      stringifyOptionalJson(params.customClaims)
    );
  }

  async inspectRemoteCredential(params: {
    credentialId: string;
  }): Promise<RemoteCredentialMetadata> {
    await ensureReady(this.owner);
    return hydrateRemoteCredentialMetadata(
      await OmsWalletReactNativeSdk.inspectRemoteCredential(
        nativeClientId(this.owner),
        params.credentialId
      )
    );
  }

  async authorizeRemoteAccess(
    params: AuthorizeRemoteAccessParams
  ): Promise<AuthorizedRemoteAccess> {
    await ensureReady(this.owner);
    const access = await OmsWalletReactNativeSdk.authorizeRemoteAccess(
      nativeClientId(this.owner),
      params.credentialId,
      String(params.network.id),
      stringifyRequiredJson(params.grants, 'grants'),
      params.expiresAt,
      params.sessionId ?? null
    );
    return access;
  }

  async listAccess(params: ListAccessParams = {}): Promise<AccessGrant[]> {
    await ensureReady(this.owner);
    return (
      await OmsWalletReactNativeSdk.listAccess(
        nativeClientId(this.owner),
        params.pageSize == null ? null : String(params.pageSize),
        params.type ?? null
      )
    ).map(hydrateAccessGrant);
  }

  async *listAccessPages(
    params: ListAccessParams = {}
  ): AsyncGenerator<AccessGrantPage, void, void> {
    let cursor: string | undefined;

    do {
      const response = await this.listAccessPage({
        pageSize: params.pageSize,
        type: params.type,
        cursor,
      });
      yield response;
      cursor = response.page?.cursor || undefined;
    } while (cursor !== undefined);
  }

  async listAccessPage(
    params: ListAccessPageParams = {}
  ): Promise<AccessGrantPage> {
    await ensureReady(this.owner);
    return hydrateAccessGrantPage(
      await OmsWalletReactNativeSdk.listAccessPage(
        nativeClientId(this.owner),
        params.pageSize == null ? null : String(params.pageSize),
        params.cursor ?? null,
        params.type ?? null
      )
    );
  }

  async getRemoteAccessSession(params: {
    sessionId: string;
  }): Promise<RemoteAccessSession> {
    await ensureReady(this.owner);
    const session = await OmsWalletReactNativeSdk.getRemoteAccessSession(
      nativeClientId(this.owner),
      params.sessionId
    );
    return {
      ...session,
      grants: session.grants.map(hydrateSmartSessionGrant),
    };
  }

  async getRemoteAccessSessionUsage(params: {
    sessionId: string;
    network: Network;
  }): Promise<SmartSessionGrantUsage[]> {
    await ensureReady(this.owner);
    return (
      await OmsWalletReactNativeSdk.getRemoteAccessSessionUsage(
        nativeClientId(this.owner),
        params.sessionId,
        String(params.network.id)
      )
    ).map((usage) => ({
      grant: hydrateSmartSessionGrant(usage.grant),
      used: optionalNativeField(usage.used),
    }));
  }

  async revokeAccess(params: RevokeAccessParams): Promise<void> {
    await ensureReady(this.owner);
    return OmsWalletReactNativeSdk.revokeAccess(
      nativeClientId(this.owner),
      params.credentialId,
      params.sessionId ?? null
    );
  }
}

export class OMSIndexerClient {
  constructor(private readonly owner: OMSWallet) {}

  async getBalances(params: GetBalancesParams): Promise<BalancesResult> {
    await ensureReady(this.owner);
    const result = await OmsWalletReactNativeSdk.getBalances(
      nativeClientId(this.owner),
      serializeIndexerParams(params)
    );
    return {
      status: result.status,
      page:
        result.page == null ? undefined : hydrateTokenBalancesPage(result.page),
      nativeBalances: result.nativeBalances.map((balance) =>
        hydrateTokenBalance(balance)
      ),
      balances: result.balances.map((balance) => hydrateTokenBalance(balance)),
    };
  }

  async getTransactionHistory(
    params: GetTransactionHistoryParams
  ): Promise<TransactionHistoryResult> {
    await ensureReady(this.owner);
    const result = await OmsWalletReactNativeSdk.getTransactionHistory(
      nativeClientId(this.owner),
      serializeIndexerParams(params)
    );
    return {
      status: result.status,
      page:
        result.page == null ? undefined : hydrateTokenBalancesPage(result.page),
      transactions: result.transactions.map(hydrateTransaction),
    };
  }

  async getSolanaBalances(
    params: GetSolanaBalancesParams
  ): Promise<SolanaBalancesResult> {
    await ensureReady(this.owner);
    const result = await OmsWalletReactNativeSdk.getSolanaBalances(
      nativeClientId(this.owner),
      stringifyRequiredJson(params, 'params')
    );
    return {
      status: result.status,
      balances: result.balances.map(hydrateSolanaBalance),
      errors: result.errors.map((error) => ({
        network: hydrateSolanaNetwork(error.network),
        reason: error.reason,
      })),
    };
  }
}
