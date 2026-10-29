import Foundation
import OMSWallet
import React

@objc(OmsWalletReactNativeSdkImpl)
public final class OmsWalletReactNativeSdkImpl: NSObject, @unchecked Sendable {
  private var clients: [String: ClientBox] = [:]
  private let clientsLock = NSLock()
  private var feeOptionSelectionRequestEmitter: ((NSDictionary) -> Void)?
  private var sessionChangeEventEmitter: ((NSDictionary) -> Void)?
  private var pendingFeeOptionSelections: [String: CheckedContinuation<FeeOptionSelection?, Error>] = [:]
  private let pendingFeeOptionSelectionsLock = NSLock()
  private var pendingWalletSelections: [String: StoredPendingWalletSelection] = [:]
  private let pendingWalletSelectionsLock = NSLock()

  @objc(setFeeOptionSelectionRequestEmitter:)
  public func setFeeOptionSelectionRequestEmitter(_ emitter: @escaping (NSDictionary) -> Void) {
    feeOptionSelectionRequestEmitter = emitter
  }

  @objc(setSessionChangeEventEmitter:)
  public func setSessionChangeEventEmitter(_ emitter: @escaping (NSDictionary) -> Void) {
    sessionChangeEventEmitter = emitter
  }

  @objc(createClientWithClientId:publishableKey:resolve:reject:)
  public func createClient(
    clientId: String,
    publishableKey: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      clearPendingWalletSelections(clientId: clientId)
      let client = try OMSWallet(publishableKey: publishableKey)
      let sessionChangeObservation = client.wallet.addSessionChangeObserver { [weak self] event in
        guard let self else {
          return
        }
        self.sessionChangeEventEmitter?(
          self.sessionChangeEventDictionary(clientId: clientId, event: event) as NSDictionary
        )
      }
      storeClient(
        ClientBox(client, sessionChangeObservation: sessionChangeObservation),
        clientId: clientId
      )
      resolve(nil)
    } catch {
      rejectError(reject, error)
    }
  }

  @objc(getSessionWithClientId:resolve:reject:)
  public func getSession(
    clientId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      let wallet = try requireClient(clientId).wallet
      // `session` is non-nil exactly when `activeWallet` is; read both together.
      guard let activeWallet = wallet.activeWallet, let session = wallet.session else {
        resolve(["activeWallet": NSNull(), "session": NSNull()])
        return
      }
      resolve([
        "activeWallet": walletDictionary(activeWallet),
        "session": sessionDictionary(session)
      ])
    } catch {
      rejectError(reject, error)
    }
  }

  @objc(startEmailAuthWithClientId:email:sessionLifetimeSeconds:resolve:reject:)
  public func startEmailAuth(
    clientId: String,
    email: String,
    sessionLifetimeSeconds: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      try await client.wallet.startEmailAuth(
        email: email,
        sessionLifetimeSeconds: try self.sessionLifetimeSeconds(sessionLifetimeSeconds)
      )
      return nil
    }
  }

  @objc(completeEmailAuthWithClientId:code:walletSelection:walletType:resolve:reject:)
  public func completeEmailAuth(
    clientId: String,
    code: String,
    walletSelection: String?,
    walletType: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      let result = try await client.wallet.completeEmailAuth(
        code: code,
        walletSelection: try self.walletSelectionBehavior(walletSelection),
        walletType: try self.walletType(walletType)
      )
      return try self.completeAuthResultDictionary(clientId: clientId, result)
    }
  }

  @objc(signInWithOidcIdTokenWithClientId:idToken:issuer:audience:walletSelection:walletType:sessionLifetimeSeconds:provider:providerLabel:resolve:reject:)
  public func signInWithOidcIdToken(
    clientId: String,
    idToken: String,
    issuer: String,
    audience: String,
    walletSelection: String?,
    walletType: String?,
    sessionLifetimeSeconds: String?,
    provider: String?,
    providerLabel: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      let result = try await client.wallet.signInWithOidcIdToken(
        idToken: idToken,
        issuer: issuer,
        audience: audience,
        walletType: try self.walletType(walletType),
        walletSelection: try self.walletSelectionBehavior(walletSelection),
        sessionLifetimeSeconds: try self.sessionLifetimeSeconds(sessionLifetimeSeconds),
        provider: provider,
        providerLabel: providerLabel
      )
      return try self.completeAuthResultDictionary(clientId: clientId, result)
    }
  }

  @objc(startOIDCRedirectAuthWithClientId:providerJson:omsRelayReturnUri:walletType:walletSelection:sessionLifetimeSeconds:authorizeParamsJson:loginHint:resolve:reject:)
  public func startOIDCRedirectAuth(
    clientId: String,
    providerJson: String,
    omsRelayReturnUri: String?,
    walletType: String?,
    walletSelection: String?,
    sessionLifetimeSeconds: String?,
    authorizeParamsJson: String?,
    loginHint: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      let provider = try self.decodeOidcProvider(providerJson)
      let result: StartOIDCRedirectAuthResult
      switch provider {
      case .omsRelay(let value):
        guard let omsRelayReturnUri, !omsRelayReturnUri.isEmpty else {
          throw self.makeError("OMS relay OIDC provider requires omsRelayReturnUri")
        }
        result = try await client.wallet.startOIDCRedirectAuth(
          provider: value,
          omsRelayReturnURI: omsRelayReturnUri,
          walletType: try self.walletType(walletType),
          walletSelection: try self.optionalWalletSelectionBehavior(walletSelection),
          sessionLifetimeSeconds: try self.optionalSessionLifetimeSeconds(sessionLifetimeSeconds),
          loginHint: loginHint
        )
      case .custom(let value):
        result = try await client.wallet.startOIDCRedirectAuth(
          provider: value,
          walletType: try self.walletType(walletType),
          walletSelection: try self.optionalWalletSelectionBehavior(walletSelection),
          sessionLifetimeSeconds: try self.optionalSessionLifetimeSeconds(sessionLifetimeSeconds),
          loginHint: loginHint,
          authorizeParams: try self.decodeStringMap(authorizeParamsJson, name: "authorizeParams") ?? [:]
        )
      }
      return [
        "authorizationUrl": result.authorizationURL
      ]
    }
  }

  @objc(handleOIDCRedirectCallbackWithClientId:callbackUrl:walletSelection:sessionLifetimeSeconds:resolve:reject:)
  public func handleOIDCRedirectCallback(
    clientId: String,
    callbackUrl: String,
    walletSelection: String?,
    sessionLifetimeSeconds: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      let result = try await client.wallet.handleOIDCRedirectCallback(
        callbackUrl,
        walletSelection: try self.optionalWalletSelectionBehavior(walletSelection),
        sessionLifetimeSeconds: try self.optionalSessionLifetimeSeconds(sessionLifetimeSeconds)
      )
      switch result {
      case .completed(let result):
        self.clearPendingWalletSelections(clientId: clientId)
        return [
          "type": "completed",
          "result": try self.completeAuthResultDictionary(clientId: clientId, result)
        ]
      case .notOIDCRedirectCallback:
        return ["type": "notOidcRedirectCallback"]
      case .noPendingAuth:
        return ["type": "noPendingAuth"]
      }
    }
  }

  @objc(listWalletsWithClientId:resolve:reject:)
  public func listWallets(
    clientId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      try await client.wallet.listWallets().map(self.walletDictionary)
    }
  }

  @objc(useWalletWithClientId:walletId:resolve:reject:)
  public func useWallet(
    clientId: String,
    walletId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      self.walletActivationResultDictionary(try await client.wallet.useWallet(walletId: walletId))
    }
  }

  @objc(claimWalletWithClientId:walletId:resolve:reject:)
  public func claimWallet(
    clientId: String,
    walletId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      self.walletActivationResultDictionary(try await client.wallet.claimWallet(walletId: walletId))
    }
  }

  @objc(createWalletWithClientId:walletType:reference:resolve:reject:)
  public func createWallet(
    clientId: String,
    walletType: String?,
    reference: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      self.walletActivationResultDictionary(
        try await client.wallet.createWallet(
          walletType: try self.walletType(walletType),
          reference: reference
        )
      )
    }
  }

  @objc(importWalletWithClientId:walletType:privateKey:privateKeyBytesJson:reference:resolve:reject:)
  public func importWallet(
    clientId: String,
    walletType: String,
    privateKey: String?,
    privateKeyBytesJson: String?,
    reference: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      let type = try self.walletType(walletType)
      let key: WalletImportPrivateKey
      switch (privateKey, privateKeyBytesJson) {
      case (.some(let value), nil):
        switch type {
        case .ethereum: key = .ethereum(value)
        case .solana: key = .solana(value)
        case .tron: key = .tron(value)
        case .unknown(let value): throw self.makeError("Unsupported wallet type: \(value)")
        }
      case (nil, .some(let value)):
        let bytes = Data(try self.decodeJSON([UInt8].self, from: value, name: "privateKey"))
        switch type {
        case .ethereum: key = .ethereumBytes(bytes)
        case .solana: key = .solanaBytes(bytes)
        case .tron: key = .tronBytes(bytes)
        case .unknown(let value): throw self.makeError("Unsupported wallet type: \(value)")
        }
      default:
        throw self.makeError("Exactly one private key representation is required")
      }
      return self.walletActivationResultDictionary(
        try await client.wallet.importWallet(privateKey: key, reference: reference)
      )
    }
  }

  @objc(getWalletImportRecipientKeyWithClientId:cipherSuite:resolve:reject:)
  public func getWalletImportRecipientKey(
    clientId: String,
    cipherSuite: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      self.walletImportRecipientKeyDictionary(
        try await client.wallet.getWalletImportRecipientKey(
          cipherSuite: try self.walletImportCipherSuite(cipherSuite)
        )
      )
    }
  }

  @objc(importEncryptedWalletWithClientId:walletType:keyId:cipherSuite:encapsulatedKey:ciphertext:reference:resolve:reject:)
  public func importEncryptedWallet(
    clientId: String,
    walletType: String,
    keyId: String,
    cipherSuite: String,
    encapsulatedKey: String,
    ciphertext: String,
    reference: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      self.walletActivationResultDictionary(
        try await client.wallet.importEncryptedWallet(
          walletType: try self.walletType(walletType),
          keyMaterial: EncryptedWalletImportKeyMaterial(
            keyId: keyId,
            cipherSuite: try self.walletImportCipherSuite(cipherSuite),
            encapsulatedKey: encapsulatedKey,
            ciphertext: ciphertext
          ),
          reference: reference
        )
      )
    }
  }

  @objc(selectWalletForPendingSelectionWithClientId:pendingSelectionId:walletId:resolve:reject:)
  public func selectWalletForPendingSelection(
    clientId: String,
    pendingSelectionId: String,
    walletId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      let pendingSelection = try requirePendingWalletSelection(pendingSelectionId, clientId: clientId)
      let callbacks = PromiseCallbacks(resolve: resolve, reject: reject)
      Task { [callbacks, pendingSelection] in
        do {
          let result = try await pendingSelection.selectWallet(walletId: walletId)
          self.removePendingWalletSelection(pendingSelectionId)
          callbacks.resolve(self.walletActivationResultDictionary(result))
        } catch {
          self.rejectError(callbacks.reject, error)
        }
      }
    } catch {
      rejectError(reject, error)
    }
  }

  @objc(createAndSelectWalletForPendingSelectionWithClientId:pendingSelectionId:reference:resolve:reject:)
  public func createAndSelectWalletForPendingSelection(
    clientId: String,
    pendingSelectionId: String,
    reference: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      let pendingSelection = try requirePendingWalletSelection(pendingSelectionId, clientId: clientId)
      let callbacks = PromiseCallbacks(resolve: resolve, reject: reject)
      Task { [callbacks, pendingSelection] in
        do {
          let result = try await pendingSelection.createAndSelectWallet(reference: reference)
          self.removePendingWalletSelection(pendingSelectionId)
          callbacks.resolve(self.walletActivationResultDictionary(result))
        } catch {
          self.rejectError(callbacks.reject, error)
        }
      }
    } catch {
      rejectError(reject, error)
    }
  }

  @objc(claimAndSelectWalletForPendingSelectionWithClientId:pendingSelectionId:walletId:resolve:reject:)
  public func claimAndSelectWalletForPendingSelection(
    clientId: String,
    pendingSelectionId: String,
    walletId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      let pendingSelection = try requirePendingWalletSelection(pendingSelectionId, clientId: clientId)
      let callbacks = PromiseCallbacks(resolve: resolve, reject: reject)
      Task { [callbacks, pendingSelection] in
        do {
          let result = try await pendingSelection.claimAndSelectWallet(walletId: walletId)
          self.removePendingWalletSelection(pendingSelectionId)
          callbacks.resolve(self.walletActivationResultDictionary(result))
        } catch {
          self.rejectError(callbacks.reject, error)
        }
      }
    } catch {
      rejectError(reject, error)
    }
  }

  @objc(signOutWithClientId:resolve:reject:)
  public func signOut(
    clientId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      clearPendingWalletSelections(clientId: clientId)
      try requireClient(clientId).wallet.signOut()
      resolve(nil)
    } catch {
      rejectError(reject, error)
    }
  }

  @objc(signMessageWithClientId:chainId:message:resolve:reject:)
  public func signMessage(
    clientId: String,
    chainId: String,
    message: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      let network = try self.requireNetwork(client, chainId: chainId)
      return try await client.wallet.signMessage(network: network, message: message)
    }
  }

  @objc(signSolanaMessageWithClientId:message:resolve:reject:)
  public func signSolanaMessage(
    clientId: String,
    message: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      try await client.wallet.signSolanaMessage(message: message)
    }
  }

  @objc(signTronMessageWithClientId:message:resolve:reject:)
  public func signTronMessage(
    clientId: String,
    message: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      try await client.wallet.signTronMessage(message: message)
    }
  }

  @objc(signTronTypedDataWithClientId:typedDataJson:resolve:reject:)
  public func signTronTypedData(
    clientId: String,
    typedDataJson: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      try await client.wallet.signTronTypedData(
        typedData: try self.decodeJsonValue(typedDataJson, name: "typedData")
      )
    }
  }

  @objc(signTypedDataWithClientId:chainId:typedDataJson:resolve:reject:)
  public func signTypedData(
    clientId: String,
    chainId: String,
    typedDataJson: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      let network = try self.requireNetwork(client, chainId: chainId)
      return try await client.wallet.signTypedData(
        network: network,
        typedData: try self.decodeJsonValue(typedDataJson, name: "typedData")
      )
    }
  }

  @objc(sendTransactionWithClientId:chainId:to:value:data:mode:feeOptionSelectorId:waitForStatus:statusPollingTimeoutMs:statusPollingIntervalMs:statusPollingFastIntervalMs:statusPollingFastPollCount:resolve:reject:)
  public func sendTransaction(
    clientId: String,
    chainId: String,
    to: String,
    value: String,
    data: String?,
    mode: String?,
    feeOptionSelectorId: String?,
    waitForStatus: Bool,
    statusPollingTimeoutMs: String?,
    statusPollingIntervalMs: String?,
    statusPollingFastIntervalMs: String?,
    statusPollingFastPollCount: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      let network = try self.requireNetwork(client, chainId: chainId)
      let request = SendTransactionRequest(
        to: to,
        value: value,
        data: data,
        mode: try self.transactionMode(mode)
      )
      let selectFeeOption = self.feeOptionSelector(feeOptionSelectorId)
      let statusPolling = try self.statusPollingOptions(
        timeoutMs: statusPollingTimeoutMs,
        intervalMs: statusPollingIntervalMs,
        fastIntervalMs: statusPollingFastIntervalMs,
        fastPollCount: statusPollingFastPollCount
      )
      return self.sendTransactionResponseDictionary(
        try await client.wallet.sendTransaction(
          network: network,
          request: request,
          selectFeeOption: selectFeeOption,
          waitForStatus: waitForStatus,
          statusPolling: statusPolling ?? TransactionStatusPollingOptions()
        )
      )
    }
  }

  @objc(callContractWithClientId:chainId:contractAddress:method:argsJson:mode:feeOptionSelectorId:waitForStatus:statusPollingTimeoutMs:statusPollingIntervalMs:statusPollingFastIntervalMs:statusPollingFastPollCount:resolve:reject:)
  public func callContract(
    clientId: String,
    chainId: String,
    contractAddress: String,
    method: String,
    argsJson: String?,
    mode: String?,
    feeOptionSelectorId: String?,
    waitForStatus: Bool,
    statusPollingTimeoutMs: String?,
    statusPollingIntervalMs: String?,
    statusPollingFastIntervalMs: String?,
    statusPollingFastPollCount: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      let network = try self.requireNetwork(client, chainId: chainId)
      let args = try self.decodeAbiArgs(argsJson)
      let transactionMode = try self.transactionMode(mode)
      let selectFeeOption = self.feeOptionSelector(feeOptionSelectorId)
      let statusPolling = try self.statusPollingOptions(
        timeoutMs: statusPollingTimeoutMs,
        intervalMs: statusPollingIntervalMs,
        fastIntervalMs: statusPollingFastIntervalMs,
        fastPollCount: statusPollingFastPollCount
      )
      return self.sendTransactionResponseDictionary(
        try await client.wallet.callContract(
          network: network,
          contractAddress: contractAddress,
          method: method,
          args: args,
          selectFeeOption: selectFeeOption,
          mode: transactionMode,
          waitForStatus: waitForStatus,
          statusPolling: statusPolling ?? TransactionStatusPollingOptions()
        )
      )
    }
  }

  @objc(sendSolanaTransferWithClientId:network:asset:to:amount:mode:feeOptionSelectorId:waitForStatus:statusPollingTimeoutMs:statusPollingIntervalMs:statusPollingFastIntervalMs:statusPollingFastPollCount:resolve:reject:)
  public func sendSolanaTransfer(
    clientId: String,
    network: String,
    asset: String,
    to: String,
    amount: String,
    mode: String?,
    feeOptionSelectorId: String?,
    waitForStatus: Bool,
    statusPollingTimeoutMs: String?,
    statusPollingIntervalMs: String?,
    statusPollingFastIntervalMs: String?,
    statusPollingFastPollCount: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      let statusPolling = try self.statusPollingOptions(
        timeoutMs: statusPollingTimeoutMs,
        intervalMs: statusPollingIntervalMs,
        fastIntervalMs: statusPollingFastIntervalMs,
        fastPollCount: statusPollingFastPollCount
      )
      return self.sendTransactionResponseDictionary(
        try await client.wallet.sendSolanaTransfer(
          network: try self.solanaNetwork(network),
          asset: asset,
          to: to,
          amount: amount,
          selectFeeOption: self.feeOptionSelector(feeOptionSelectorId),
          mode: try self.transactionMode(mode),
          waitForStatus: waitForStatus,
          statusPolling: statusPolling ?? TransactionStatusPollingOptions()
        )
      )
    }
  }

  @objc(sendTronTransactionWithClientId:network:to:value:data:feeOptionSelectorId:waitForStatus:statusPollingTimeoutMs:statusPollingIntervalMs:statusPollingFastIntervalMs:statusPollingFastPollCount:resolve:reject:)
  public func sendTronTransaction(
    clientId: String,
    network: String,
    to: String,
    value: String?,
    data: String?,
    feeOptionSelectorId: String?,
    waitForStatus: Bool,
    statusPollingTimeoutMs: String?,
    statusPollingIntervalMs: String?,
    statusPollingFastIntervalMs: String?,
    statusPollingFastPollCount: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      let statusPolling = try self.statusPollingOptions(
        timeoutMs: statusPollingTimeoutMs,
        intervalMs: statusPollingIntervalMs,
        fastIntervalMs: statusPollingFastIntervalMs,
        fastPollCount: statusPollingFastPollCount
      )
      return self.sendTransactionResponseDictionary(
        try await client.wallet.sendTronTransaction(
          network: try self.tronNetwork(network),
          to: to,
          value: value ?? "0",
          data: data,
          selectFeeOption: self.feeOptionSelector(feeOptionSelectorId),
          waitForStatus: waitForStatus,
          statusPolling: statusPolling ?? TransactionStatusPollingOptions()
        )
      )
    }
  }

  @objc(callTronContractWithClientId:network:contractAddress:method:argsJson:feeOptionSelectorId:waitForStatus:statusPollingTimeoutMs:statusPollingIntervalMs:statusPollingFastIntervalMs:statusPollingFastPollCount:resolve:reject:)
  public func callTronContract(
    clientId: String,
    network: String,
    contractAddress: String,
    method: String,
    argsJson: String?,
    feeOptionSelectorId: String?,
    waitForStatus: Bool,
    statusPollingTimeoutMs: String?,
    statusPollingIntervalMs: String?,
    statusPollingFastIntervalMs: String?,
    statusPollingFastPollCount: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      let statusPolling = try self.statusPollingOptions(
        timeoutMs: statusPollingTimeoutMs,
        intervalMs: statusPollingIntervalMs,
        fastIntervalMs: statusPollingFastIntervalMs,
        fastPollCount: statusPollingFastPollCount
      )
      return self.sendTransactionResponseDictionary(
        try await client.wallet.callTronContract(
          network: try self.tronNetwork(network),
          contractAddress: contractAddress,
          method: method,
          args: try self.decodeAbiArgs(argsJson),
          selectFeeOption: self.feeOptionSelector(feeOptionSelectorId),
          waitForStatus: waitForStatus,
          statusPolling: statusPolling ?? TransactionStatusPollingOptions()
        )
      )
    }
  }

  @objc(respondToFeeOptionSelectionWithRequestId:selectionToken:selectionIndex:errorMessage:resolve:reject:)
  public func respondToFeeOptionSelection(
    requestId: String,
    selectionToken: String?,
    selectionIndex: String?,
    errorMessage: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let continuation = takePendingFeeOptionSelection(requestId) else {
      rejectError(reject, makeError("Unknown fee option selection request: \(requestId)"))
      return
    }

    if let errorMessage {
      continuation.resume(throwing: makeError(errorMessage))
    } else {
      do {
        let index = try uint32(selectionIndex, name: "selectionIndex")
        continuation.resume(returning: selectionToken.map { FeeOptionSelection(token: $0, index: index) })
      } catch {
        continuation.resume(throwing: error)
      }
    }
    resolve(nil)
  }

  @objc(getTransactionStatusWithClientId:txnId:resolve:reject:)
  public func getTransactionStatus(
    clientId: String,
    txnId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      self.transactionStatusDictionary(
        try await client.wallet.getTransactionStatus(txnId: txnId)
      )
    }
  }

  @objc(getBalancesWithClientId:paramsJson:resolve:reject:)
  public func getBalances(
    clientId: String,
    paramsJson: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      let params = try self.decodeGetBalancesParams(paramsJson, client: client)
      return self.tokenBalancesResultDictionary(
        try await client.indexer.getBalances(params)
      )
    }
  }

  @objc(getTransactionHistoryWithClientId:paramsJson:resolve:reject:)
  public func getTransactionHistory(
    clientId: String,
    paramsJson: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      let params = try self.decodeGetTransactionHistoryParams(paramsJson, client: client)
      return self.transactionHistoryResultDictionary(
        try await client.indexer.getTransactionHistory(params)
      )
    }
  }

  @objc(getSolanaBalancesWithClientId:paramsJson:resolve:reject:)
  public func getSolanaBalances(
    clientId: String,
    paramsJson: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      self.solanaBalancesResultDictionary(
        try await client.indexer.getSolanaBalances(
          try self.decodeGetSolanaBalancesParams(paramsJson)
        )
      )
    }
  }

  @objc(getTronBalancesWithClientId:paramsJson:resolve:reject:)
  public func getTronBalances(
    clientId: String,
    paramsJson: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      self.tronBalancesResultDictionary(
        try await client.indexer.getTronBalances(
          try self.decodeGetTronBalancesParams(paramsJson)
        )
      )
    }
  }

  @objc(verifyMessageSignatureWithClientId:chainId:walletAddress:message:signature:resolve:reject:)
  public func verifyMessageSignature(
    clientId: String,
    chainId: String,
    walletAddress: String?,
    message: String,
    signature: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      let network = try self.requireNetwork(client, chainId: chainId)
      return try await client.wallet.isValidMessageSignature(
        network: network,
        walletAddress: walletAddress,
        message: message,
        signature: signature
      )
    }
  }

  @objc(verifySolanaMessageSignatureWithClientId:walletAddress:message:signature:resolve:reject:)
  public func verifySolanaMessageSignature(
    clientId: String,
    walletAddress: String?,
    message: String,
    signature: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      try await client.wallet.isValidSolanaMessageSignature(
        walletAddress: walletAddress,
        message: message,
        signature: signature
      )
    }
  }

  @objc(verifyTypedDataSignatureWithClientId:chainId:walletAddress:typedDataJson:signature:resolve:reject:)
  public func verifyTypedDataSignature(
    clientId: String,
    chainId: String,
    walletAddress: String?,
    typedDataJson: String,
    signature: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      let network = try self.requireNetwork(client, chainId: chainId)
      return try await client.wallet.isValidTypedDataSignature(
        network: network,
        walletAddress: walletAddress,
        typedData: try self.decodeJsonValue(typedDataJson, name: "typedData"),
        signature: signature
      )
    }
  }

  @objc(verifyTronMessageSignatureWithClientId:walletAddress:message:signature:resolve:reject:)
  public func verifyTronMessageSignature(
    clientId: String,
    walletAddress: String?,
    message: String,
    signature: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      try await client.wallet.isValidTronMessageSignature(
        walletAddress: walletAddress,
        message: message,
        signature: signature
      )
    }
  }

  @objc(verifyTronTypedDataSignatureWithClientId:walletAddress:typedDataJson:signature:resolve:reject:)
  public func verifyTronTypedDataSignature(
    clientId: String,
    walletAddress: String?,
    typedDataJson: String,
    signature: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      try await client.wallet.isValidTronTypedDataSignature(
        walletAddress: walletAddress,
        typedData: try self.decodeJsonValue(typedDataJson, name: "typedData"),
        signature: signature
      )
    }
  }

  @objc(getIdTokenWithClientId:ttlSeconds:customClaimsJson:resolve:reject:)
  public func getIdToken(
    clientId: String,
    ttlSeconds: String?,
    customClaimsJson: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      try await client.wallet.getIdToken(
        ttlSeconds: try self.uint32(ttlSeconds, name: "ttlSeconds"),
        customClaims: try self.decodeCustomClaims(customClaimsJson)
      )
    }
  }

  @objc(inspectRemoteCredentialWithClientId:credentialId:resolve:reject:)
  public func inspectRemoteCredential(
    clientId: String,
    credentialId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      self.remoteCredentialMetadataDictionary(
        try await client.wallet.inspectRemoteCredential(credentialId: credentialId)
      )
    }
  }

  @objc(authorizeRemoteAccessWithClientId:credentialId:chainId:grantsJson:expiresAt:sessionId:resolve:reject:)
  public func authorizeRemoteAccess(
    clientId: String,
    credentialId: String,
    chainId: String,
    grantsJson: String,
    expiresAt: String,
    sessionId: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      self.authorizedRemoteAccessDictionary(
        try await client.wallet.authorizeRemoteAccess(
          credentialId: credentialId,
          network: try self.requireNetwork(client, chainId: chainId),
          grants: try self.decodeSmartSessionGrants(grantsJson),
          expiresAt: expiresAt,
          sessionId: sessionId
        )
      )
    }
  }

  @objc(listAccessWithClientId:pageSize:type:resolve:reject:)
  public func listAccess(
    clientId: String,
    pageSize: String?,
    type: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      try await client.wallet.listAccess(
        pageSize: try self.uint32(pageSize, name: "pageSize"),
        type: try self.accessGrantType(type)
      ).map(self.accessGrantDictionary)
    }
  }

  @objc(listAccessPageWithClientId:pageSize:cursor:type:resolve:reject:)
  public func listAccessPage(
    clientId: String,
    pageSize: String?,
    cursor: String?,
    type: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      self.accessGrantPageDictionary(
        try await client.wallet.listAccessPage(
          pageSize: try self.uint32(pageSize, name: "pageSize"),
          cursor: cursor,
          type: try self.accessGrantType(type)
        )
      )
    }
  }

  @objc(getRemoteAccessSessionWithClientId:sessionId:resolve:reject:)
  public func getRemoteAccessSession(
    clientId: String,
    sessionId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      self.remoteAccessSessionDictionary(
        try await client.wallet.getRemoteAccessSession(sessionId: sessionId)
      )
    }
  }

  @objc(getRemoteAccessSessionUsageWithClientId:sessionId:chainId:resolve:reject:)
  public func getRemoteAccessSessionUsage(
    clientId: String,
    sessionId: String,
    chainId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      try await client.wallet.getRemoteAccessSessionUsage(
        sessionId: sessionId,
        network: try self.requireNetwork(client, chainId: chainId)
      ).map(self.smartSessionGrantUsageDictionary)
    }
  }

  @objc(revokeAccessWithClientId:credentialId:sessionId:resolve:reject:)
  public func revokeAccess(
    clientId: String,
    credentialId: String,
    sessionId: String?,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    run(clientId: clientId, resolve: resolve, reject: reject) { client in
      try await client.wallet.revokeAccess(credentialId: credentialId, sessionId: sessionId)
      return nil
    }
  }

  private func feeOptionSelector(_ selectorId: String?) -> FeeOptionSelector? {
    guard let selectorId else {
      return nil
    }

    return .custom { options in
      try await self.requestFeeOptionSelection(
        selectorId: selectorId,
        options: options
      )
    }
  }

  private func requestFeeOptionSelection(
    selectorId: String,
    options: [FeeOptionWithBalance]
  ) async throws -> FeeOptionSelection? {
    guard let emitter = feeOptionSelectionRequestEmitter else {
      throw makeError("Fee option selector listener is not registered")
    }

    let requestId = UUID().uuidString
    let payload: NSDictionary = [
      "selectorId": selectorId,
      "requestId": requestId,
      "options": options.map(feeOptionWithBalanceDictionary)
    ]

    return try await withCheckedThrowingContinuation { continuation in
      storePendingFeeOptionSelection(requestId, continuation: continuation)
      emitter(payload)
    }
  }

  private func storePendingFeeOptionSelection(
    _ requestId: String,
    continuation: CheckedContinuation<FeeOptionSelection?, Error>
  ) {
    pendingFeeOptionSelectionsLock.lock()
    pendingFeeOptionSelections[requestId] = continuation
    pendingFeeOptionSelectionsLock.unlock()
  }

  private func takePendingFeeOptionSelection(
    _ requestId: String
  ) -> CheckedContinuation<FeeOptionSelection?, Error>? {
    pendingFeeOptionSelectionsLock.lock()
    let continuation = pendingFeeOptionSelections.removeValue(forKey: requestId)
    pendingFeeOptionSelectionsLock.unlock()
    return continuation
  }

  private func run(
    clientId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock,
    operation: @escaping @Sendable (OMSWallet) async throws -> Any?
  ) {
    do {
      let activeClient = ClientBox(try requireClient(clientId))
      let callbacks = PromiseCallbacks(resolve: resolve, reject: reject)
      Task { [activeClient, callbacks, operation] in
        do {
          callbacks.resolve(try await operation(activeClient.client))
        } catch {
          self.rejectError(callbacks.reject, error)
        }
      }
    } catch {
      rejectError(reject, error)
    }
  }

  private func storeClient(_ client: ClientBox, clientId: String) {
    clientsLock.lock()
    clients[clientId] = client
    clientsLock.unlock()
  }

  private func requireClient(_ clientId: String) throws -> OMSWallet {
    clientsLock.lock()
    let client = clients[clientId]?.client
    clientsLock.unlock()
    guard let client else {
      throw makeError("OMS client is not initialized: \(clientId)")
    }
    return client
  }

  private func requireNetwork(_ client: OMSWallet, chainId: String) throws -> Network {
    guard let chainIdValue = Int(chainId), let network = Network.findById(chainIdValue) else {
      throw makeError("Unsupported chain id: \(chainId)")
    }
    return network
  }

  private func completeAuthResultDictionary(clientId: String, _ result: CompleteAuthResult) throws -> [String: Any] {
    switch result {
    case .walletSelected(let wallet, let wallets, let claimableWallets, let credential):
      clearPendingWalletSelections(clientId: clientId)
      return [
        "type": "walletSelected",
        "wallet": walletDictionary(wallet),
        "wallets": wallets.map(walletDictionary),
        "claimableWallets": claimableWallets.map(walletDictionary),
        "credential": walletCredentialDictionary(credential)
      ]
    case .walletSelection(let pendingSelection):
      clearPendingWalletSelections(clientId: clientId)
      return [
        "type": "walletSelection",
        "wallet": NSNull(),
        "wallets": pendingSelection.wallets.map(walletDictionary),
        "claimableWallets": pendingSelection.claimableWallets.map(walletDictionary),
        "credential": walletCredentialDictionary(pendingSelection.credential),
        "pendingSelection": pendingWalletSelectionDictionary(clientId: clientId, pendingSelection)
      ]
    }
  }

  private func walletDictionary(_ wallet: Wallet) -> [String: Any] {
    [
      "id": wallet.id,
      "type": wallet.type.wireValue,
      "address": wallet.address,
      "reference": wallet.reference ?? NSNull(),
      "keyOrigin": wallet.keyOrigin.wireValue
    ]
  }

  private func pendingWalletSelectionDictionary(
    clientId: String,
    _ pendingSelection: PendingWalletSelection
  ) -> [String: Any] {
    let id = UUID().uuidString
    pendingWalletSelectionsLock.lock()
    pendingWalletSelections[id] = StoredPendingWalletSelection(clientId: clientId, selection: pendingSelection)
    pendingWalletSelectionsLock.unlock()
    return [
      "id": id,
      "walletType": pendingSelection.walletType.wireValue,
      "wallets": pendingSelection.wallets.map(walletDictionary),
      "claimableWallets": pendingSelection.claimableWallets.map(walletDictionary),
      "credential": walletCredentialDictionary(pendingSelection.credential)
    ]
  }

  private func walletActivationResultDictionary(_ result: WalletActivationResult) -> [String: Any] {
    [
      "wallet": walletDictionary(result.wallet)
    ]
  }

  private func requirePendingWalletSelection(_ id: String, clientId: String) throws -> PendingWalletSelection {
    pendingWalletSelectionsLock.lock()
    let storedSelection = pendingWalletSelections[id]
    pendingWalletSelectionsLock.unlock()

    guard let storedSelection else {
      throw makeError("Pending wallet selection is no longer available")
    }
    guard storedSelection.clientId == clientId else {
      throw makeError("Pending wallet selection belongs to a different OMS client")
    }
    return storedSelection.selection
  }

  private func removePendingWalletSelection(_ id: String) {
    pendingWalletSelectionsLock.lock()
    pendingWalletSelections.removeValue(forKey: id)
    pendingWalletSelectionsLock.unlock()
  }

  private func clearPendingWalletSelections(clientId: String) {
    pendingWalletSelectionsLock.lock()
    pendingWalletSelections = pendingWalletSelections.filter { $0.value.clientId != clientId }
    pendingWalletSelectionsLock.unlock()
  }

  private func sessionDictionary(_ session: OMSWalletSession) -> [String: Any] {
    [
      "expiresAt": session.expiresAt,
      "auth": sessionAuthDictionary(session.auth)
    ]
  }

  private func sessionChangeEventDictionary(clientId: String, event: OMSWalletSessionChangeEvent) -> [String: Any] {
    let reason: String
    var expiredSession: Any = NSNull()
    switch event {
    // A restore after the device was unlocked reads as a sign-in, as on Android.
    case .signedIn, .restored: reason = "signedIn"
    case .walletChanged: reason = "walletChanged"
    case .expiryUpdated: reason = "expiryUpdated"
    case .signedOut: reason = "signedOut"
    case .expired(let expired):
      reason = "expired"
      expiredSession = [
        "wallet": expired.wallet.map(walletDictionary) ?? NSNull(),
        "session": sessionDictionary(expired.session),
        "expiredAt": expired.expiredAt
      ] as [String: Any]
    }
    return [
      "clientId": clientId,
      "reason": reason,
      "activeWallet": event.activeWallet.map(walletDictionary) ?? NSNull(),
      "session": event.session.map(sessionDictionary) ?? NSNull(),
      "expiredSession": expiredSession
    ]
  }

  private func sessionAuthDictionary(_ auth: OMSWalletSessionAuth) -> [String: Any] {
    switch auth {
    case .email(let value):
      return [
        "type": "email",
        "email": value.email
      ]
    case .oidc(let value):
      return [
        "type": "oidc",
        "flow": value.flow.rawValue,
        "issuer": value.issuer,
        "provider": nullableString(value.provider),
        "providerLabel": nullableString(value.providerLabel),
        "email": nullableString(value.email)
      ]
    }
  }

  private func nullableString(_ value: String?) -> Any {
    value ?? NSNull()
  }

  private func tokenBalancesResultDictionary(_ result: BalancesResult) -> [String: Any] {
    let dictionary: [String: Any] = [
      "status": result.status,
      "page": result.page.map(tokenBalancesPageDictionary) ?? NSNull(),
      "nativeBalances": result.nativeBalances.map(nativeTokenBalanceDictionary),
      "balances": result.balances.map(contractTokenBalanceDictionary)
    ]

    return dictionary
  }

  private func transactionHistoryResultDictionary(_ result: TransactionHistoryResult) -> [String: Any] {
    [
      "status": result.status,
      "page": result.page.map(tokenBalancesPageDictionary) ?? NSNull(),
      "transactions": result.transactions.map(transactionDictionary)
    ]
  }

  private func tokenBalancesPageDictionary(_ page: TokenBalancesPage) -> [String: Any] {
    [
      "page": NSNumber(value: page.page),
      "pageSize": NSNumber(value: page.pageSize),
      "more": NSNumber(value: page.more)
    ]
  }

  private func tokenBalanceDictionary(_ balance: TokenBalance) -> [String: Any] {
    switch balance {
    case .native(let value): return nativeTokenBalanceDictionary(value)
    case .contract(let value): return contractTokenBalanceDictionary(value)
    }
  }

  private func nativeTokenBalanceDictionary(_ balance: NativeTokenBalance) -> [String: Any] {
    [
      "contractType": balance.contractType,
      "accountAddress": balance.accountAddress,
      "name": balance.name,
      "symbol": balance.symbol,
      "balance": balance.balance,
      "chainId": NSNumber(value: balance.chainId),
      "balanceUSD": balance.balanceUSD ?? NSNull(),
      "priceUSD": balance.priceUSD ?? NSNull(),
      "priceUpdatedAt": balance.priceUpdatedAt ?? NSNull()
    ]
  }

  private func contractTokenBalanceDictionary(_ balance: ContractTokenBalance) -> [String: Any] {
    var dictionary: [String: Any] = [:]
    dictionary["contractType"] = balance.contractType
    dictionary["contractAddress"] = balance.contractAddress
    dictionary["accountAddress"] = balance.accountAddress
    dictionary["tokenId"] = balance.tokenId
    dictionary["balance"] = balance.balance
    dictionary["balanceUSD"] = balance.balanceUSD ?? NSNull()
    dictionary["priceUSD"] = balance.priceUSD ?? NSNull()
    dictionary["priceUpdatedAt"] = balance.priceUpdatedAt ?? NSNull()
    dictionary["blockHash"] = balance.blockHash
    dictionary["blockNumber"] = NSNumber(value: balance.blockNumber)
    dictionary["chainId"] = NSNumber(value: balance.chainId)
    dictionary["uniqueCollectibles"] = balance.uniqueCollectibles ?? NSNull()
    dictionary["isSummary"] = balance.isSummary.map(NSNumber.init(value:)) ?? NSNull()
    dictionary["contractInfo"] = balance.contractInfo.map(tokenContractInfoDictionary) ?? NSNull()
    dictionary["tokenMetadata"] = balance.tokenMetadata.map(tokenMetadataDictionary) ?? NSNull()
    return dictionary
  }

  private func tokenContractInfoDictionary(_ info: TokenContractInfo) -> [String: Any] {
    [
      "chainId": NSNumber(value: info.chainId),
      "address": info.address,
      "source": info.source,
      "name": info.name,
      "type": info.type,
      "symbol": info.symbol,
      "decimals": info.decimals.map(NSNumber.init(value:)) ?? NSNull(),
      "logoURI": info.logoURI ?? NSNull(),
      "deployed": NSNumber(value: info.deployed),
      "bytecodeHash": info.bytecodeHash,
      "extensions": webRPCJSONObject(info.extensions),
      "updatedAt": info.updatedAt,
      "queuedAt": info.queuedAt ?? NSNull(),
      "status": info.status
    ]
  }

  private func transactionDictionary(_ transaction: Transaction) -> [String: Any] {
    [
      "txnHash": transaction.txnHash,
      "blockNumber": NSNumber(value: transaction.blockNumber),
      "blockHash": transaction.blockHash,
      "chainId": NSNumber(value: transaction.chainId),
      "metaTxnId": transaction.metaTxnId ?? NSNull(),
      "transfers": transaction.transfers.map(transactionTransferDictionary),
      "timestamp": transaction.timestamp
    ]
  }

  private func transactionTransferDictionary(_ transfer: TransactionTransfer) -> [String: Any] {
    [
      "transferType": transfer.transferType,
      "contractAddress": transfer.contractAddress,
      "contractType": transfer.contractType,
      "from": transfer.from,
      "to": transfer.to,
      "tokenIds": transfer.tokenIds ?? NSNull(),
      "amounts": transfer.amounts,
      "logIndex": NSNumber(value: transfer.logIndex),
      "amountsUSD": transfer.amountsUSD ?? NSNull(),
      "pricesUSD": transfer.pricesUSD ?? NSNull(),
      "contractInfo": transfer.contractInfo.map(tokenContractInfoDictionary) ?? NSNull(),
      "tokenMetadata": transfer.tokenMetadata?.mapValues(tokenMetadataDictionary) ?? NSNull()
    ]
  }

  private func tokenMetadataDictionary(_ metadata: TokenMetadata) -> [String: Any] {
    [
      "chainId": metadata.chainId.map(NSNumber.init(value:)) ?? NSNull(),
      "contractAddress": metadata.contractAddress ?? NSNull(),
      "tokenId": metadata.tokenId,
      "source": metadata.source,
      "name": metadata.name,
      "description": metadata.description ?? NSNull(),
      "image": metadata.image ?? NSNull(),
      "video": metadata.video ?? NSNull(),
      "audio": metadata.audio ?? NSNull(),
      "properties": metadata.properties.map(webRPCJSONObject) ?? NSNull(),
      "attributes": metadata.attributes.map(webRPCJSONObject),
      "imageData": metadata.imageData ?? NSNull(),
      "externalUrl": metadata.externalUrl ?? NSNull(),
      "backgroundColor": metadata.backgroundColor ?? NSNull(),
      "animationUrl": metadata.animationUrl ?? NSNull(),
      "decimals": metadata.decimals.map(NSNumber.init(value:)) ?? NSNull(),
      "updatedAt": metadata.updatedAt ?? NSNull(),
      "assets": metadata.assets?.map(tokenMetadataAssetDictionary) ?? NSNull(),
      "status": metadata.status,
      "queuedAt": metadata.queuedAt ?? NSNull(),
      "lastFetched": metadata.lastFetched ?? NSNull()
    ]
  }

  private func tokenMetadataAssetDictionary(_ asset: TokenMetadataAsset) -> [String: Any] {
    [
      "id": asset.id.map(NSNumber.init(value:)) ?? NSNull(),
      "collectionId": asset.collectionId.map(NSNumber.init(value:)) ?? NSNull(),
      "tokenId": asset.tokenId ?? NSNull(),
      "url": asset.url ?? NSNull(),
      "metadataField": asset.metadataField ?? NSNull(),
      "name": asset.name ?? NSNull(),
      "filesize": asset.filesize.map(NSNumber.init(value:)) ?? NSNull(),
      "mimeType": asset.mimeType ?? NSNull(),
      "width": asset.width.map(NSNumber.init(value:)) ?? NSNull(),
      "height": asset.height.map(NSNumber.init(value:)) ?? NSNull(),
      "updatedAt": asset.updatedAt ?? NSNull()
    ]
  }

  private func transactionStatusDictionary(_ result: TransactionStatusResponse) -> [String: Any] {
    [
      "status": result.status.wireValue,
      "txnHash": result.txnHash ?? NSNull()
    ]
  }

  private func sendTransactionResponseDictionary(_ result: SendTransactionResponse) -> [String: Any] {
    [
      "txnId": result.txnId,
      "status": result.status.wireValue,
      "txnHash": result.txnHash ?? NSNull(),
      "statusResolution": transactionStatusResolutionString(result.statusResolution)
    ]
  }

  private func transactionStatusResolutionString(_ value: TransactionStatusResolution) -> String {
    switch value {
    case .notRequested: return "not-requested"
    case .resolved: return "resolved"
    case .timedOut: return "timed-out"
    }
  }

  private func feeOptionWithBalanceDictionary(_ option: FeeOptionWithBalance) -> [String: Any] {
    [
      "feeOption": feeOptionDictionary(option.feeOption),
      "selection": feeOptionSelectionDictionary(option.selection),
      "balance": option.balance.map(tokenBalanceDictionary) ?? NSNull(),
      "available": option.available ?? NSNull(),
      "availableRaw": option.availableRaw ?? NSNull(),
      "decimals": option.decimals.map(NSNumber.init(value:)) ?? NSNull()
    ]
  }

  private func feeOptionSelectionDictionary(_ selection: FeeOptionSelection) -> [String: Any] {
    [
      "token": selection.token,
      "index": selection.index.map(NSNumber.init(value:)) ?? NSNull()
    ]
  }

  private func feeOptionDictionary(_ option: FeeOption) -> [String: Any] {
    [
      "token": feeTokenDictionary(option.token),
      "value": option.value,
      "displayValue": option.displayValue
    ]
  }

  private func feeTokenDictionary(_ token: FeeToken) -> [String: Any] {
    [
      "network": token.network,
      "name": token.name,
      "symbol": token.symbol,
      "type": token.type,
      "decimals": token.decimals.map(NSNumber.init(value:)) ?? NSNull(),
      "logoUrl": token.logoUrl ?? NSNull(),
      "contractAddress": token.contractAddress ?? NSNull(),
      "tokenId": token.tokenId ?? NSNull()
    ]
  }

  private func walletCredentialDictionary(_ credential: WalletCredential) -> [String: Any] {
    [
      "credentialId": credential.credentialId,
      "expiresAt": credential.expiresAt,
      "isCaller": credential.isCaller
    ]
  }

  private func smartSessionGrantDictionary(_ grant: SmartSessionGrant) -> [String: Any] {
    switch grant {
    case .nativeTransfer(let to, let limit):
      return [
        "kind": "nativeTransfer",
        "token": NSNull(),
        "to": to,
        "limit": limit,
        "cumulative": NSNull()
      ]
    case .erc20Transfer(let token, let to, let limit, let cumulative):
      return [
        "kind": "erc20Transfer",
        "token": token,
        "to": to ?? NSNull(),
        "limit": limit,
        "cumulative": cumulative.map(NSNumber.init(value:)) ?? NSNull()
      ]
    }
  }

  private func remoteCredentialMetadataDictionary(_ metadata: RemoteCredentialMetadata) -> [String: Any] {
    [
      "appUrl": metadata.appUrl,
      "appName": metadata.appName,
      "appLogoUrl": metadata.appLogoUrl,
      "custom": metadata.custom
    ]
  }

  private func accessGrantDictionary(_ grant: AccessGrant) -> [String: Any] {
    switch grant {
    case .direct(let credential):
      return [
        "type": "direct",
        "credential": walletCredentialDictionary(credential),
        "sessionId": NSNull(),
        "metadata": NSNull(),
        "grants": []
      ]
    case .remote(let access):
      return [
        "type": "remote",
        "credential": walletCredentialDictionary(access.credential),
        "sessionId": access.sessionId,
        "metadata": remoteCredentialMetadataDictionary(access.metadata),
        "grants": access.grants.map(smartSessionGrantDictionary)
      ]
    }
  }

  private func accessGrantPageDictionary(_ response: AccessGrantPage) -> [String: Any] {
    [
      "grants": response.grants.map(accessGrantDictionary),
      "page": response.page.map(pageDictionary) ?? NSNull()
    ]
  }

  private func walletImportRecipientKeyDictionary(_ key: WalletImportRecipientKey) -> [String: Any] {
    [
      "keyId": key.keyId,
      "cipherSuite": key.cipherSuite.rawValue,
      "publicKey": key.publicKey
    ]
  }

  private func authorizedRemoteAccessDictionary(_ access: AuthorizedRemoteAccess) -> [String: Any] {
    [
      "walletId": access.walletId,
      "sessionId": access.sessionId,
      "expiresAt": access.expiresAt
    ]
  }

  private func remoteAccessSessionDictionary(_ session: RemoteAccessSession) -> [String: Any] {
    [
      "sessionId": session.sessionId,
      "walletId": session.walletId,
      "signerAddress": session.signerAddress,
      "grants": session.grants.map(smartSessionGrantDictionary),
      "chainId": NSNumber(value: session.chainId),
      "expiresAt": session.expiresAt
    ]
  }

  private func smartSessionGrantUsageDictionary(_ usage: SmartSessionGrantUsage) -> [String: Any] {
    [
      "grant": smartSessionGrantDictionary(usage.grant),
      "used": usage.used ?? NSNull()
    ]
  }

  private func solanaBalanceDictionary(_ balance: SolanaBalance) -> [String: Any] {
    switch balance {
    case .native(let value):
      return solanaBalanceDictionary(
        assetType: "native",
        network: value.network,
        accountAddress: value.accountAddress,
        tokenProgram: nil,
        mintAddress: nil,
        name: value.name,
        symbol: value.symbol,
        decimals: value.decimals,
        balance: value.balance,
        formattedBalance: value.formattedBalance,
        imageUrl: value.imageUrl,
        metadataUri: value.metadataUri,
        verificationStatus: value.verificationStatus,
        verificationSource: value.verificationSource,
        priceUSD: value.priceUSD,
        balanceUSD: value.balanceUSD
      )
    case .fungibleToken(let value):
      return solanaBalanceDictionary(
        assetType: "fungible-token",
        network: value.network,
        accountAddress: value.accountAddress,
        tokenProgram: value.tokenProgram,
        mintAddress: value.mintAddress,
        name: value.name,
        symbol: value.symbol,
        decimals: value.decimals,
        balance: value.balance,
        formattedBalance: value.formattedBalance,
        imageUrl: value.imageUrl,
        metadataUri: value.metadataUri,
        verificationStatus: value.verificationStatus,
        verificationSource: value.verificationSource,
        priceUSD: value.priceUSD,
        balanceUSD: value.balanceUSD
      )
    }
  }

  private func solanaBalanceDictionary(
    assetType: String,
    network: SolanaNetwork,
    accountAddress: String,
    tokenProgram: SolanaTokenProgram?,
    mintAddress: String?,
    name: String,
    symbol: String,
    decimals: Int,
    balance: String,
    formattedBalance: String,
    imageUrl: String?,
    metadataUri: String?,
    verificationStatus: SolanaVerificationStatus,
    verificationSource: SolanaVerificationSource,
    priceUSD: String?,
    balanceUSD: String?
  ) -> [String: Any] {
    [
      "assetType": assetType,
      "network": network.rawValue,
      "accountAddress": accountAddress,
      "tokenProgram": tokenProgram?.rawValue ?? NSNull(),
      "mintAddress": mintAddress ?? NSNull(),
      "name": name,
      "symbol": symbol,
      "decimals": NSNumber(value: decimals),
      "balance": balance,
      "formattedBalance": formattedBalance,
      "imageUrl": imageUrl ?? NSNull(),
      "metadataUri": metadataUri ?? NSNull(),
      "verificationStatus": verificationStatus.rawValue,
      "verificationSource": verificationSource.rawValue,
      "priceUSD": priceUSD ?? NSNull(),
      "balanceUSD": balanceUSD ?? NSNull()
    ]
  }

  private func solanaBalancesResultDictionary(_ result: SolanaBalancesResult) -> [String: Any] {
    [
      "status": result.status,
      "balances": result.balances.map(solanaBalanceDictionary),
      "errors": result.errors.map {
        ["network": $0.network.rawValue, "reason": $0.reason]
      }
    ]
  }

  private func tronBalanceDictionary(_ balance: TronBalance) -> [String: Any] {
    var tokenStandard: Any = NSNull()
    var contractAddress: Any = NSNull()
    let assetType: String
    switch balance {
    case .native:
      assetType = "native"
    case .fungibleToken(let value):
      assetType = "fungible-token"
      tokenStandard = value.tokenStandard.rawValue
      contractAddress = value.contractAddress
    }
    return [
      "assetType": assetType,
      "network": balance.network.rawValue,
      "accountAddress": balance.accountAddress,
      "tokenStandard": tokenStandard,
      "contractAddress": contractAddress,
      "name": balance.name,
      "symbol": balance.symbol,
      "decimals": NSNumber(value: balance.decimals),
      "balance": balance.balance,
      "formattedBalance": balance.formattedBalance,
      "imageUrl": balance.imageUrl ?? NSNull(),
      "metadataUri": balance.metadataUri ?? NSNull(),
      "verificationStatus": balance.verificationStatus.rawValue,
      "verificationSource": balance.verificationSource,
      "priceUSD": balance.priceUSD ?? NSNull(),
      "balanceUSD": balance.balanceUSD ?? NSNull()
    ]
  }

  private func tronBalancesResultDictionary(_ result: TronBalancesResult) -> [String: Any] {
    [
      "status": result.status,
      "balances": result.balances.map(tronBalanceDictionary),
      "errors": result.errors.map {
        ["network": $0.network.rawValue, "reason": $0.reason]
      }
    ]
  }

  private func pageDictionary(_ page: Page) -> [String: Any] {
    [
      "limit": page.limit.map(NSNumber.init(value:)) ?? NSNull(),
      "cursor": page.cursor ?? NSNull()
    ]
  }

  private func walletType(_ value: String?) throws -> WalletType {
    switch value?.lowercased() {
    case nil, "ethereum":
      return .ethereum
    case "solana":
      return .solana
    case "tron":
      return .tron
    default:
      throw makeError("Unsupported wallet type: \(value ?? "")")
    }
  }

  private func solanaNetwork(_ value: String) throws -> SolanaNetwork {
    guard let network = SolanaNetwork(rawValue: value) else {
      throw makeError("Unsupported Solana network: \(value)")
    }
    return network
  }

  private func tronNetwork(_ value: String) throws -> TronNetwork {
    guard let network = TronNetwork(rawValue: value) else {
      throw makeError("Unsupported Tron network: \(value)")
    }
    return network
  }

  private func walletImportCipherSuite(_ value: String) throws -> WalletImportCipherSuite {
    guard let suite = WalletImportCipherSuite(rawValue: value) else {
      throw makeError("Unsupported wallet import cipher suite: \(value)")
    }
    return suite
  }

  private func accessGrantType(_ value: String?) throws -> AccessGrantType? {
    guard let value else { return nil }
    guard let type = AccessGrantType(rawValue: value) else {
      throw makeError("Unsupported access grant type: \(value)")
    }
    return type
  }

  private func walletSelectionBehavior(_ value: String?) throws -> WalletSelectionBehavior {
    switch value?.lowercased() {
    case nil, "automatic":
      return .automatic
    case "manual":
      return .manual
    default:
      throw makeError("Unsupported wallet selection behavior: \(value ?? "")")
    }
  }

  private func optionalWalletSelectionBehavior(_ value: String?) throws -> WalletSelectionBehavior? {
    guard value != nil else { return nil }
    return try walletSelectionBehavior(value)
  }

  private func transactionMode(_ value: String?) throws -> TransactionMode {
    switch value?.lowercased() {
    case nil, "relayer":
      return .relayer
    case "native":
      return .native
    default:
      throw makeError("Unsupported transaction mode: \(value ?? "")")
    }
  }

  private func uint32(_ value: String?, name: String) throws -> UInt32? {
    guard let value else {
      return nil
    }
    guard let parsed = UInt32(value) else {
      throw makeError("\(name) must be an unsigned integer")
    }
    return parsed
  }

  private func sessionLifetimeSeconds(_ value: String?) throws -> UInt32 {
    let parsed = try uint32(value, name: "sessionLifetimeSeconds")
      ?? WalletClient.defaultSessionLifetimeSeconds
    guard parsed > 0 else {
      throw makeError("sessionLifetimeSeconds must be a positive whole number")
    }
    return parsed
  }

  private func optionalSessionLifetimeSeconds(_ value: String?) throws -> UInt32? {
    guard value != nil else { return nil }
    return try sessionLifetimeSeconds(value)
  }

  private func statusPollingOptions(
    timeoutMs: String?,
    intervalMs: String?,
    fastIntervalMs: String?,
    fastPollCount: String?
  ) throws -> TransactionStatusPollingOptions? {
    guard timeoutMs != nil
      || intervalMs != nil
      || fastIntervalMs != nil
      || fastPollCount != nil else {
      return nil
    }

    return TransactionStatusPollingOptions(
      timeoutMs: UInt64(try uint32(timeoutMs, name: "statusPolling.timeoutMs") ?? 60_000),
      intervalMs: UInt64(try uint32(intervalMs, name: "statusPolling.intervalMs") ?? 2_000),
      fastIntervalMs: UInt64(try uint32(fastIntervalMs, name: "statusPolling.fastIntervalMs") ?? 400),
      fastPollCount: Int(try uint32(fastPollCount, name: "statusPolling.fastPollCount") ?? 5)
    )
  }

  private func decodeJsonValue(_ jsonString: String, name: String) throws -> JSONValue {
    guard let data = jsonString.data(using: .utf8) else {
      throw makeError("\(name) must be UTF-8 JSON")
    }
    return try JSONDecoder().decode(JSONValue.self, from: data)
  }

  private func decodeCustomClaims(_ jsonString: String?) throws -> [String: JSONValue]? {
    guard let jsonString else {
      return nil
    }
    guard let data = jsonString.data(using: .utf8) else {
      throw makeError("customClaims must be UTF-8 JSON")
    }
    return try JSONDecoder().decode([String: JSONValue].self, from: data)
  }

  private func decodeStringMap(_ jsonString: String?, name: String) throws -> [String: String]? {
    guard let jsonString else {
      return nil
    }
    guard let data = jsonString.data(using: .utf8) else {
      throw makeError("\(name) must be UTF-8 JSON")
    }
    return try JSONDecoder().decode([String: String].self, from: data)
  }

  private func decodeGetBalancesParams(_ jsonString: String, client: OMSWallet) throws -> GetBalancesParams {
    let value = try decodeJSON(SerializableGetBalancesParams.self, from: jsonString, name: "params")
    return GetBalancesParams(
      walletAddress: value.walletAddress,
      networks: try networks(value.networks, client: client),
      networkType: value.networkType,
      contractAddresses: value.contractAddresses,
      includeMetadata: value.includeMetadata ?? true,
      omitPrices: value.omitPrices,
      tokenIds: value.tokenIds,
      contractStatus: value.contractStatus,
      page: value.page?.tokenBalancesPageRequest
    )
  }

  private func decodeGetTransactionHistoryParams(
    _ jsonString: String,
    client: OMSWallet
  ) throws -> GetTransactionHistoryParams {
    let value = try decodeJSON(
      SerializableGetTransactionHistoryParams.self,
      from: jsonString,
      name: "params"
    )
    return GetTransactionHistoryParams(
      walletAddress: value.walletAddress,
      networks: try networks(value.networks, client: client),
      networkType: value.networkType,
      contractAddresses: value.contractAddresses,
      transactionHashes: value.transactionHashes,
      metaTransactionIds: value.metaTransactionIds,
      fromBlock: value.fromBlock,
      toBlock: value.toBlock,
      tokenId: value.tokenId,
      includeMetadata: value.includeMetadata ?? true,
      omitPrices: value.omitPrices,
      metadataOptions: value.metadataOptions,
      page: value.page?.tokenBalancesPageRequest
    )
  }

  private func decodeGetSolanaBalancesParams(_ jsonString: String) throws -> GetSolanaBalancesParams {
    let value = try decodeJSON(SerializableGetSolanaBalancesParams.self, from: jsonString, name: "params")
    return GetSolanaBalancesParams(
      walletAddress: value.walletAddress,
      networks: try value.networks?.map(solanaNetwork) ?? [.mainnet, .devnet],
      includeMetadata: value.includeMetadata ?? true,
      omitNativeBalances: value.omitNativeBalances,
      mintAddresses: value.mintAddresses ?? [],
      excludedMintAddresses: value.excludedMintAddresses ?? []
    )
  }

  private func decodeGetTronBalancesParams(_ jsonString: String) throws -> GetTronBalancesParams {
    let value = try decodeJSON(SerializableGetTronBalancesParams.self, from: jsonString, name: "params")
    return GetTronBalancesParams(
      walletAddress: value.walletAddress,
      networks: try value.networks?.map(tronNetwork) ?? [.mainnet, .nile],
      includeMetadata: value.includeMetadata ?? true,
      omitNativeBalances: value.omitNativeBalances,
      contractAddresses: value.contractAddresses ?? [],
      excludedContractAddresses: value.excludedContractAddresses ?? []
    )
  }

  private func decodeSmartSessionGrants(_ jsonString: String) throws -> [SmartSessionGrant] {
    try decodeJSON([SerializableSmartSessionGrant].self, from: jsonString, name: "grants").map { value in
      switch value.kind {
      case "nativeTransfer":
        guard let to = value.to else {
          throw makeError("Native-transfer grants require to")
        }
        return .nativeTransfer(to: to, limit: value.limit)
      case "erc20Transfer":
        guard let token = value.token else {
          throw makeError("ERC-20 transfer grants require token")
        }
        return .erc20Transfer(
          token: token,
          to: value.to,
          limit: value.limit,
          cumulative: value.cumulative
        )
      default:
        throw makeError("Unsupported smart-session grant kind: \(value.kind)")
      }
    }
  }

  private func decodeJSON<T: Decodable>(_ type: T.Type, from jsonString: String, name: String) throws -> T {
    guard let data = jsonString.data(using: .utf8) else {
      throw makeError("\(name) must be UTF-8 JSON")
    }
    return try JSONDecoder().decode(type, from: data)
  }

  private func networks(_ chainIds: [String]?, client: OMSWallet) throws -> [Network]? {
    guard let chainIds, !chainIds.isEmpty else {
      return nil
    }
    return try chainIds.map { try requireNetwork(client, chainId: $0) }
  }

  private func decodeOidcProvider(_ jsonString: String) throws -> BridgeOidcProvider {
    guard let data = jsonString.data(using: .utf8) else {
      throw makeError("provider must be UTF-8 JSON")
    }
    let value = try JSONDecoder().decode(SerializableOidcProviderConfig.self, from: data)
    switch value.type {
    case "oms-relay":
      switch value.provider {
      case "google": return .omsRelay(OMSRelayOIDCProviders.google)
      case "apple": return .omsRelay(OMSRelayOIDCProviders.apple)
      default: throw makeError("Unsupported OMS relay OIDC provider")
      }
    case "custom":
      guard let issuer = value.issuer,
            let clientID = value.clientId,
            let authorizationURL = value.authorizationUrl,
            let providerRedirectURI = value.providerRedirectUri else {
        throw makeError("Custom OIDC provider is missing required configuration")
      }
      return .custom(
        CustomOIDCProviderConfiguration(
          issuer: issuer,
          clientID: clientID,
          authorizationURL: authorizationURL,
          providerRedirectURI: providerRedirectURI,
          provider: value.provider,
          providerLabel: value.providerLabel,
          scopes: value.scopes ?? [],
          authorizeParams: value.authorizeParams ?? [:],
          authMode: try oidcAuthMode(value.authMode)
        )
      )
    default:
      throw makeError("Unsupported OIDC provider type")
    }
  }

  private func oidcAuthMode(_ value: String?) throws -> OIDCAuthMode {
    switch value {
    case nil, "auth-code-pkce": return .authCodePKCE
    case "auth-code": return .authCode
    default: throw makeError("Unsupported OIDC auth mode")
    }
  }

  private func decodeAbiArgs(_ jsonString: String?) throws -> [AbiArg]? {
    guard let jsonString else {
      return nil
    }
    guard let data = jsonString.data(using: .utf8) else {
      throw makeError("args must be UTF-8 JSON")
    }
    return try JSONDecoder().decode([AbiArg].self, from: data)
  }

  private func webRPCJSONObject(_ value: [String: JSONValue]) -> [String: Any] {
    value.mapValues(webRPCJSONValue)
  }

  private func webRPCJSONValue(_ value: JSONValue) -> Any {
    switch value {
    case .object(let object):
      return webRPCJSONObject(object)
    case .array(let array):
      return array.map(webRPCJSONValue)
    case .string(let string):
      return string
    case .integer(let integer):
      return NSNumber(value: integer)
    case .unsignedInteger(let unsignedInteger):
      return NSNumber(value: unsignedInteger)
    case .number(let number):
      return NSNumber(value: number)
    case .bool(let bool):
      return NSNumber(value: bool)
    case .null:
      return NSNull()
    }
  }

  private func makeError(_ message: String) -> NSError {
    NSError(
      domain: "OmsWalletReactNativeSdk",
      code: 1,
      userInfo: [NSLocalizedDescriptionKey: message]
    )
  }

  private func rejectError(_ reject: RCTPromiseRejectBlock, _ error: Error) {
    if let omsError = error as? OMSWalletError {
      let code = omsError.code.rawValue
      var userInfo: [String: Any] = [
        NSLocalizedDescriptionKey: omsError.localizedDescription,
        "code": code
      ]
      userInfo["operation"] = omsError.operation?.rawValue ?? NSNull()
      userInfo["status"] = nullableNumber(omsError.status)
      userInfo["txnId"] = omsError.txnId ?? NSNull()
      userInfo["retryable"] = nullableBool(omsError.retryable)
      userInfo["upstreamError"] = nullableUpstreamError(omsError.upstreamError)
      reject(
        code,
        omsError.localizedDescription,
        NSError(domain: "OmsWalletReactNativeSdk", code: 1, userInfo: userInfo)
      )
      return
    }

    let nsError = error as NSError
    reject("oms_wallet_error", nsError.localizedDescription, nsError)
  }

  private func upstreamErrorDictionary(_ error: OMSWalletUpstreamError) -> [String: Any] {
    [
      "service": upstreamServiceString(error.service),
      "name": error.name ?? NSNull(),
      "code": error.code ?? NSNull(),
      "message": error.message ?? NSNull(),
      "status": nullableNumber(error.status)
    ]
  }

  private func upstreamServiceString(_ service: OMSWalletUpstreamService) -> String {
    switch service {
    case .waas: return "waas"
    case .indexer: return "indexer"
    }
  }

  private func nullableNumber(_ value: Int?) -> Any {
    guard let value else { return NSNull() }
    return NSNumber(value: value)
  }

  private func nullableBool(_ value: Bool?) -> Any {
    guard let value else { return NSNull() }
    return NSNumber(value: value)
  }

  private func nullableUpstreamError(_ error: OMSWalletUpstreamError?) -> Any {
    guard let error else { return NSNull() }
    return upstreamErrorDictionary(error)
  }
}

