import { useMemo, useState } from "react";
import { FlatList, Text, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { searchFish } from "../../data/fish";
import FishCard from "../../components/FishCard";
import SearchBar from "../../components/SearchBar";
import { colors } from "../../constants/theme";

export default function BrowseScreen() {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("Tümü");

  const data = useMemo(() => searchFish(query, region), [query, region]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <SearchBar
              query={query}
              onQuery={setQuery}
              region={region}
              onRegion={setRegion}
            />
            <Text style={styles.count}>{data.length} balık</Text>
          </View>
        }
        renderItem={({ item }) => <FishCard fish={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Sonuç yok</Text>
            <Text style={styles.emptyText}>
              Farklı bir arama veya bölge deneyin.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, paddingBottom: 32 },
  count: {
    color: colors.muted,
    fontWeight: "600",
    marginBottom: 12,
    fontSize: 13,
  },
  empty: { paddingVertical: 48, alignItems: "center" },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 6,
  },
  emptyText: { color: colors.muted, fontSize: 14 },
});
