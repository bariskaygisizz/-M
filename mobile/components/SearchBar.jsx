import { View, TextInput, ScrollView, Pressable, Text, StyleSheet } from "react-native";
import { colors } from "../constants/theme";
import { REGIONS } from "../data/fish";

const ALL = ["Tümü", ...REGIONS];

export default function SearchBar({ query, onQuery, region, onRegion }) {
  return (
    <View style={styles.wrap}>
      <TextInput
        value={query}
        onChangeText={onQuery}
        placeholder="Balık adı, bölge veya tür ara…"
        placeholderTextColor={colors.muted}
        style={styles.input}
        autoCorrect={false}
        clearButtonMode="while-editing"
        accessibilityLabel="Balık ara"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {ALL.map((r) => {
          const active = region === r;
          return (
            <Pressable
              key={r}
              onPress={() => onRegion(r)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {r}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 10,
  },
  chips: { gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  chipText: { color: colors.muted, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: "#fff" },
});
