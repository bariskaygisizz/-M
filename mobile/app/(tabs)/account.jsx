import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  login,
  register,
  fetchMe,
  fetchMeta,
  activatePlan,
  clearSession,
  getCachedUser,
} from "../../lib/api";

export default function AccountScreen() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const cached = await getCachedUser();
    setUser(cached);
    const me = await fetchMe();
    setUser(me);
    const meta = await fetchMeta().catch(() => null);
    setPlans(meta?.plans || []);
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

  const onBuy = async (planId) => {
    setBusy(true);
    setError("");
    try {
      const json = await activatePlan(planId);
      setUser(json.user);
    } catch (err) {
      setError(err.message || "Satın alma hatası");
    } finally {
      setBusy(false);
    }
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
            Abonelik ve tarama hakların kullanıcı adına bağlanır.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Kullanıcı adı"
            placeholderTextColor="#8a9aa0"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="Şifre"
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
              ? ` · bitiş ${new Date(user.premiumUntil).toLocaleDateString("tr-TR")}`
              : ""}
          </Text>
        )}

        <Text style={styles.section}>Freemium Abonelikler</Text>
        {plans
          .filter((p) => p.id !== "free")
          .map((p) => (
            <View key={p.id} style={styles.plan}>
              <Text style={styles.planName}>{p.name}</Text>
              <Text style={styles.meta}>{p.price}</Text>
              {(p.features || []).map((f) => (
                <Text key={f} style={styles.bullet}>
                  + {f}
                </Text>
              ))}
              <Pressable
                style={styles.cta}
                disabled={busy || user.plan === "premium"}
                onPress={() => onBuy(p.id)}
              >
                <Text style={styles.ctaText}>
                  {user.plan === "premium" ? "Aktif" : "Abone Ol"}
                </Text>
              </Pressable>
            </View>
          ))}

        {error ? <Text style={styles.error}>{error}</Text> : null}

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
  content: { padding: 16, paddingBottom: 40 },
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
  bullet: { color: "#e8eef0", marginTop: 4 },
});
