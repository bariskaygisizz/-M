import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  I18nManager,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { colors, spacing } from "../../constants/theme";
import { loadLocale, t, saveLocale, LOCALES } from "../../lib/i18n";

export default function HomeScreen() {
  const router = useRouter();
  const [locale, setLocale] = useState("tr");
  const tt = (path) => t(locale, path);

  useEffect(() => {
    loadLocale().then((code) => {
      setLocale(code);
      const meta = LOCALES.find((l) => l.code === code);
      if (meta?.dir === "rtl" && !I18nManager.isRTL) {
        // RTL flip requires reload in production; keep LTR layout stable in Expo Go
      }
    });
  }, []);

  async function cycleLocale() {
    const idx = LOCALES.findIndex((l) => l.code === locale);
    const next = LOCALES[(idx + 1) % LOCALES.length].code;
    await saveLocale(next);
    setLocale(next);
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <LinearGradient
        colors={["#1c332a", "#2f463b", "#4a3a2e"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.brand}>Davetly</Text>
        <Text style={styles.tagline}>{tt("tagline")}</Text>
        <Pressable style={styles.cta} onPress={() => router.push("/(tabs)/templates")}>
          <Text style={styles.ctaText}>{tt("heroCta")}</Text>
        </Pressable>
        <Pressable onPress={cycleLocale} style={styles.langBtn}>
          <Text style={styles.langText}>
            {tt("common.language")}: {LOCALES.find((l) => l.code === locale)?.name}
          </Text>
        </Pressable>
      </LinearGradient>

      <View style={styles.section}>
        <Text style={styles.h2}>{tt("pricing.title")}</Text>
        <Text style={styles.lead}>{tt("pricing.subtitle")}</Text>
        <Pressable style={styles.secondary} onPress={() => router.push("/(tabs)/pricing")}>
          <Text style={styles.secondaryText}>{tt("navPricing")}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: spacing.xl },
  hero: {
    minHeight: 420,
    padding: spacing.lg,
    justifyContent: "flex-end",
  },
  brand: {
    color: colors.foam,
    fontSize: 52,
    fontWeight: "700",
    letterSpacing: -1,
    marginBottom: spacing.sm,
  },
  tagline: {
    color: "rgba(244,248,244,0.92)",
    fontSize: 17,
    lineHeight: 26,
    marginBottom: spacing.lg,
    maxWidth: 320,
  },
  cta: {
    backgroundColor: colors.foam,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  ctaText: { color: colors.ink, fontWeight: "700" },
  langBtn: { marginTop: spacing.md },
  langText: { color: "rgba(244,248,244,0.8)", fontSize: 13 },
  section: { padding: spacing.lg },
  h2: { fontSize: 28, fontWeight: "700", color: colors.ink, marginBottom: 8 },
  lead: { color: colors.muted, lineHeight: 22, marginBottom: spacing.md },
  secondary: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignSelf: "flex-start",
  },
  secondaryText: { color: colors.ink, fontWeight: "600" },
});
