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
          Türkiye denizleri ve tatlı sularındaki balıkları tanıtan rehber:
          bölge, sezon, kalori, eşleşmeler ve genel bilgilendirme.
        </Text>

        <View style={styles.box}>
          <Text style={styles.boxTitle}>Özellikler</Text>
          <Text style={styles.boxText}>{fishList.length}+ balık kaydı</Text>
          <Text style={styles.boxText}>AI ile kamera / galeri tarama</Text>
          <Text style={styles.boxText}>Reklam ve takip yok</Text>
        </View>

        <Text style={styles.section}>Sağlık uyarısı</Text>
        <Text style={styles.body}>{DISCLAIMER}</Text>

        <Text style={styles.section}>Gizlilik</Text>
        <Text style={styles.body}>
          Hesap isteğe bağlıdır. Kamera yalnızca tarama başlattığınızda
          kullanılır. Favoriler cihazınızda saklanabilir.
        </Text>

        <Link href="/privacy" asChild>
          <Pressable style={styles.linkBtn} accessibilityRole="link">
            <Text style={styles.linkText}>Gizlilik Politikası</Text>
          </Pressable>
        </Link>
        <Link href="/terms" asChild>
          <Pressable style={[styles.linkBtn, { marginTop: 8 }]} accessibilityRole="link">
            <Text style={styles.linkText}>Kullanım Koşulları</Text>
          </Pressable>
        </Link>

        <Text style={styles.section}>İletişim</Text>
        <Pressable
          onPress={() => Linking.openURL("mailto:kaygisizbaris9@gmail.com")}
          accessibilityRole="link"
        >
          <Text style={styles.mail}>kaygisizbaris9@gmail.com</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0a0a0a" },
  content: { padding: 16, paddingBottom: 40 },
  brand: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2edcc8",
    marginBottom: 4,
  },
  version: { color: "#8a9aa0", marginBottom: 16, fontWeight: "600" },
  section: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    marginTop: 18,
    marginBottom: 8,
  },
  body: { color: "#e8eef0", fontSize: 15, lineHeight: 22 },
  box: {
    backgroundColor: "rgba(18,22,24,0.9)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginTop: 16,
    gap: 4,
  },
  boxTitle: { fontWeight: "700", color: "#2edcc8", marginBottom: 4 },
  boxText: { color: "#8a9aa0", fontSize: 14 },
  linkBtn: {
    marginTop: 12,
    backgroundColor: "#2edcc8",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  linkText: { color: "#041014", fontWeight: "700" },
  mail: {
    color: "#2edcc8",
    fontWeight: "700",
    fontSize: 15,
    marginTop: 4,
  },
});
