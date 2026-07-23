/** Freemium + subscription plans (App Store / Play / Web) */

export const FREE_LIMITS = {
  maxInvitations: 3,
  maxEditsPerInvitation: 5,
  watermark: true,
  premiumTemplates: false,
  rsvp: false,
  exportPdf: false,
  removeBranding: false,
  customMusic: false,
};

export const PLANS = {
  free: {
    id: "free",
    productIds: {},
    priceMonthly: 0,
    priceYearly: 0,
    limits: { ...FREE_LIMITS },
  },
  plus: {
    id: "plus",
    /** Apple / Google product identifiers */
    productIds: {
      iosMonthly: "com.davetly.plus.monthly",
      iosYearly: "com.davetly.plus.yearly",
      androidMonthly: "davetly_plus_monthly",
      androidYearly: "davetly_plus_yearly",
      webMonthly: "price_plus_monthly",
      webYearly: "price_plus_yearly",
    },
    priceMonthly: 79,
    priceYearly: 599,
    currency: "TRY",
    limits: {
      maxInvitations: 30,
      maxEditsPerInvitation: Infinity,
      watermark: false,
      premiumTemplates: true,
      rsvp: true,
      exportPdf: true,
      removeBranding: true,
      customMusic: false,
    },
  },
  pro: {
    id: "pro",
    productIds: {
      iosMonthly: "com.davetly.pro.monthly",
      iosYearly: "com.davetly.pro.yearly",
      androidMonthly: "davetly_pro_monthly",
      androidYearly: "davetly_pro_yearly",
      webMonthly: "price_pro_monthly",
      webYearly: "price_pro_yearly",
    },
    priceMonthly: 149,
    priceYearly: 1199,
    currency: "TRY",
    limits: {
      maxInvitations: Infinity,
      maxEditsPerInvitation: Infinity,
      watermark: false,
      premiumTemplates: true,
      rsvp: true,
      exportPdf: true,
      removeBranding: true,
      customMusic: true,
    },
  },
};

export function resolveLimits(planId = "free") {
  return PLANS[planId]?.limits || FREE_LIMITS;
}
