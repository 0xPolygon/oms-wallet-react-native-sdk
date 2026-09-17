import {
  TurboModuleRegistry,
  type CodegenTypes,
  type TurboModule,
} from 'react-native';

export type OmsNativeNetwork = {
  chainId: string;
  name: string;
  nativeTokenSymbol: string;
  explorerUrl: string;
  displayName: string;
};

export type OmsNativeWalletAccount = {
  id: string;
  type: string;
  address: string;
  reference: string | null;
  keyOrigin: string;
};

export type OmsNativeWalletActivationResult = {
  walletAddress: string;
  wallet: OmsNativeWalletAccount;
};

export type OmsNativePendingWalletSelection = {
  id: string;
  walletType: string;
  wallets: OmsNativeWalletAccount[];
  credential: OmsNativeWalletCredential;
};

export type OmsNativeCompleteAuthResult = {
  type: string;
  walletAddress: string | null;
  wallet?: OmsNativeWalletAccount;
  wallets: OmsNativeWalletAccount[];
  credential: OmsNativeWalletCredential;
  pendingSelection?: OmsNativePendingWalletSelection;
};

export type OmsNativeStartOidcRedirectAuthResult = {
  authorizationUrl: string;
};

export type OmsNativeOidcRedirectAuthResult = {
  type: string;
  result?: OmsNativeCompleteAuthResult;
};

export type OmsNativeSessionAuth = {
  type: string;
  flow?: string | null;
  issuer?: string | null;
  provider?: string | null;
  providerLabel?: string | null;
  email: string | null;
};

export type OmsNativeSessionState = {
  walletAddress: string | null;
  expiresAt: string | null;
  auth: OmsNativeSessionAuth | null;
};

export type OmsNativeSessionExpiredEvent = {
  clientId: string;
  session: OmsNativeSessionState;
  expiredAt: string;
};

export type OmsNativeTokenBalancesPage = {
  page: number;
  pageSize: number;
  more: boolean;
};

export type OmsNativeNativeTokenBalance = {
  contractType: 'NATIVE';
  accountAddress: string;
  name: string;
  symbol: string;
  balance: string;
  chainId: number;
  balanceUSD?: string | null;
  priceUSD?: string | null;
  priceUpdatedAt?: string | null;
};

export type OmsNativeContractTokenBalance = {
  contractType: string;
  contractAddress: string;
  accountAddress: string;
  tokenId: string;
  balance: string;
  blockHash: string;
  blockNumber: number;
  chainId: number;
  balanceUSD?: string | null;
  priceUSD?: string | null;
  priceUpdatedAt?: string | null;
  uniqueCollectibles?: string | null;
  isSummary?: boolean | null;
  contractInfo?: OmsNativeTokenContractInfo | null;
  tokenMetadata?: OmsNativeTokenMetadata | null;
};

// React Native Codegen does not support unions of object types. This flat
// bridge-only shape is hydrated into the public native/contract union.
export type OmsNativeTokenBalance = {
  contractType: string;
  contractAddress?: string | null;
  accountAddress: string;
  tokenId?: string | null;
  balance: string;
  blockHash?: string | null;
  blockNumber?: number | null;
  chainId: number;
  name?: string | null;
  symbol?: string | null;
  balanceUSD?: string | null;
  priceUSD?: string | null;
  priceUpdatedAt?: string | null;
  uniqueCollectibles?: string | null;
  isSummary?: boolean | null;
  contractInfo?: OmsNativeTokenContractInfo | null;
  tokenMetadata?: OmsNativeTokenMetadata | null;
};

export type OmsNativeTokenContractInfo = {
  chainId: number;
  address: string;
  source: string;
  name: string;
  type: string;
  symbol: string;
  decimals?: number | null;
  logoURI?: string | null;
  deployed: boolean;
  bytecodeHash: string;
  extensions: CodegenTypes.UnsafeObject;
  updatedAt: string;
  queuedAt?: string | null;
  status: string;
};

export type OmsNativeTokenMetadataAsset = {
  id?: number | null;
  collectionId?: number | null;
  tokenId?: string | null;
  url?: string | null;
  metadataField?: string | null;
  name?: string | null;
  filesize?: number | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  updatedAt?: string | null;
};

