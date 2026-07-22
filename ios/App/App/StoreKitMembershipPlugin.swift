import Foundation
import Capacitor
import StoreKit

@objc(StoreKitMembershipPlugin)
public class StoreKitMembershipPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StoreKitMembershipPlugin"
    public let jsName = "StoreKitMembership"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finishTransaction", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncPendingTransactions", returnType: CAPPluginReturnPromise)
    ]

    private var updatesTask: Task<Void, Never>?

    override public func load() {
        super.load()
        CAPLog.print("Vault OS StoreKit plugin loaded — starting Transaction.updates listener")
        // Listen for App Store-driven transactions (Ask to Buy approvals,
        // renewals, cross-device restores, purchases that were interrupted
        // before the purchase() promise resolved).
        updatesTask = Task.detached { [weak self] in
            for await result in Transaction.updates {
                guard let self = self else { return }
                await self.handleVerificationResult(result, source: "updates")
            }
        }
        // On boot, drain any unfinished transactions from previous sessions
        // (e.g. app was killed mid-purchase, network dropped before activation).
        Task.detached { [weak self] in
            guard let self = self else { return }
            for await result in Transaction.unfinished {
                await self.handleVerificationResult(result, source: "unfinished")
            }
        }
    }

    deinit {
        updatesTask?.cancel()
    }

    private func handleVerificationResult(_ result: VerificationResult<Transaction>, source: String) async {
        guard case .verified(let transaction) = result else {
            CAPLog.print("Vault OS StoreKit \(source) transaction failed verification")
            return
        }
        CAPLog.print("Vault OS StoreKit \(source) transaction observed: \(transaction.productID) id=\(transaction.id)")
        let payload = transactionPayload(for: transaction, signedTransactionInfo: result.jwsRepresentation)
        // Do NOT finish here. JS layer must activate on the backend first,
        // then call finishTransaction. This prevents dropped entitlements.
        self.notifyListeners("membershipTransactionUpdate", data: [
            "source": source,
            "transaction": payload
        ])
    }

    @objc func getProducts(_ call: CAPPluginCall) {
        let productIds = call.getArray("productIds", String.self) ?? []
        guard !productIds.isEmpty else {
            call.reject("At least one product id is required")
            return
        }

        CAPLog.print("Vault OS StoreKit getProducts requested for: \(productIds.joined(separator: ", "))")

        Task {
            do {
                let products = try await Product.products(for: productIds)
                CAPLog.print("Vault OS StoreKit getProducts resolved \(products.count) product(s)")
                var payload = [[String: Any]]()
                for product in products {
                    payload.append(await productPayload(for: product))
                }
                call.resolve([
                    "products": payload
                ])
            } catch {
                CAPLog.print("Vault OS StoreKit getProducts failed: \(error.localizedDescription)")
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId"), !productId.isEmpty else {
            call.reject("productId is required")
            return
        }

        let appAccountToken = call.getString("appAccountToken")
        CAPLog.print("Vault OS StoreKit purchase requested for: \(productId)")

        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("The App Store product could not be found")
                    return
                }

                var options: Set<Product.PurchaseOption> = []
                if let token = appAccountToken, let uuid = UUID(uuidString: token) {
                    options.insert(.appAccountToken(uuid))
                }

                let result = try await product.purchase(options: options)
                switch result {
                case .success(let verification):
                    guard case .verified(let transaction) = verification else {
                        CAPLog.print("Vault OS StoreKit purchase verification failed for: \(productId)")
                        call.reject("The purchase could not be verified")
                        return
                    }
                    CAPLog.print("Vault OS StoreKit purchase verified for: \(transaction.productID), transaction: \(transaction.id) — awaiting backend activation before finish")
                    let signedTransactionInfo = verification.jwsRepresentation
                    // IMPORTANT: do NOT call transaction.finish() here.
                    // JS activates on the backend then calls finishTransaction.
                    // If the app is killed between now and activation,
                    // Transaction.unfinished / Transaction.updates will
                    // replay the transaction next launch.
                    call.resolve([
                        "transaction": transactionPayload(for: transaction, signedTransactionInfo: signedTransactionInfo)
                    ])
                case .userCancelled:
                    CAPLog.print("Vault OS StoreKit purchase cancelled for: \(productId)")
                    call.reject("USER_CANCELLED")
                case .pending:
                    CAPLog.print("Vault OS StoreKit purchase pending for: \(productId)")
                    call.reject("PURCHASE_PENDING")
                @unknown default:
                    CAPLog.print("Vault OS StoreKit purchase returned unknown result for: \(productId)")
                    call.reject("Unknown purchase result")
                }
            } catch {
                CAPLog.print("Vault OS StoreKit purchase failed for: \(productId) error: \(error.localizedDescription)")
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        let productIds = Set(call.getArray("productIds", String.self) ?? [])
        guard !productIds.isEmpty else {
            call.reject("At least one product id is required")
            return
        }

        CAPLog.print("Vault OS StoreKit restore requested for: \(productIds.joined(separator: ", "))")

        Task {
            do {
                try await AppStore.sync()

                var transactions = [[String: Any]]()
                for await result in Transaction.currentEntitlements {
                    let signedTransactionInfo = result.jwsRepresentation
                    guard case .verified(let transaction) = result else { continue }
                    guard productIds.contains(transaction.productID) else { continue }
                    guard transaction.revocationDate == nil else { continue }
                    if let expirationDate = transaction.expirationDate, expirationDate < Date() {
                        continue
                    }
                    transactions.append(transactionPayload(for: transaction, signedTransactionInfo: signedTransactionInfo))
                }

                call.resolve([
                    "transactions": transactions
                ])
            } catch {
                CAPLog.print("Vault OS StoreKit restore failed: \(error.localizedDescription)")
                call.reject(error.localizedDescription)
            }
        }
    }

    /// Finalizes a StoreKit transaction after the backend has recorded the
    /// entitlement. Must be called by JS on activation success (purchase or
    /// restore or observed update). If never called, Apple will keep
    /// redelivering the transaction via Transaction.updates / .unfinished
    /// on next launch — which is the correct self-healing behavior.
    @objc func finishTransaction(_ call: CAPPluginCall) {
        let transactionIdString = call.getString("transactionId") ?? ""
        guard let transactionIdValue = UInt64(transactionIdString) else {
            call.reject("transactionId is required")
            return
        }

        CAPLog.print("Vault OS StoreKit finishTransaction requested for: \(transactionIdString)")

        Task {
            for await result in Transaction.all {
                guard case .verified(let transaction) = result else { continue }
                if transaction.id == transactionIdValue {
                    await transaction.finish()
                    CAPLog.print("Vault OS StoreKit finished transaction: \(transactionIdString)")
                    call.resolve(["finished": true])
                    return
                }
            }
            CAPLog.print("Vault OS StoreKit finishTransaction — no matching transaction for id \(transactionIdString)")
            call.resolve(["finished": false])
        }
    }

    /// Manually re-emits all unfinished transactions. JS can call this after
    /// sign-in to guarantee entitlement reconciliation even if the
    /// Transaction.updates task missed the event (e.g. app just launched).
    @objc func syncPendingTransactions(_ call: CAPPluginCall) {
        Task {
            var count = 0
            for await result in Transaction.unfinished {
                await self.handleVerificationResult(result, source: "sync")
                count += 1
            }
            call.resolve(["pending": count])
        }
    }

    private func productPayload(for product: Product) async -> [String: Any] {
        var hasActiveSubscription = false
        if let latestTransaction = await product.latestTransaction,
           case .verified(let transaction) = latestTransaction,
           transaction.revocationDate == nil {
            if let expirationDate = transaction.expirationDate {
                hasActiveSubscription = expirationDate >= Date()
            } else {
                hasActiveSubscription = true
            }
        }

        return [
            "productId": product.id,
            "title": product.displayName,
            "description": product.description,
            "displayPrice": product.displayPrice,
            "periodLabel": subscriptionPeriodLabel(for: product.subscription) ?? NSNull(),
            "hasActiveSubscription": hasActiveSubscription
        ]
    }

    private func subscriptionPeriodLabel(for subscription: Product.SubscriptionInfo?) -> String? {
        guard let period = subscription?.subscriptionPeriod else { return nil }
        switch period.unit {
        case .day:
            return period.value == 1 ? "day" : "\(period.value) days"
        case .week:
            return period.value == 1 ? "week" : "\(period.value) weeks"
        case .month:
            return period.value == 1 ? "month" : "\(period.value) months"
        case .year:
            return period.value == 1 ? "year" : "\(period.value) years"
        @unknown default:
            return nil
        }
    }

    private func transactionPayload(for transaction: Transaction, signedTransactionInfo: String) -> [String: Any] {
        return [
            "productId": transaction.productID,
            "transactionId": String(transaction.id),
            "originalTransactionId": String(transaction.originalID),
            "purchaseDate": ISO8601DateFormatter().string(from: transaction.purchaseDate),
            "expirationDate": transaction.expirationDate != nil ? ISO8601DateFormatter().string(from: transaction.expirationDate!) : NSNull(),
            "environment": transactionEnvironment(for: transaction) ?? NSNull(),
            "ownershipType": String(describing: transaction.ownershipType),
            "appAccountToken": transaction.appAccountToken?.uuidString ?? NSNull(),
            "signedTransactionInfo": signedTransactionInfo
        ]
    }

    private func transactionEnvironment(for transaction: Transaction) -> String? {
        if #available(iOS 16.0, *) {
            return String(describing: transaction.environment)
        }
        return nil
    }
}
