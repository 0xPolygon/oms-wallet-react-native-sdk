import type { EventSubscription } from 'react-native';
import type { Network } from './networks';
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
  CallTronContractParams,
  GetTronBalancesParams,
  IsValidTronMessageSignatureParams,
  IsValidTronTypedDataSignatureParams,
  OMSWalletParams,
  OMSWalletSession,
  OMSWalletSessionChangeListener,
  SendTronTransactionParams,
  SignTronMessageParams,
  SignTronTypedDataParams,
  TronBalancesResult,
  CompleteAuthResult,
  ImportEncryptedWalletParams,
  ImportWalletParams,
  OidcRedirectAuthResult,
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
  IsValidMessageSignatureParams,
  IsValidSolanaMessageSignatureParams,
  IsValidTypedDataSignatureParams,
  RemoteAccessSession,
  RemoteCredentialMetadata,
  RevokeAccessParams,
  SmartSessionGrantUsage,
  SolanaBalancesResult,
  WalletImportCipherSuite,
  WalletImportRecipientKey,
} from './types';

function unsupported(): never {
  throw new Error(
    "'@polygonlabs/oms-wallet-react-native' is only supported on native platforms."
  );
}

export class OMSWallet {
  public readonly wallet: OMSWalletClient;
  public readonly indexer: OMSIndexerClient;

  constructor(_config: OMSWalletParams) {
    this.wallet = new OMSWalletClient();
    this.indexer = new OMSIndexerClient();
  }
}

export class OMSWalletClient {
  getActiveWallet(): Promise<WalletAccount | undefined> {
    unsupported();
  }

  getSession(): Promise<OMSWalletSession | undefined> {
    unsupported();
  }

  onSessionChange(
    _listener: OMSWalletSessionChangeListener
  ): EventSubscription {
    unsupported();
  }

  startEmailAuth(_params: StartEmailAuthParams): Promise<void> {
    unsupported();
  }

  completeEmailAuth(
    _params: CompleteEmailAuthParams
  ): Promise<CompleteAuthResult> {
    unsupported();
  }

  signInWithOidcIdToken(
    _params: SignInWithOidcIdTokenParams
  ): Promise<CompleteAuthResult> {
    unsupported();
  }

  startOidcRedirectAuth(
    _params: StartOidcRedirectAuthParams
  ): Promise<StartOidcRedirectAuthResult> {
    unsupported();
  }

  handleOidcRedirectCallback(
    _params: HandleOidcRedirectCallbackParams
  ): Promise<OidcRedirectAuthResult> {
    unsupported();
  }

  listWallets(): Promise<WalletAccount[]> {
    unsupported();
  }

  useWallet(_walletId: string): Promise<WalletActivationResult> {
    unsupported();
  }

  claimWallet(_walletId: string): Promise<WalletActivationResult> {
    unsupported();
  }

  createWallet(
    _params: CreateWalletParams = {}
  ): Promise<WalletActivationResult> {
    unsupported();
  }

  importWallet(_params: ImportWalletParams): Promise<WalletActivationResult> {
    unsupported();
  }

  getWalletImportRecipientKey(_params: {
    cipherSuite: WalletImportCipherSuite;
  }): Promise<WalletImportRecipientKey> {
    unsupported();
  }

  importEncryptedWallet(
    _params: ImportEncryptedWalletParams
  ): Promise<WalletActivationResult> {
    unsupported();
  }

  signOut(): Promise<void> {
    unsupported();
  }

  signMessage(_params: SignMessageParams): Promise<string> {
    unsupported();
  }

  signSolanaMessage(_params: SignSolanaMessageParams): Promise<string> {
    unsupported();
  }

  signTypedData(_params: SignTypedDataParams): Promise<string> {
    unsupported();
  }

  signTronMessage(_params: SignTronMessageParams): Promise<string> {
    unsupported();
  }

  signTronTypedData(_params: SignTronTypedDataParams): Promise<string> {
    unsupported();
  }

  sendTransaction(
    _params: SendTransactionParams
  ): Promise<SendTransactionResponse> {
    unsupported();
  }

  callContract(_params: CallContractParams): Promise<SendTransactionResponse> {
    unsupported();
  }

  sendSolanaTransfer(
    _params: SendSolanaTransferParams
  ): Promise<SendTransactionResponse> {
    unsupported();
  }

  sendTronTransaction(
    _params: SendTronTransactionParams
  ): Promise<SendTransactionResponse> {
    unsupported();
  }

  callTronContract(
    _params: CallTronContractParams
  ): Promise<SendTransactionResponse> {
    unsupported();
  }

  getTransactionStatus(_txnId: string): Promise<TransactionStatusResponse> {
    unsupported();
  }

  isValidMessageSignature(
    _params: IsValidMessageSignatureParams
  ): Promise<boolean> {
    unsupported();
  }

  isValidSolanaMessageSignature(
    _params: IsValidSolanaMessageSignatureParams
  ): Promise<boolean> {
    unsupported();
  }

  isValidTypedDataSignature(
    _params: IsValidTypedDataSignatureParams
  ): Promise<boolean> {
    unsupported();
  }

  isValidTronMessageSignature(
    _params: IsValidTronMessageSignatureParams
  ): Promise<boolean> {
    unsupported();
  }

  isValidTronTypedDataSignature(
    _params: IsValidTronTypedDataSignatureParams
  ): Promise<boolean> {
    unsupported();
  }

  getIdToken(_params: GetIdTokenParams = {}): Promise<string> {
    unsupported();
  }

  inspectRemoteCredential(_params: {
    credentialId: string;
  }): Promise<RemoteCredentialMetadata> {
    unsupported();
  }

  authorizeRemoteAccess(
    _params: AuthorizeRemoteAccessParams
  ): Promise<AuthorizedRemoteAccess> {
    unsupported();
  }

  listAccess(_params: ListAccessParams = {}): Promise<AccessGrant[]> {
    unsupported();
  }

  async *listAccessPages(
    _params: ListAccessParams = {}
  ): AsyncGenerator<AccessGrantPage, void, void> {
    unsupported();
  }

  listAccessPage(_params: ListAccessPageParams = {}): Promise<AccessGrantPage> {
    unsupported();
  }

  getRemoteAccessSession(_params: {
    sessionId: string;
  }): Promise<RemoteAccessSession> {
    unsupported();
  }

  getRemoteAccessSessionUsage(_params: {
    sessionId: string;
    network: Network;
  }): Promise<SmartSessionGrantUsage[]> {
    unsupported();
  }

  revokeAccess(_params: RevokeAccessParams): Promise<void> {
    unsupported();
  }
}

export class OMSIndexerClient {
  getBalances(_params: GetBalancesParams): Promise<BalancesResult> {
    unsupported();
  }

  getTransactionHistory(
    _params: GetTransactionHistoryParams
  ): Promise<TransactionHistoryResult> {
    unsupported();
  }

  getSolanaBalances(
    _params: GetSolanaBalancesParams
  ): Promise<SolanaBalancesResult> {
    unsupported();
  }

  getTronBalances(_params: GetTronBalancesParams): Promise<TronBalancesResult> {
    unsupported();
  }
}
