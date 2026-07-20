import { useRef, useState } from "react";
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
import { identifyImage } from "../../lib/api";
import { useRouter } from "expo-router";

export default function ScanScreen() {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const router = useRouter();

  const run = async (uri) => {
    setBusy(true);
    setError("");
    setResult(null);
    setPreview(uri);
    try {
      const json = await identifyImage(uri);
      setResult(json);
    } catch (err) {
      setError(err.message || "Tanıma başarısız");
    } finally {
      setBusy(false);
    }
  };

  const takePhoto = async () => {
    const photo = await cameraRef.current?.takePictureAsync({
      quality: 0.85,
      skipProcessing: true,
    });
    if (photo?.uri) await run(photo.uri);
  };

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!res.canceled && res.assets?.[0]?.uri) await run(res.assets[0].uri);
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>Kamera izni gerekli</Text>
        <Text style={styles.sub}>
          Balığı tanımak için kameraya erişim verin veya galeriden seçin.
        </Text>
        <Pressable style={styles.cta} onPress={requestPermission}>
          <Text style={styles.ctaText}>İzin Ver</Text>
        </Pressable>
        <Pressable style={[styles.cta, styles.ghost]} onPress={pick}>
          <Text style={[styles.ctaText, { color: colors.brand }]}>Galeriden Seç</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
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
            <Text style={styles.ctaText}>{busy ? "AI analiz…" : "Tara & Tanı"}</Text>
          </Pressable>
          <Pressable
            style={[styles.cta, styles.ghost]}
            onPress={() => {
              setPreview(null);
              setResult(null);
              setError("");
            }}
          >
            <Text style={[styles.ctaText, { color: colors.brand }]}>Kameraya Dön</Text>
          </Pressable>
          <Pressable style={[styles.cta, styles.ghost]} onPress={pick}>
            <Text style={[styles.ctaText, { color: colors.brand }]}>Galeri</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {result?.match ? (
          <View style={styles.result}>
            <Text style={styles.conf}>
              %{result.confidence} · {result.engine}
            </Text>
            <Text style={styles.name}>{result.match.name}</Text>
            <Text style={styles.notes}>{result.notes}</Text>
            <Text style={styles.meta}>
              {result.match.calories} kcal/100g · {result.match.avgWeight}
            </Text>
            <Text style={styles.meta}>{result.match.regions.join(" · ")}</Text>
            <Text style={styles.blockTitle}>Faydalar</Text>
            {result.match.benefits.slice(0, 3).map((b) => (
              <Text key={b} style={styles.bullet}>
                + {b}
              </Text>
            ))}
            <Text style={styles.blockTitle}>Dikkat</Text>
            {result.match.harms.slice(0, 3).map((b) => (
              <Text key={b} style={styles.bullet}>
                ! {b}
              </Text>
            ))}
            <Pressable
              style={styles.cta}
              onPress={() => router.push(`/fish/${result.match.id}`)}
            >
              <Text style={styles.ctaText}>Tüm özellikleri aç</Text>
            </Pressable>
            <Text style={styles.disclaimer}>{result.disclaimer}</Text>
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
  conf: { color: "#2edcc8", fontFamily: undefined, fontWeight: "700" },
  name: { color: "#fff", fontSize: 26, fontWeight: "800", marginVertical: 6 },
  notes: { color: "#8a9aa0", marginBottom: 8 },
  meta: { color: "#7cf0e0", marginBottom: 4, fontWeight: "600" },
  blockTitle: {
    color: "#fff",
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 6,
  },
  bullet: { color: "#e8eef0", marginBottom: 4, lineHeight: 20 },
  disclaimer: { color: "#8a9aa0", fontSize: 12, marginTop: 12, lineHeight: 18 },
});
