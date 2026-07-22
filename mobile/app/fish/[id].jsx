import { useEffect, useLayoutEffect, useState } from "react";
import {
  ScrollView,
  Text,
  StyleSheet,
  Pressable,
  View,
  Share,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { getFishById } from "../../data/fish";
import { isFavorite, toggleFavorite } from "../../lib/favorites";
import StatGrid from "../../components/StatGrid";
import BulletSection from "../../components/BulletSection";
import { colors, DISCLAIMER } from "../../constants/theme";

const ORGAN_LABELS = {
  brain: "Beyin",
  eye: "Göz",
  heart: "Kalp",
  bone: "Kemik / eklem",
  skin: "Cilt",
  immune: "Bağışıklık",
  thyroid: "Tiroid",
  muscle: "Kas",
};

export default function FishDetailScreen() {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();
  const fish = getFishById(String(id));
  const [fav, setFav] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!fish) return;
      const v = await isFavorite(fish.id);
      if (active) setFav(v);
    })();
    return () => {
      active = false;
    };
  }, [fish]);

  useLayoutEffect(() => {
    if (!fish) return;
    navigation.setOptions({
      title: fish.name,
      headerRight: () => (
        <Pressable
          onPress={async () => {
            const next = await toggleFavorite(fish.id);
            setFav(next);
          }}
          accessibilityLabel={fav ? "Favorilerden çıkar" : "Favorilere ekle"}
          hitSlop={12}
          style={{ paddingHorizontal: 8 }}
        >
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700" }}>
            {fav ? "★" : "☆"}
          </Text>
        </Pressable>
      ),
    });
  }, [navigation, fish, fav]);

  if (!fish) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Balık bulunamadı.</Text>
      </View>
    );
  }

  const onShare = async () => {
    await Share.share({
      message: `${fish.name} — ${fish.calories} kcal/100g · ${(fish.seas || fish.regions).join(", ")}. BalıkAtlas`,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.sci}>{fish.scientific}</Text>
      <Text style={styles.summary}>{fish.summary}</Text>

      <View style={styles.facts}>
        <Fact label="Ortalama ağırlık" value={fish.avgWeight} />
        <Fact label="Ortalama boy" value={fish.avgLength} />
        <Fact label="Tür" value={fish.type} />
        <Fact label="Sezon" value={fish.season} />
        <Fact label="En iyi zaman" value={fish.bestMonths || fish.season} />
        <Fact label="Lezzet" value={fish.taste} />
        <Fact label="Deniz / su" value={(fish.seas || fish.regions).join(", ")} />
        <Fact label="Şehirler" value={(fish.cities || []).join(", ") || "—"} />
        <Fact label="Bolluk" value={fish.abundance || "—"} />
      </View>

      <Text style={styles.section}>Besin (100 g)</Text>
      <StatGrid fish={fish} />

      <Text style={styles.section}>Ne ile gider?</Text>
      <Text style={styles.chips}>{(fish.pairsWith || []).join(" · ")}</Text>

      <Text style={styles.section}>Ne ile kaçınılır?</Text>
      <Text style={styles.chipsWarn}>{(fish.avoidWith || []).join(" · ")}</Text>

      <Text style={styles.section}>Organ / sistem</Text>
      {Object.entries(fish.organs || {}).map(([k, note]) => (
        <View key={k} style={styles.organRow}>
          <Text style={styles.organTitle}>{ORGAN_LABELS[k] || k}</Text>
          <Text style={styles.organNote}>{note}</Text>
        </View>
      ))}

      <BulletSection title="Olası faydalar" items={fish.benefits} tone="good" />
      <BulletSection title="Dikkat / zararlar" items={fish.harms} tone="warn" />

      <View style={styles.tip}>
        <Text style={styles.tipTitle}>Pratik ipucu</Text>
        <Text style={styles.tipText}>{fish.tip}</Text>
      </View>

      <Pressable style={styles.share} onPress={onShare} accessibilityRole="button">
        <Text style={styles.shareText}>Paylaş</Text>
      </Pressable>

      <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
    </ScrollView>
  );
}

function Fact({ label, value }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  missing: { flex: 1, alignItems: "center", justifyContent: "center" },
  missingText: { color: colors.muted, fontSize: 16 },
  sci: { fontStyle: "italic", color: colors.muted, marginBottom: 10, fontSize: 14 },
  summary: { fontSize: 16, lineHeight: 24, color: colors.ink, marginBottom: 16 },
  facts: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 18,
    gap: 12,
  },
  fact: { gap: 2 },
  factLabel: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  factValue: { color: colors.ink, fontSize: 15, fontWeight: "600" },
  section: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 10,
    marginTop: 8,
  },
  chips: { color: "#2edcc8", marginBottom: 12, lineHeight: 22 },
  chipsWarn: { color: "#e07a6a", marginBottom: 12, lineHeight: 22 },
  organRow: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.foam || "#E8F6F4",
  },
  organTitle: { fontWeight: "800", color: colors.brand, marginBottom: 4 },
  organNote: { color: colors.ink, lineHeight: 20 },
  tip: {
    marginTop: 16,
    backgroundColor: colors.foam,
    borderRadius: 14,
    padding: 14,
  },
  tipTitle: { fontWeight: "700", color: colors.brand, marginBottom: 6 },
  tipText: { color: colors.ink, lineHeight: 21, fontSize: 14 },
  share: {
    marginTop: 16,
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  shareText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  disclaimer: {
    marginTop: 18,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
});