export type OmsNativeTokenMetadata = {
  chainId?: number | null;
  contractAddress?: string | null;
  tokenId: string;
  source: string;
  name: string;
  description?: string | null;
  image?: string | null;
  video?: string | null;
  audio?: string | null;
  properties?: CodegenTypes.UnsafeObject | null;
  attributes: CodegenTypes.UnsafeObject[];
  imageData?: string | null;
  externalUrl?: string | null;
  backgroundColor?: string | null;
  animationUrl?: string | null;
  decimals?: number | null;
  updatedAt?: string | null;
  assets?: OmsNativeTokenMetadataAsset[] | null;
  status: string;
  queuedAt?: string | null;
  lastFetched?: string | null;
};

export type OmsNativeBalancesResult = {
  status: number;
  page?: OmsNativeTokenBalancesPage | null;
  nativeBalances: OmsNativeNativeTokenBalance[];
  balances: OmsNativeContractTokenBalance[];
};

export type OmsNativeTransactionTransfer = {
  transferType: string;
  contractAddress: string;
  contractType: string;
  from: string;
  to: string;
  tokenIds?: string[] | null;
  amounts: string[];
  logIndex: number;
  amountsUSD?: string[] | null;
  pricesUSD?: string[] | null;
  contractInfo?: OmsNativeTokenContractInfo | null;
  tokenMetadata?: CodegenTypes.UnsafeObject | null;
};

export type OmsNativeTransaction = {
  txnHash: string;
  blockNumber: number;
  blockHash: string;
  chainId: number;
  metaTxnId?: string | null;
  transfers: OmsNativeTransactionTransfer[];
  timestamp: string;
};

export type OmsNativeTransactionHistoryResult = {
  status: number;
  page?: OmsNativeTokenBalancesPage | null;
  transactions: OmsNativeTransaction[];
};

export type OmsNativeTransactionStatus = {
  status: string;
  txnHash: string | null;
};

export type OmsNativeSendTransactionResponse = {
  txnId: string;
  status: string;
  txnHash: string | null;
  statusResolution: 'not-requested' | 'resolved' | 'timed-out';
};

export type OmsNativeFeeToken = {
  network: string;
  name: string;
  symbol: string;
  type: string;
  decimals: number | null;
  logoUrl: string | null;
  contractAddress: string | null;
  tokenId: string | null;
};

export type OmsNativeFeeOption = {
  token: OmsNativeFeeToken;
  value: string;
  displayValue: string;
};

export type OmsNativeFeeOptionSelection = {
  token: string;
  index: number | null;
};

export type OmsNativeFeeOptionWithBalance = {
  feeOption: OmsNativeFeeOption;
  selection: OmsNativeFeeOptionSelection;
  balance: OmsNativeTokenBalance | null;
  available: string | null;
  availableRaw: string | null;
  decimals: number | null;
};

export type OmsNativeFeeOptionSelectionRequest = {
  selectorId: string;
  requestId: string;
  options: OmsNativeFeeOptionWithBalance[];
};

export type OmsNativeWalletCredential = {
  credentialId: string;
  expiresAt: string;
  isCaller: boolean;
};

export type OmsNativeRemoteCredentialMetadata = {
  appUrl: string;
  appName: string;
  appLogoUrl: string;
  custom: CodegenTypes.UnsafeObject;
};

export type OmsNativeSmartSessionGrant = {
  kind: string;
  token: string | null;
  to: string | null;
  limit: string;
  cumulative: boolean | null;
};

export type OmsNativeAccessGrant = {
  type: string;
  credential: OmsNativeWalletCredential;
  sessionId: string | null;
  metadata: OmsNativeRemoteCredentialMetadata | null;
  grants: OmsNativeSmartSessionGrant[];
};

export type OmsNativeAccessPage = {
  limit: number | null;
  cursor: string | null;
};

export type OmsNativeAccessGrantPage = {
  grants: OmsNativeAccessGrant[];
  page: OmsNativeAccessPage | null;
};

export type OmsNativeWalletImportRecipientKey = {
  keyId: string;
  cipherSuite: string;
  publicKey: string;
};

