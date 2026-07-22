import { View, Text, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { colors } from "../constants/theme";

export default function FishCard({ fish }) {
  return (
    <Link href={`/fish/${fish.id}`} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{fish.type}</Text>
        </View>
        <Text style={styles.name}>{fish.name}</Text>
        <Text style={styles.sci}>{fish.scientific}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{fish.avgWeight}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.meta}>{fish.calories} kcal / 100 g</Text>
        </View>
        <Text style={styles.regions} numberOfLines={1}>
          {fish.regions.join(" · ")}
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.foam,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  badgeText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "700",
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 2,
  },
  sci: {
    fontSize: 13,
    fontStyle: "italic",
    color: colors.muted,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  meta: { color: colors.brand, fontWeight: "600", fontSize: 13 },
  dot: { marginHorizontal: 6, color: colors.muted },
  regions: { color: colors.muted, fontSize: 13 },
});
