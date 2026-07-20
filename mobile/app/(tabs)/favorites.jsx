import { useCallback, useState } from "react";
import { FlatList, Text, StyleSheet, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { getFishById } from "../../data/fish";
import { getFavorites } from "../../lib/favorites";
import FishCard from "../../components/FishCard";
import { colors } from "../../constants/theme";

export default function FavoritesScreen() {
  const [items, setItems] = useState([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const ids = await getFavorites();
        if (!active) return;
        setItems(ids.map(getFishById).filter(Boolean));
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <FishCard fish={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Henüz favori yok</Text>
            <Text style={styles.emptyText}>
              Beğendiğiniz balıkların detayında yıldız ile favorilere ekleyin.
              Veriler yalnızca cihazınızda saklanır.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  empty: { paddingVertical: 56, paddingHorizontal: 12 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
});