private final class ClientBox: @unchecked Sendable {
  let client: OMSWallet
  let sessionChangeObservation: OMSWalletSessionChangeObservation?

  init(
    _ client: OMSWallet,
    sessionChangeObservation: OMSWalletSessionChangeObservation? = nil
  ) {
    self.client = client
    self.sessionChangeObservation = sessionChangeObservation
  }
}

private final class PromiseCallbacks: @unchecked Sendable {
  let resolve: RCTPromiseResolveBlock
  let reject: RCTPromiseRejectBlock

  init(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    self.resolve = resolve
    self.reject = reject
  }
}

private struct StoredPendingWalletSelection {
  let clientId: String
  let selection: PendingWalletSelection
}

private struct SerializableTokenBalancesPageRequest: Decodable {
  let page: Int?
  let pageSize: Int?

  var tokenBalancesPageRequest: TokenBalancesPageRequest {
    TokenBalancesPageRequest(page: page, pageSize: pageSize)
  }
}

private struct SerializableGetBalancesParams: Decodable {
  let walletAddress: String
  let networks: [String]?
  let networkType: IndexerNetworkType?
  let contractAddresses: [String]?
  let includeMetadata: Bool?
  let omitPrices: Bool?
  let tokenIds: [String]?
  let contractStatus: ContractVerificationStatus?
  let page: SerializableTokenBalancesPageRequest?
}

