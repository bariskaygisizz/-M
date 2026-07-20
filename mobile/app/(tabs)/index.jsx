import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { fishList } from "../../data/fish";
import FishCard from "../../components/FishCard";
import { colors, DISCLAIMER } from "../../constants/theme";

export default function HomeScreen() {
  const featured = useMemo(() => fishList.slice(0, 4), []);
  const lowCal = useMemo(
    () => [...fishList].sort((a, b) => a.calories - b.calories).slice(0, 3),
    []
  );

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.brand}>BalıkAtlas</Text>
          <Text style={styles.headline}>
            Türkiye’nin balıklarını tanı.
          </Text>
          <Text style={styles.sub}>
            Tür, ağırlık, yetiştiği bölge, kalori, fayda ve dikkat edilmesi
            gerekenler — tek yerde.
          </Text>
          <Link href="/(tabs)/browse" asChild>
            <Pressable style={styles.cta} accessibilityRole="button">
              <Text style={styles.ctaText}>Balıkları Keşfet</Text>
            </Pressable>
          </Link>
        </View>

        <Text style={styles.section}>Öne çıkanlar</Text>
        {featured.map((f) => (
          <FishCard key={f.id} fish={f} />
        ))}

        <Text style={styles.section}>Düşük kalorili seçenekler</Text>
        {lowCal.map((f) => (
          <FishCard key={`low-${f.id}`} fish={f} />
        ))}

        <View style={styles.note}>
          <Text style={styles.noteText}>{DISCLAIMER}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  hero: {
    backgroundColor: colors.brand,
    borderRadius: 24,
    padding: 22,
    marginBottom: 22,
    overflow: "hidden",
  },
  brand: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  headline: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
    marginBottom: 8,
  },
  sub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  cta: {
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaText: {
    color: colors.brandDeep,
    fontWeight: "800",
    fontSize: 15,
  },
  section: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 12,
    marginTop: 8,
  },
  note: {
    marginTop: 12,
    padding: 14,
    backgroundColor: colors.foam,
    borderRadius: 14,
  },
  noteText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
});
