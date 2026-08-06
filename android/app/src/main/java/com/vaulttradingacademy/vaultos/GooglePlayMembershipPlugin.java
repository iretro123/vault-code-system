package com.vaulttradingacademy.vaultos;

import android.app.Activity;

import androidx.annotation.NonNull;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "GooglePlayMembership")
public class GooglePlayMembershipPlugin extends Plugin implements PurchasesUpdatedListener {
    private BillingClient billingClient;
    private PluginCall pendingPurchaseCall;
    private final Map<String, ProductDetails> productDetailsById = new HashMap<>();

    @Override
    public void load() {
        billingClient = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder()
                .enableOneTimeProducts()
                .build())
            .build();
    }

    @PluginMethod
    public void getProducts(PluginCall call) {
        JSArray ids = call.getArray("productIds", new JSArray());
        if (ids.length() == 0) {
            call.reject("NO_PRODUCT_IDS");
            return;
        }

        ensureReady(call, () -> {
            List<QueryProductDetailsParams.Product> products = new ArrayList<>();
            for (int i = 0; i < ids.length(); i++) {
                String productId = ids.optString(i, null);
                if (productId == null || productId.trim().isEmpty()) continue;
                products.add(QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(productId)
                    .setProductType(BillingClient.ProductType.SUBS)
                    .build());
            }

            QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(products)
                .build();

            billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsResult) -> {
                if (!isOk(billingResult)) {
                    call.reject(errorMessage("PRODUCT_QUERY_FAILED", billingResult));
                    return;
                }

                List<ProductDetails> detailsList = productDetailsResult.getProductDetailsList();
                for (ProductDetails details : detailsList) {
                    productDetailsById.put(details.getProductId(), details);
                }

                queryActivePurchases(activeTokens -> {
                    JSArray responseProducts = new JSArray();
                    for (ProductDetails details : detailsList) {
                        responseProducts.put(productToJson(
                            details,
                            activeTokens.containsKey(details.getProductId())
                        ));
                    }
                    JSObject ret = new JSObject();
                    ret.put("products", responseProducts);
                    call.resolve(ret);
                }, error -> call.reject(error));
            });
        });
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        String productId = call.getString("productId", "");
        if (productId.trim().isEmpty()) {
            call.reject("PRODUCT_ID_REQUIRED");
            return;
        }

        ensureReady(call, () -> loadProduct(productId, details -> {
            ProductDetails.SubscriptionOfferDetails offer = firstOffer(details);
            if (offer == null) {
                call.reject("NO_SUBSCRIPTION_OFFER");
                return;
            }

            Activity activity = getActivity();
            if (activity == null) {
                call.reject("NO_ACTIVITY");
                return;
            }

            BillingFlowParams.ProductDetailsParams productParams =
                BillingFlowParams.ProductDetailsParams.newBuilder()
                    .setProductDetails(details)
                    .setOfferToken(offer.getOfferToken())
                    .build();

            pendingPurchaseCall = call;
            BillingResult result = billingClient.launchBillingFlow(activity,
                BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(singleton(productParams))
                    .build());

            if (!isOk(result)) {
                pendingPurchaseCall = null;
                call.reject(errorMessage("PURCHASE_LAUNCH_FAILED", result));
            }
        }, error -> call.reject(error)));
    }

    @PluginMethod
    public void restorePurchases(PluginCall call) {
        ensureReady(call, () -> queryPurchases(purchases -> {
            JSArray transactions = new JSArray();
            for (Purchase purchase : purchases) {
                if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                    transactions.put(purchaseToJson(purchase));
                }
            }
            JSObject ret = new JSObject();
            ret.put("transactions", transactions);
            call.resolve(ret);
        }, error -> call.reject(error)));
    }

    @PluginMethod
    public void acknowledgePurchase(PluginCall call) {
        String purchaseToken = call.getString("purchaseToken", "");
        if (purchaseToken.trim().isEmpty()) {
            call.reject("PURCHASE_TOKEN_REQUIRED");
            return;
        }

        ensureReady(call, () -> {
            AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchaseToken)
                .build();
            billingClient.acknowledgePurchase(params, billingResult -> {
                if (!isOk(billingResult)) {
                    call.reject(errorMessage("ACKNOWLEDGE_FAILED", billingResult));
                    return;
                }
                JSObject ret = new JSObject();
                ret.put("acknowledged", true);
                call.resolve(ret);
            });
        });
    }

    @PluginMethod
    public void syncPendingPurchases(PluginCall call) {
        ensureReady(call, () -> queryPurchases(purchases -> {
            int pending = 0;
            for (Purchase purchase : purchases) {
                if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED && !purchase.isAcknowledged()) {
                    pending += 1;
                    JSObject event = new JSObject();
                    event.put("source", "sync");
                    event.put("transaction", purchaseToJson(purchase));
                    notifyListeners("membershipTransactionUpdate", event);
                }
            }
            JSObject ret = new JSObject();
            ret.put("pending", pending);
            call.resolve(ret);
        }, error -> call.reject(error)));
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, List<Purchase> purchases) {
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            if (pendingPurchaseCall != null) {
                pendingPurchaseCall.reject("USER_CANCELLED");
                pendingPurchaseCall = null;
            }
            return;
        }

        if (!isOk(billingResult)) {
            if (pendingPurchaseCall != null) {
                pendingPurchaseCall.reject(errorMessage("PURCHASE_FAILED", billingResult));
                pendingPurchaseCall = null;
            }
            return;
        }

        Purchase purchase = firstPurchased(purchases);
        if (purchase == null) {
            if (pendingPurchaseCall != null) {
                pendingPurchaseCall.reject("NO_COMPLETED_PURCHASE");
                pendingPurchaseCall = null;
            }
            return;
        }

        JSObject transaction = purchaseToJson(purchase);
        if (pendingPurchaseCall != null) {
            JSObject ret = new JSObject();
            ret.put("transaction", transaction);
            pendingPurchaseCall.resolve(ret);
            pendingPurchaseCall = null;
        }

        JSObject event = new JSObject();
        event.put("source", "updates");
        event.put("transaction", transaction);
        notifyListeners("membershipTransactionUpdate", event);
    }

    private void ensureReady(PluginCall call, Runnable ready) {
        if (billingClient == null) {
            call.reject("BILLING_CLIENT_NOT_INITIALIZED");
            return;
        }
        if (billingClient.isReady()) {
            ready.run();
            return;
        }
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                if (!isOk(billingResult)) {
                    call.reject(errorMessage("BILLING_SETUP_FAILED", billingResult));
                    return;
                }
                ready.run();
            }

            @Override
            public void onBillingServiceDisconnected() {
                // The next call will reconnect.
            }
        });
    }

    private void loadProduct(String productId, ProductLoaded success, ErrorLoaded failure) {
        ProductDetails cached = productDetailsById.get(productId);
        if (cached != null) {
            success.run(cached);
            return;
        }

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(singleton(QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.SUBS)
                .build()))
            .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsResult) -> {
            if (!isOk(billingResult)) {
                failure.run(errorMessage("PRODUCT_QUERY_FAILED", billingResult));
                return;
            }
            List<ProductDetails> detailsList = productDetailsResult.getProductDetailsList();
            if (detailsList.isEmpty()) {
                failure.run("PRODUCT_NOT_FOUND");
                return;
            }
            ProductDetails details = detailsList.get(0);
            productDetailsById.put(productId, details);
            success.run(details);
        });
    }

    private void queryPurchases(PurchasesLoaded success, ErrorLoaded failure) {
        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.SUBS)
            .build();
        billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
            if (!isOk(billingResult)) {
                failure.run(errorMessage("QUERY_PURCHASES_FAILED", billingResult));
                return;
            }
            success.run(purchases);
        });
    }

    private void queryActivePurchases(ActivePurchasesLoaded success, ErrorLoaded failure) {
        queryPurchases(purchases -> {
            Map<String, String> active = new HashMap<>();
            for (Purchase purchase : purchases) {
                if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) continue;
                for (String productId : purchase.getProducts()) {
                    active.put(productId, purchase.getPurchaseToken());
                }
            }
            success.run(active);
        }, failure);
    }

    private JSObject productToJson(ProductDetails details, boolean hasActiveSubscription) {
        JSObject json = new JSObject();
        json.put("productId", details.getProductId());
        json.put("title", details.getTitle());
        json.put("description", details.getDescription());
        json.put("hasActiveSubscription", hasActiveSubscription);

        ProductDetails.PricingPhase phase = firstPricingPhase(details);
        json.put("displayPrice", phase != null ? phase.getFormattedPrice() : "");
        json.put("periodLabel", phase != null ? phase.getBillingPeriod() : null);
        return json;
    }

    private JSObject purchaseToJson(Purchase purchase) {
        JSObject json = new JSObject();
        String productId = purchase.getProducts().isEmpty() ? "" : purchase.getProducts().get(0);
        json.put("productId", productId);
        json.put("transactionId", purchase.getOrderId() != null ? purchase.getOrderId() : purchase.getPurchaseToken());
        json.put("originalTransactionId", purchase.getPurchaseToken());
        json.put("purchaseToken", purchase.getPurchaseToken());
        json.put("orderId", purchase.getOrderId());
        json.put("packageName", getContext().getPackageName());
        json.put("purchaseDate", new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).format(new java.util.Date(purchase.getPurchaseTime())));
        json.put("isAcknowledged", purchase.isAcknowledged());
        json.put("purchaseState", purchase.getPurchaseState());
        return json;
    }

    private ProductDetails.SubscriptionOfferDetails firstOffer(ProductDetails details) {
        List<ProductDetails.SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
        if (offers == null || offers.isEmpty()) return null;
        return offers.get(0);
    }

    private ProductDetails.PricingPhase firstPricingPhase(ProductDetails details) {
        ProductDetails.SubscriptionOfferDetails offer = firstOffer(details);
        if (offer == null || offer.getPricingPhases().getPricingPhaseList().isEmpty()) return null;
        return offer.getPricingPhases().getPricingPhaseList().get(0);
    }

    private Purchase firstPurchased(List<Purchase> purchases) {
        if (purchases == null) return null;
        for (Purchase purchase : purchases) {
            if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) return purchase;
        }
        return null;
    }

    private boolean isOk(BillingResult result) {
        return result.getResponseCode() == BillingClient.BillingResponseCode.OK;
    }

    private String errorMessage(String prefix, BillingResult result) {
        return prefix + ":" + result.getResponseCode() + ":" + result.getDebugMessage();
    }

    private <T> List<T> singleton(T item) {
        List<T> list = new ArrayList<>();
        list.add(item);
        return list;
    }

    private interface ProductLoaded {
        void run(ProductDetails details);
    }

    private interface PurchasesLoaded {
        void run(List<Purchase> purchases);
    }

    private interface ActivePurchasesLoaded {
        void run(Map<String, String> activePurchases);
    }

    private interface ErrorLoaded {
        void run(String error);
    }
}
