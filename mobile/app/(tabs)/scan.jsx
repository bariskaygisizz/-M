import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { identifyImage, fetchFish, getCachedUser } from "../../lib/api";
import { useRouter } from "expo-router";

export default function ScanScreen() {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    getCachedUser().then(setUser);
    fetchFish()
      .then((d) => setCatalog(d.items || []))
      .catch(() => {});
  }, []);

  const resolveFish = (id) => {
    if (result?.match?.id === id) return result.match;
    return catalog.find((f) => f.id === id) || null;
  };

  const run = async (uri) => {
    if (!user) {
      setError("AI tarama için giriş yap (Hesap sekmesi).");
      router.push("/(tabs)/account");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    setSelected(null);
    setPreview(uri);
    try {
      const json = await identifyImage(uri);
      setResult(json);
      if (json.user) setUser(json.user);
      if (json.match && !json.needsConfirm && json.isFish !== false) {
        setSelected(json.match);
      }
    } catch (err) {
      if (err.user) setUser(err.user);
      if (err.paywall || err.code === "LIMIT") {
        setError(err.message || "Tarama hakkın bitti");
        router.push("/(tabs)/account");
      } else {
        setError(err.message || "Tanıma başarısız");
      }
    } finally {
      setBusy(false);
    }
  };

  const takePhoto = async () => {
    const photo = await cameraRef.current?.takePictureAsync({
      quality: 0.9,
      skipProcessing: true,
    });
    if (photo?.uri) await run(photo.uri);
  };

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!res.canceled && res.assets?.[0]?.uri) await run(res.assets[0].uri);
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#2edcc8" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>Kamera izni gerekli</Text>
        <Text style={styles.sub}>
          Balığı tanımak için kamera veya galeri kullanın.
        </Text>
        <Pressable style={styles.cta} onPress={requestPermission}>
          <Text style={styles.ctaText}>İzin Ver</Text>
        </Pressable>
        <Pressable style={[styles.cta, styles.ghost]} onPress={pick}>
          <Text style={[styles.ctaText, { color: "#2edcc8" }]}>Galeriden Seç</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const candidates = [];
  if (result?.match) {
    candidates.push({
      id: result.match.id,
      name: result.match.name,
      confidence: result.confidence,
    });
  }
  for (const a of result?.alternatives || []) {
    if (!candidates.some((c) => c.id === a.id)) candidates.push(a);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>
          Balığı yakından, iyi ışıkta çek. Emin değilse adaylardan sen seç.
        </Text>
        <View style={styles.viewport}>
          {preview ? (
            <Image source={{ uri: preview }} style={styles.preview} />
          ) : (
            <CameraView ref={cameraRef} style={styles.preview} facing="back">
              <View style={styles.frame} />
            </CameraView>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={styles.cta}
            onPress={takePhoto}
            disabled={busy || !!preview}
          >
            <Text style={styles.ctaText}>
              {busy ? "Analiz ediliyor…" : "Tara & Tanı"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.cta, styles.ghost]}
            onPress={() => {
              setPreview(null);
              setResult(null);
              setSelected(null);
              setError("");
            }}
          >
            <Text style={[styles.ctaText, { color: "#2edcc8" }]}>Kameraya Dön</Text>
          </Pressable>
          <Pressable style={[styles.cta, styles.ghost]} onPress={pick}>
            <Text style={[styles.ctaText, { color: "#2edcc8" }]}>Galeri</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {result?.isFish === false ? (
          <View style={styles.result}>
            <Text style={styles.conf}>Balık tespit edilemedi</Text>
            <Text style={styles.notes}>{result.notes}</Text>
            {(catalog || []).slice(0, 8).map((f) => (
              <Pressable
                key={f.id}
                style={styles.candidate}
                onPress={() => setSelected(f)}
              >
                <Text style={styles.candidateText}>{f.name}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {result?.isFish !== false && candidates.length > 0 ? (
          <View style={styles.result}>
            <Text style={styles.conf}>
              Eşleşme %{result.confidence}
              {result.needsConfirm ? " — doğru türü seç" : ""}
            </Text>
            <Text style={styles.notes}>{result.notes}</Text>
            <Text style={styles.blockTitle}>Doğru türü seç</Text>
            {candidates.map((c) => (
              <Pressable
                key={c.id}
                style={[
                  styles.candidate,
                  selected?.id === c.id && styles.candidateActive,
                ]}
                onPress={() => setSelected(resolveFish(c.id))}
              >
                <Text style={styles.candidateText}>
                  %{c.confidence} · {c.name}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {selected ? (
          <View style={styles.result}>
            <Text style={styles.name}>{selected.name}</Text>
            <Text style={styles.meta}>
              {selected.calories} kcal/100g · {selected.avgWeight}
            </Text>
            <Text style={styles.meta}>{selected.regions.join(" · ")}</Text>
            <Text style={styles.blockTitle}>Faydalar</Text>
            {selected.benefits.slice(0, 3).map((b) => (
              <Text key={b} style={styles.bullet}>
                + {b}
              </Text>
            ))}
            <Text style={styles.blockTitle}>Dikkat</Text>
            {selected.harms.slice(0, 3).map((b) => (
              <Text key={b} style={styles.bullet}>
                ! {b}
              </Text>
            ))}
            <Pressable
              style={styles.cta}
              onPress={() => router.push(`/fish/${selected.id}`)}
            >
              <Text style={styles.ctaText}>Tüm özellikleri aç</Text>
            </Pressable>
          </View>
        ) : null}
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
    padding: 24,
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 8 },
  sub: { color: "#8a9aa0", textAlign: "center", marginBottom: 16 },
  hint: { color: "#8a9aa0", marginBottom: 10, fontSize: 13 },
  viewport: {
    height: 420,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(46,220,200,0.35)",
    backgroundColor: "#050707",
  },
  preview: { width: "100%", height: "100%" },
  frame: {
    position: "absolute",
    top: "12%",
    left: "12%",
    right: "12%",
    bottom: "12%",
    borderWidth: 1,
    borderColor: "rgba(46,220,200,0.7)",
    borderRadius: 16,
  },
  actions: { gap: 8, marginTop: 12 },
  cta: {
    backgroundColor: "#2edcc8",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  ctaText: { color: "#041014", fontWeight: "800" },
  error: { color: "#e07a6a", marginTop: 10 },
  result: {
    marginTop: 16,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(18,22,24,0.9)",
  },
  conf: { color: "#2edcc8", fontWeight: "700" },
  name: { color: "#fff", fontSize: 26, fontWeight: "800", marginVertical: 6 },
  notes: { color: "#8a9aa0", marginBottom: 8, marginTop: 6 },
  meta: { color: "#7cf0e0", marginBottom: 4, fontWeight: "600" },
  blockTitle: {
    color: "#fff",
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 6,
  },
  bullet: { color: "#e8eef0", marginBottom: 4, lineHeight: 20 },
  candidate: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  candidateActive: { borderColor: "#2edcc8" },
  candidateText: { color: "#fff", fontWeight: "700" },
});
