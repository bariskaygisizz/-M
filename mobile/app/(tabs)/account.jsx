import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  login,
  register,
  fetchMe,
  clearSession,
  getCachedUser,
  deleteAccount,
} from "../../lib/api";
import { getProductList, purchasePremium, restorePurchases } from "../../lib/iap";
import {
  SUBSCRIPTION_LEGAL,
  MEDICAL_DISCLAIMER,
  SUPPORT_URL,
} from "../../constants/subscriptions";

export default function AccountScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const products = getProductList();

  const refresh = async () => {
    setLoading(true);
    setUser(await getCachedUser());
    setUser(await fetchMe());
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const onAuth = async () => {
    setBusy(true);
    setError("");
    try {
      const fn = mode === "login" ? login : register;
      const json = await fn(username.trim(), password);
      setUser(json.user);
    } catch (err) {
      setError(err.message || "Hata");
    } finally {
      setBusy(false);
    }
  };

  const onBuy = (planKey) => {
    Alert.alert(
      "App Store Aboneliği",
      "Ödeme Apple tarafından alınır. Abonelik otomatik yenilenir; iptali Apple Kimliği ayarlarından yapılır.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Devam",
          onPress: async () => {
            setBusy(true);
            setError("");
            try {
              const json = await purchasePremium(planKey);
              setUser(json.user);
              Alert.alert("Tamam", "Premium hakların güncellendi.");
            } catch (err) {
              setError(err.message || "Satın alma tamamlanamadı");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const onRestore = async () => {
    setBusy(true);
    setError("");
    try {
      const json = await restorePurchases();
      if (json.user) setUser(json.user);
      Alert.alert("Geri yükleme", "Satın alımlar kontrol edildi.");
    } catch (err) {
      setError(err.message || "Geri yükleme başarısız");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = () => {
    Alert.alert(
      "Hesabı sil",
      "Hesabınız ve sunucudaki verileriniz kalıcı silinir. Bu işlem geri alınamaz.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount();
              setUser(null);
              Alert.alert("Silindi", "Hesabınız kaldırıldı.");
            } catch (err) {
              setError(err.message || "Silinemedi");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#2edcc8" />
      </View>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>
            {mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
          </Text>
          <Text style={styles.sub}>
            Hesap isteğe bağlıdır. Atlası hesapsız gezebilirsiniz. AI tarama
            limiti ve Premium senkronu için giriş önerilir.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Kullanıcı adı"
            placeholderTextColor="#8a9aa0"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="Şifre (en az 6 karakter)"
            placeholderTextColor="#8a9aa0"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={styles.cta} onPress={onAuth} disabled={busy}>
            <Text style={styles.ctaText}>
              {busy ? "Bekle…" : mode === "login" ? "Giriş" : "Kayıt Ol"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.cta, styles.ghost]}
            onPress={() => setMode((m) => (m === "login" ? "register" : "login"))}
          >
            <Text style={[styles.ctaText, { color: "#2edcc8" }]}>
              {mode === "login" ? "Hesap oluştur" : "Girişe dön"}
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push("/privacy")}>
            <Text style={styles.link}>Gizlilik Politikası</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/terms")}>
            <Text style={styles.link}>Kullanım Koşulları (EULA)</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>@{user.username}</Text>
        <Text style={styles.meta}>Plan: {user.plan}</Text>
        {user.plan === "free" ? (
          <Text style={styles.sub}>
            Kalan AI tarama: {user.scansLeft}/{user.scanLimit}
          </Text>
        ) : (
          <Text style={styles.sub}>
            Premium
            {user.premiumUntil
              ? ` · ${new Date(user.premiumUntil).toLocaleDateString("tr-TR")}`
              : ""}
          </Text>
        )}

        <Text style={styles.section}>Premium (App Store IAP)</Text>
        <Text style={styles.legal}>{SUBSCRIPTION_LEGAL.chargedTo}</Text>
        <Text style={styles.legal}>{SUBSCRIPTION_LEGAL.autoRenew}</Text>
        <Text style={styles.legal}>{SUBSCRIPTION_LEGAL.manage}</Text>

        {products.map((p) => (
          <View key={p.productId} style={styles.plan}>
            <Text style={styles.planName}>{p.title}</Text>
            <Text style={styles.meta}>{p.periodLabel}</Text>
            <Text style={styles.sub}>{p.displayPriceHint}</Text>
            <Text style={styles.productId}>{p.productId}</Text>
            {p.features.map((f) => (
              <Text key={f} style={styles.bullet}>
                + {f}
              </Text>
            ))}
            <Pressable
              style={styles.cta}
              disabled={busy || user.plan === "premium"}
              onPress={() => onBuy(p.planKey)}
            >
              <Text style={styles.ctaText}>
                {user.plan === "premium" ? "Aktif" : "App Store ile Abone Ol"}
              </Text>
            </Pressable>
          </View>
        ))}

        <Pressable style={[styles.cta, styles.ghost]} onPress={onRestore} disabled={busy}>
          <Text style={[styles.ctaText, { color: "#2edcc8" }]}>
            Satın Alımları Geri Yükle
          </Text>
        </Pressable>

        <Pressable onPress={() => router.push("/privacy")}>
          <Text style={styles.link}>Gizlilik Politikası</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/terms")}>
          <Text style={styles.link}>Kullanım Koşulları (EULA)</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(SUPPORT_URL)}>
          <Text style={styles.link}>Destek: kaygisizbaris9@gmail.com</Text>
        </Pressable>

        <Text style={styles.section}>Sağlık uyarısı</Text>
        <Text style={styles.legal}>{MEDICAL_DISCLAIMER}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={[styles.cta, styles.ghost]} onPress={onDelete}>
          <Text style={[styles.ctaText, { color: "#e07a6a" }]}>Hesabı Sil</Text>
        </Pressable>

        <Pressable
          style={[styles.cta, styles.ghost]}
          onPress={async () => {
            await clearSession();
            setUser(null);
          }}
        >
          <Text style={[styles.ctaText, { color: "#2edcc8" }]}>Çıkış Yap</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0a0a0a" },
  content: { padding: 16, paddingBottom: 48 },
  center: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: "#fff", fontSize: 26, fontWeight: "800", marginBottom: 8 },
  sub: { color: "#8a9aa0", marginBottom: 14, lineHeight: 20 },
  meta: { color: "#7cf0e0", fontWeight: "700", marginBottom: 6 },
  section: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
    marginTop: 18,
    marginBottom: 10,
  },
  legal: { color: "#8a9aa0", fontSize: 12, lineHeight: 18, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: 12,
    color: "#fff",
    marginBottom: 10,
    backgroundColor: "#111314",
  },
  cta: {
    backgroundColor: "#2edcc8",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  ctaText: { color: "#041014", fontWeight: "800" },
  error: { color: "#e07a6a", marginTop: 8 },
  plan: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    backgroundColor: "rgba(18,22,24,0.9)",
  },
  planName: { color: "#fff", fontWeight: "800", fontSize: 18 },
  productId: { color: "#5a7a82", fontSize: 10, marginBottom: 8 },
  bullet: { color: "#e8eef0", marginTop: 4 },
  link: {
    color: "#2edcc8",
    marginTop: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
