import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing } from "../../constants/theme";
import { api } from "../../lib/api";
import { loadLocale, t } from "../../lib/i18n";

export default function TemplatesScreen() {
  const router = useRouter();
  const [locale, setLocale] = useState("tr");
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const tt = (path) => t(locale, path);

  useEffect(() => {
    loadLocale().then(setLocale);
    api
      .templates()
      .then((d) => setTemplates(d.templates || []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.sage} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.h2}>{tt("templates.title")}</Text>
      <View style={styles.grid}>
        {templates.map((tpl) => (
          <Pressable
            key={tpl.id}
            style={[styles.tile, { backgroundColor: tpl.palette.bg }]}
            onPress={() =>
              router.push({
                pathname: "/editor",
                params: { templateId: tpl.id },
              })
            }
          >
            <Text style={[styles.badge, { color: tpl.palette.muted }]}>
              {tpl.premium ? tt("templates.premium") : tt("templates.free")}
            </Text>
            <Text style={[styles.title, { color: tpl.palette.text }]}>
              {tt(`categories.${tpl.category}`)}
            </Text>
            <Text style={{ color: tpl.palette.accent }}>{tt("templates.use")}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, gap: spacing.md },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  h2: { fontSize: 28, fontWeight: "700", color: colors.ink },
  grid: { gap: spacing.md },
  tile: {
    borderRadius: 18,
    padding: spacing.lg,
    minHeight: 140,
    justifyContent: "flex-end",
  },
  badge: { fontSize: 11, textTransform: "uppercase", marginBottom: 6 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
});
