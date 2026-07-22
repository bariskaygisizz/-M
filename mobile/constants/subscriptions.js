/**
 * App Store abonelik sözleşmesi (Guideline 3.1.2)
 * Product ID'ler App Store Connect ile BİREBİR aynı olmalı.
 */
export const IAP_PRODUCTS = {
  monthly: {
    productId: "com.bariskaygisiz.balikatlas.premium.monthly",
    planKey: "premium_month",
    title: "Premium Aylık",
    periodLabel: "1 ay",
    // Fiyat Connect’te belirlenir; burada yalnızca gösterim şablonu
    displayPriceHint: "App Store fiyatı geçerlidir",
    months: 1,
    features: [
      "Sınırsız AI balık tarama",
      "Reklamsız deneyim",
      "Favori ve geçmiş senkronu",
    ],
  },
  yearly: {
    productId: "com.bariskaygisiz.balikatlas.premium.yearly",
    planKey: "premium_year",
    title: "Premium Yıllık",
    periodLabel: "1 yıl",
    displayPriceHint: "App Store fiyatı geçerlidir",
    months: 12,
    features: [
      "Sınırsız AI balık tarama",
      "Reklamsız deneyim",
      "Yıllık planda daha avantajlı",
    ],
  },
};

export const SUBSCRIPTION_LEGAL = {
  autoRenew:
    "Abonelik otomatik yenilenir. İptal etmezseniz dönem bitmeden en az 24 saat önce Apple Kimliğinizden ücret alınır.",
  manage:
    "Aboneliği Ayarlar → Apple Kimliği → Abonelikler bölümünden yönetebilir veya iptal edebilirsiniz.",
  chargedTo: "Ödeme, satın alma onayıyla Apple Kimliği hesabınızdan tahsil edilir.",
  restore: "Daha önce satın aldıysanız ‘Satın Alımları Geri Yükle’ ile haklarınızı geri alabilirsiniz.",
};

export const MEDICAL_DISCLAIMER =
  "BalıkAtlas yalnızca genel bilgilendirme sunar; tıbbi teşhis, tedavi, diyet veya ilaç yerine geçmez. Besin değerleri ve organ/sistem notları yaklaşıktır. Sağlık kararları için hekim veya diyetisyene danışın.";

export const SUPPORT_URL = "mailto:kaygisizbaris9@gmail.com";
export const PRIVACY_PATH = "/privacy";
export const TERMS_PATH = "/terms";
