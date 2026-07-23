import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { colors, spacing } from "../../constants/theme";
import { api, getStoredUser, setSession } from "../../lib/api";
import { loadLocale, t, translations } from "../../lib/i18n";
import { PLANS } from "../../../shared/plans.js";

function featureList(locale, key) {
  const list = translations[locale]?.pricing?.[key] || translations.en.pricing[key];
  return Array.isArray(list) ? list : [];
}

export default function PricingScreen() {
  const [locale, setLocale] = useState("tr");
  const [period, setPeriod] = useState("monthly");
  const [user, setUser] = useState(null);
  const tt = (path) => t(locale, path);

  useEffect(() => {
    loadLocale().then(setLocale);
    getStoredUser().then(setUser);
  }, []);

  async function subscribe(planId) {
    try {
      const data = await api.subscribe({ planId, period });
      await setSession(undefined, data.user);
      setUser(data.user);
      Alert.alert(tt("pricing.current"), tt(`pricing.${planId}`));
    } catch (e) {
      Alert.alert(tt("errors.generic"), e.message);
    }
  }

  async function restore() {
    try {
      const data = await api.restore({ planId: "plus" });
      await setSession(undefined, data.user);
      setUser(data.user);
      Alert.alert(tt("pricing.restore"), tt(`pricing.${data.user.plan}`));
    } catch (e) {
      Alert.alert(tt("errors.generic"), e.message);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.h2}>{tt("pricing.title")}</Text>
      <Text style={styles.lead}>{tt("pricing.subtitle")}</Text>

      <View style={styles.row}>
        {["monthly", "yearly"].map((p) => (
          <Pressable
            key={p}
            style={[styles.chip, period === p && styles.chipOn]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.chipText, period === p && styles.chipTextOn]}>
              {tt(`pricing.${p}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {["free", "plus", "pro"].map((id) => {
        const plan = PLANS[id];
        const price =
          id === "free"
            ? 0
            : period === "yearly"
              ? plan.priceYearly
              : plan.priceMonthly;
        const features = featureList(
          locale,
          id === "free" ? "featuresFree" : id === "plus" ? "featuresPlus" : "featuresPro"
        );
        return (
          <View key={id} style={[styles.card, id === "plus" && styles.featured]}>
            <Text style={styles.planName}>{tt(`pricing.${id}`)}</Text>
            <Text style={styles.price}>
              {price === 0
                ? "0 ₺"
                : `${price} ₺ ${period === "yearly" ? tt("pricing.perYear") : tt("pricing.perMonth")}`}
            </Text>
            {features.map((f) => (
              <Text key={f} style={styles.feature}>
                • {f}
              </Text>
            ))}
            <Pressable
              style={styles.cta}
              disabled={id === "free" || user?.plan === id}
              onPress={() => subscribe(id)}
            >
              <Text style={styles.ctaText}>
                {user?.plan === id ? tt("pricing.current") : tt("pricing.choose")}
              </Text>
            </Pressable>
          </View>
        );
      })}

      <Text style={styles.legal}>{tt("pricing.autoRenew")}</Text>
      <Text style={styles.legal}>{tt("pricing.trialNote")}</Text>
      {/* App Store Guideline 3.1.1 — Restore Purchases required for IAP */}
      <Pressable style={styles.restore} onPress={restore}>
        <Text style={styles.restoreText}>{tt("pricing.restore")}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  h2: { fontSize: 28, fontWeight: "700", color: colors.ink },
  lead: { color: colors.muted, lineHeight: 22 },
  row: { flexDirection: "row", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { color: colors.ink, fontWeight: "600" },
  chipTextOn: { color: colors.foam },
  card: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 18,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 4,
  },
  featured: { borderColor: colors.sage },
  planName: { fontSize: 22, fontWeight: "700", color: colors.ink },
  price: { fontSize: 18, fontWeight: "700", marginBottom: 6, color: colors.inkSoft },
  feature: { color: colors.muted, lineHeight: 22 },
  cta: {
    marginTop: 10,
    backgroundColor: colors.sage,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  ctaText: { color: colors.white, fontWeight: "700" },
  legal: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  restore: { paddingVertical: 12 },
  restoreText: { color: colors.copper, fontWeight: "700", textAlign: "center" },
});
