import { Platform } from "react-native";
import { IAP_PRODUCTS } from "../constants/subscriptions";
import { activateAppleSubscription, restoreAppleSubscription } from "./api";

/**
 * App Store IAP katmanı (Guideline 3.1.1)
 * Production'da yalnızca Apple ödeme yolu premium açabilir.
 * __DEV__ ortamında sandbox/test için sunucu bayrağı kullanılabilir.
 */
export function getProductList() {
  return [IAP_PRODUCTS.monthly, IAP_PRODUCTS.yearly];
}

export async function purchasePremium(planKey) {
  const product = Object.values(IAP_PRODUCTS).find((p) => p.planKey === planKey);
  if (!product) {
    throw new Error("Geçersiz abonelik ürünü.");
  }

  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    throw new Error("Abonelik yalnızca App Store / Play Store uygulamasında alınabilir.");
  }

  // StoreKit / Play Billing bağlanana kadar: production'da sahte satın alma YOK
  // EAS production build'de react-native-purchases veya StoreKit 2 entegre edilir.
  // Burada App Store incelemesi için güvenli sözleşme:
  // - Gerçek transactionId olmadan premium AÇILMAZ (sunucu da reddeder)

  if (typeof __DEV__ !== "undefined" && __DEV__) {
    // Geliştirici sandbox: yalnızca sunucu ALLOW_DEV_IAP=1 ise kabul edilir
    return activateAppleSubscription({
      plan: product.planKey,
      productId: product.productId,
      transactionId: `sandbox_dev_${Date.now()}`,
      source: "dev",
    });
  }

  // Production yolu: native IAP sonucu beklenir
  throw new Error(
    "Satın alma şu an tamamlanamadı. Lütfen daha sonra tekrar deneyin veya Satın Alımları Geri Yükle’yi kullanın."
  );
}

export async function restorePurchases() {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    return restoreAppleSubscription();
  }
  throw new Error(
    "Geri yüklenecek satın alma bulunamadı. App Store hesabınızla giriş yaptığınızdan emin olun."
  );
}
