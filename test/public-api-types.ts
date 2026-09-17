import type {
  FeeOptionSelector,
  FeeToken,
  GetBalancesParams,
  NativeTokenBalance,
  OMSWalletSessionState,
  SendTransactionParams,
  SendTransactionResponse,
  StartEmailAuthParams,
  ContractTokenBalance,
  TokenBalance,
  Transaction,
  AccessGrant,
  ImportWalletParams,
  SolanaBalance,
  WalletAccount,
} from '../src/types';
import type { OMSWalletError, OMSWalletUpstreamError } from '../src/errors';

type Assert<T extends true> = T;
type IsOptional<T, K extends keyof T> = {} extends Pick<T, K> ? true : false;
type ExcludesNull<T> = null extends T ? false : true;

export type PublicInputsExcludeNull = Assert<
  ExcludesNull<StartEmailAuthParams['sessionLifetimeSeconds']> &
    ExcludesNull<SendTransactionParams['data']> &
    ExcludesNull<GetBalancesParams['omitPrices']>
>;

export type PublicOutputsExcludeNull = Assert<
  ExcludesNull<OMSWalletSessionState['walletAddress']> &
    ExcludesNull<WalletAccount['reference']> &
    ExcludesNull<SendTransactionResponse['txnHash']> &
    ExcludesNull<ContractTokenBalance['contractAddress']> &
    ExcludesNull<Awaited<ReturnType<FeeOptionSelector>>>
>;

export type OptionalOutputFieldsRemainOptional = Assert<
  IsOptional<WalletAccount, 'reference'> &
    IsOptional<FeeToken, 'decimals'> &
    IsOptional<TokenBalance, 'balanceUSD'> &
    IsOptional<SendTransactionResponse, 'txnHash'>
>;

export type RequiredTransactionFieldsRemainRequired = Assert<
  IsOptional<Transaction, 'txnHash'> extends false ? true : false
>;

export type WalletKeyOriginRemainsRequired = Assert<
  IsOptional<WalletAccount, 'keyOrigin'> extends false ? true : false
>;

export function narrowAccessGrant(grant: AccessGrant): string {
  if (grant.type === 'remote') {
    return grant.sessionId;
  }
  return grant.credentialId;
}

export function narrowSolanaBalance(balance: SolanaBalance): string {
  if (balance.assetType === 'fungible-token') {
    return balance.mintAddress;
  }
  const mintAddress: undefined = balance.mintAddress;
  return mintAddress ?? balance.accountAddress;
}

export const byteWalletImport: ImportWalletParams = {
  type: 'solana',
  privateKey: new Uint8Array(32),
};

export function narrowTokenBalance(
  tokenBalance: TokenBalance
): string | undefined {
  if (tokenBalance.contractAddress === undefined) {
    const nativeBalance: NativeTokenBalance = tokenBalance;
    const nativeTokenId: undefined = nativeBalance.tokenId;
    return nativeTokenId;
  }

  const contractBalance: ContractTokenBalance = tokenBalance;
  const contractAddress: string = contractBalance.contractAddress;
  return contractAddress;
}

export type PublicErrorsExcludeNull = Assert<
  ExcludesNull<OMSWalletError['operation']> &
    ExcludesNull<OMSWalletUpstreamError['message']>
>;
