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
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise)
    ]

    @objc func getProducts(_ call: CAPPluginCall) {
        let productIds = call.getArray("productIds", String.self) ?? []
        guard !productIds.isEmpty else {
            call.reject("At least one product id is required")
            return
        }

        Task {
            do {
                let products = try await Product.products(for: productIds)
                var payload = [[String: Any]]()
                for product in products {
                    payload.append(await productPayload(for: product))
                }
                call.resolve([
                    "products": payload
                ])
            } catch {
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
                        call.reject("The purchase could not be verified")
                        return
                    }
                    await transaction.finish()
                    call.resolve([
                        "transaction": transactionPayload(for: transaction)
                    ])
                case .userCancelled:
                    call.reject("USER_CANCELLED")
                case .pending:
                    call.reject("PURCHASE_PENDING")
                @unknown default:
                    call.reject("Unknown purchase result")
                }
            } catch {
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

        Task {
            do {
                try await AppStore.sync()

                var transactions = [[String: Any]]()
                for await result in Transaction.currentEntitlements {
                    guard case .verified(let transaction) = result else { continue }
                    guard productIds.contains(transaction.productID) else { continue }
                    guard transaction.revocationDate == nil else { continue }
                    if let expirationDate = transaction.expirationDate, expirationDate < Date() {
                        continue
                    }
                    transactions.append(transactionPayload(for: transaction))
                }

                call.resolve([
                    "transactions": transactions
                ])
            } catch {
                call.reject(error.localizedDescription)
            }
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

    private func transactionPayload(for transaction: Transaction) -> [String: Any] {
        return [
            "productId": transaction.productID,
            "transactionId": String(transaction.id),
            "originalTransactionId": String(transaction.originalID),
            "purchaseDate": ISO8601DateFormatter().string(from: transaction.purchaseDate),
            "expirationDate": transaction.expirationDate != nil ? ISO8601DateFormatter().string(from: transaction.expirationDate!) : NSNull(),
            "environment": transactionEnvironment(for: transaction) ?? NSNull(),
            "ownershipType": String(describing: transaction.ownershipType),
            "appAccountToken": transaction.appAccountToken?.uuidString ?? NSNull()
        ]
    }

    private func transactionEnvironment(for transaction: Transaction) -> String? {
        if #available(iOS 16.0, *) {
            return String(describing: transaction.environment)
        }
        return nil
    }
}
