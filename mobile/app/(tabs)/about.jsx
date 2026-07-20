import { ScrollView, Text, StyleSheet, Pressable, Linking, View } from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, DISCLAIMER } from "../../constants/theme";
import { fishList } from "../../data/fish";

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>BalıkAtlas</Text>
        <Text style={styles.version}>Sürüm 1.0.0</Text>
        <Text style={styles.body}>
          BalıkAtlas; Türkiye denizleri ve tatlı sularında bilinen balıkların
          türü, ortalama ağırlığı, yetiştiği bölge, kalori/protein bilgisi,
          olası faydaları ve dikkat edilmesi gereken noktalarını tanıtan
          çevrimdışı bir rehberdir.
        </Text>

        <View style={styles.box}>
          <Text style={styles.boxTitle}>İçerik özeti</Text>
          <Text style={styles.boxText}>{fishList.length} balık kaydı</Text>
          <Text style={styles.boxText}>Çevrimdışı çalışır</Text>
          <Text style={styles.boxText}>Reklam ve takip yok</Text>
        </View>

        <Text style={styles.section}>Sağlık uyarısı</Text>
        <Text style={styles.body}>{DISCLAIMER}</Text>

        <Text style={styles.section}>Gizlilik</Text>
        <Text style={styles.body}>
          Uygulama hesap, konum, kamera veya mikrofon kullanmaz. Favoriler
          yalnızca cihazınızda (AsyncStorage) saklanır; sunucuya gönderilmez.
        </Text>

        <Link href="/privacy" asChild>
          <Pressable style={styles.linkBtn} accessibilityRole="link">
            <Text style={styles.linkText}>Gizlilik Politikasını Aç</Text>
          </Pressable>
        </Link>

        <Text style={styles.section}>İletişim</Text>
        <Pressable
          onPress={() => Linking.openURL("mailto:kaygisizbaris9@gmail.com")}
          accessibilityRole="link"
        >
          <Text style={styles.mail}>kaygisizbaris9@gmail.com</Text>
        </Pressable>

        <Text style={styles.footer}>
          © 2026 BalıkAtlas. Tüm hakları saklıdır.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  brand: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.brand,
    marginBottom: 4,
  },
  version: { color: colors.muted, marginBottom: 16, fontWeight: "600" },
  section: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 18,
    marginBottom: 8,
  },
  body: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  box: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 16,
    gap: 4,
  },
  boxTitle: { fontWeight: "700", color: colors.brand, marginBottom: 4 },
  boxText: { color: colors.muted, fontSize: 14 },
  linkBtn: {
    marginTop: 12,
    backgroundColor: colors.brand,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  linkText: { color: "#fff", fontWeight: "700" },
  mail: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 15,
    marginTop: 4,
  },
  footer: {
    marginTop: 28,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
});