private struct SerializableGetTransactionHistoryParams: Decodable {
  let walletAddress: String
  let networks: [String]?
  let networkType: IndexerNetworkType?
  let contractAddresses: [String]?
  let transactionHashes: [String]?
  let metaTransactionIds: [String]?
  let fromBlock: Int?
  let toBlock: Int?
  let tokenId: String?
  let includeMetadata: Bool?
  let omitPrices: Bool?
  let metadataOptions: MetadataOptions?
  let page: SerializableTokenBalancesPageRequest?
}

private struct SerializableGetSolanaBalancesParams: Decodable {
  let walletAddress: String
  let networks: [String]?
  let includeMetadata: Bool?
  let omitNativeBalances: Bool?
  let mintAddresses: [String]?
  let excludedMintAddresses: [String]?
}

private struct SerializableGetTronBalancesParams: Decodable {
  let walletAddress: String
  let networks: [String]?
  let includeMetadata: Bool?
  let omitNativeBalances: Bool?
  let contractAddresses: [String]?
  let excludedContractAddresses: [String]?
}

private struct SerializableSmartSessionGrant: Decodable {
  let kind: String
  let token: String?
  let to: String?
  let limit: String
  let cumulative: Bool?
}

private struct SerializableOidcProviderConfig: Decodable {
  let type: String
  let issuer: String?
  let clientId: String?
  let authorizationUrl: String?
  let providerRedirectUri: String?
  let provider: String?
  let providerLabel: String?
  let scopes: [String]?
  let authorizeParams: [String: String]?
  let authMode: String?
}

private enum BridgeOidcProvider {
  case omsRelay(OMSRelayOIDCProvider)
  case custom(CustomOIDCProviderConfiguration)
}