export type OmsNativeAuthorizedRemoteAccess = {
  walletId: string;
  sessionId: string;
  expiresAt: string;
};

export type OmsNativeRemoteAccessSession = {
  sessionId: string;
  walletId: string;
  signerAddress: string;
  grants: OmsNativeSmartSessionGrant[];
  chainId: number;
  expiresAt: string;
};

export type OmsNativeSmartSessionGrantUsage = {
  grant: OmsNativeSmartSessionGrant;
  used: string | null;
};

export type OmsNativeSolanaBalance = {
  assetType: string;
  network: string;
  accountAddress: string;
  tokenProgram: string | null;
  mintAddress: string | null;
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
  formattedBalance: string;
  imageUrl: string | null;
  metadataUri: string | null;
  verificationStatus: string;
  verificationSource: string;
  priceUSD: string | null;
  balanceUSD: string | null;
};

export type OmsNativeSolanaNetworkError = {
  network: string;
  reason: string;
};

export type OmsNativeSolanaBalancesResult = {
  status: number;
  balances: OmsNativeSolanaBalance[];
  errors: OmsNativeSolanaNetworkError[];
};

export interface Spec extends TurboModule {
  readonly onFeeOptionSelectionRequest: CodegenTypes.EventEmitter<OmsNativeFeeOptionSelectionRequest>;
  readonly onSessionExpired: CodegenTypes.EventEmitter<OmsNativeSessionExpiredEvent>;

  createClient(clientId: string, publishableKey: string): Promise<void>;
  getWalletAddress(clientId: string): Promise<string | null>;
  getSession(clientId: string): Promise<OmsNativeSessionState>;
  startEmailAuth(
    clientId: string,
    email: string,
    sessionLifetimeSeconds: string | null
  ): Promise<void>;
  completeEmailAuth(
    clientId: string,
    code: string,
    walletSelection: string | null,
    walletType: string | null
  ): Promise<OmsNativeCompleteAuthResult>;
  signInWithOidcIdToken(
    clientId: string,
    idToken: string,
    issuer: string,
    audience: string,
    walletSelection: string | null,
    walletType: string | null,
    sessionLifetimeSeconds: string | null,
    provider: string | null,
    providerLabel: string | null
  ): Promise<OmsNativeCompleteAuthResult>;
  startOidcRedirectAuth(
    clientId: string,
    providerJson: string,
    omsRelayReturnUri: string | null,
    walletType: string | null,
    walletSelection: string | null,
    sessionLifetimeSeconds: string | null,
    authorizeParamsJson: string | null,
    loginHint: string | null
  ): Promise<OmsNativeStartOidcRedirectAuthResult>;
  handleOidcRedirectCallback(
    clientId: string,
    callbackUrl: string,
    walletSelection: string | null,
    sessionLifetimeSeconds: string | null
  ): Promise<OmsNativeOidcRedirectAuthResult>;
  listWallets(clientId: string): Promise<OmsNativeWalletAccount[]>;
  useWallet(
    clientId: string,
    walletId: string
  ): Promise<OmsNativeWalletActivationResult>;
  createWallet(
    clientId: string,
    walletType: string | null,
    reference: string | null
  ): Promise<OmsNativeWalletActivationResult>;
  importWallet(
    clientId: string,
    walletType: string,
    privateKey: string | null,
    privateKeyBytesJson: string | null,
    reference: string | null
  ): Promise<OmsNativeWalletActivationResult>;
  getWalletImportRecipientKey(
    clientId: string,
    cipherSuite: string
  ): Promise<OmsNativeWalletImportRecipientKey>;
  importEncryptedWallet(
    clientId: string,
    walletType: string,
    keyId: string,
    cipherSuite: string,
    encapsulatedKey: string,
    ciphertext: string,
    reference: string | null
  ): Promise<OmsNativeWalletActivationResult>;
  selectWalletForPendingSelection(
    clientId: string,
    pendingSelectionId: string,
    walletId: string
  ): Promise<OmsNativeWalletActivationResult>;
  createAndSelectWalletForPendingSelection(
    clientId: string,
    pendingSelectionId: string,
    reference: string | null
  ): Promise<OmsNativeWalletActivationResult>;
  signOut(clientId: string): Promise<void>;
  signMessage(
    clientId: string,
    chainId: string,
    message: string
  ): Promise<string>;
  signSolanaMessage(clientId: string, message: string): Promise<string>;
  signTypedData(
    clientId: string,
    chainId: string,
    typedDataJson: string
  ): Promise<string>;
  sendTransaction(
    clientId: string,
    chainId: string,
    to: string,
    value: string,
    data: string | null,
    mode: string | null,
    feeOptionSelectorId: string | null,
    waitForStatus: boolean,
    statusPollingTimeoutMs: string | null,
    statusPollingIntervalMs: string | null,
    statusPollingFastIntervalMs: string | null,
    statusPollingFastPollCount: string | null
  ): Promise<OmsNativeSendTransactionResponse>;
  callContract(
    clientId: string,
    chainId: string,
    contractAddress: string,
    method: string,
    argsJson: string | null,
    mode: string | null,
    feeOptionSelectorId: string | null,
    waitForStatus: boolean,
    statusPollingTimeoutMs: string | null,
    statusPollingIntervalMs: string | null,
    statusPollingFastIntervalMs: string | null,
    statusPollingFastPollCount: string | null
  ): Promise<OmsNativeSendTransactionResponse>;
  sendSolanaTransfer(
    clientId: string,
    network: string,
    asset: string,
    to: string,
    amount: string,
    mode: string | null,
    feeOptionSelectorId: string | null,
    waitForStatus: boolean,
    statusPollingTimeoutMs: string | null,
    statusPollingIntervalMs: string | null,
    statusPollingFastIntervalMs: string | null,
    statusPollingFastPollCount: string | null
  ): Promise<OmsNativeSendTransactionResponse>;
  respondToFeeOptionSelection(
    requestId: string,
    selectionToken: string | null,
    selectionIndex: string | null,
    errorMessage: string | null
  ): Promise<void>;
  getTransactionStatus(
    clientId: string,
    txnId: string
  ): Promise<OmsNativeTransactionStatus>;
  getBalances(
    clientId: string,
    paramsJson: string
  ): Promise<OmsNativeBalancesResult>;
  getTransactionHistory(
    clientId: string,
    paramsJson: string
  ): Promise<OmsNativeTransactionHistoryResult>;
  getSolanaBalances(
    clientId: string,
    paramsJson: string
  ): Promise<OmsNativeSolanaBalancesResult>;
  verifyMessageSignature(
    clientId: string,
    chainId: string,
    message: string,
    signature: string
  ): Promise<boolean>;
  verifySolanaMessageSignature(
    clientId: string,
    message: string,
    signature: string
  ): Promise<boolean>;
  verifyTypedDataSignature(
    clientId: string,
    chainId: string,
    typedDataJson: string,
    signature: string
  ): Promise<boolean>;
  getIdToken(
    clientId: string,
    ttlSeconds: string | null,
    customClaimsJson: string | null
  ): Promise<string>;
  inspectRemoteCredential(
    clientId: string,
    credentialId: string
  ): Promise<OmsNativeRemoteCredentialMetadata>;
  authorizeRemoteAccess(
    clientId: string,
    credentialId: string,
    chainId: string,
    grantsJson: string,
    expiresAt: string,
    sessionId: string | null
  ): Promise<OmsNativeAuthorizedRemoteAccess>;
  listAccess(
    clientId: string,
    pageSize: string | null,
    type: string | null
  ): Promise<OmsNativeAccessGrant[]>;
  listAccessPage(
    clientId: string,
    pageSize: string | null,
    cursor: string | null,
    type: string | null
  ): Promise<OmsNativeAccessGrantPage>;
  getRemoteAccessSession(
    clientId: string,
    sessionId: string
  ): Promise<OmsNativeRemoteAccessSession>;
  getRemoteAccessSessionUsage(
    clientId: string,
    sessionId: string,
    chainId: string
  ): Promise<OmsNativeSmartSessionGrantUsage[]>;
  revokeAccess(
    clientId: string,
    credentialId: string,
    sessionId: string | null
  ): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>(
  'OmsWalletReactNativeSdk'
);
