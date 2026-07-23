import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { colors, spacing } from "../constants/theme";
import { api, getStoredUser, setSession } from "../lib/api";
import { loadLocale, t } from "../lib/i18n";
import { getTemplate } from "../../shared/templates.js";

export default function EditorScreen() {
  const { templateId, invitationId } = useLocalSearchParams();
  const router = useRouter();
  const [locale, setLocale] = useState("tr");
  const [user, setUser] = useState(null);
  const [invite, setInvite] = useState(null);
  const [editsLeft, setEditsLeft] = useState(null);
  const [form, setForm] = useState({
    title: "",
    hosts: "",
    date: "",
    time: "",
    venue: "",
    address: "",
    message: "",
  });
  const tt = (path, vars) => t(locale, path, vars);
  const tpl = getTemplate(String(templateId || "wedding-garden"));
  const watermark = !user?.limits || user.limits.watermark !== false;

  useEffect(() => {
    (async () => {
      setLocale(await loadLocale());
      const u = await getStoredUser();
      setUser(u);
      if (!u) {
        Alert.alert(tt("errors.auth"), tt("account.login"), [
          { text: tt("common.ok"), onPress: () => router.replace("/(tabs)/account") },
        ]);
        return;
      }
      if (invitationId) {
        const list = await api.invitations();
        const found = (list.invitations || []).find((i) => i.id === invitationId);
        if (found) {
          setInvite(found);
          setForm({
            title: found.title,
            hosts: found.hosts,
            date: found.date,
            time: found.time,
            venue: found.venue,
            address: found.address,
            message: found.message,
          });
        }
      } else {
        try {
          const data = await api.createInvitation({
            templateId: String(templateId || "wedding-garden"),
            locale: await loadLocale(),
            title: t(await loadLocale(), "editor.inviteGuest"),
          });
          setInvite(data.invitation);
          setForm((f) => ({ ...f, title: data.invitation.title }));
          setEditsLeft(u.limits?.maxEditsPerInvitation ?? null);
        } catch (e) {
          if (e.message === "limitInvites" || e.message === "premiumTemplate") {
            Alert.alert(tt(`errors.${e.message}`));
            router.replace("/(tabs)/pricing");
          } else {
            Alert.alert(tt("errors.generic"), e.message);
          }
        }
      }
    })();
  }, [templateId, invitationId]);

  async function save() {
    if (!invite) return;
    try {
      const data = await api.updateInvitation(invite.id, { ...form, templateId: tpl.id });
      setInvite(data.invite);
      setEditsLeft(data.editsLeft);
      const me = await api.me();
      await setSession(undefined, me.user);
      setUser(me.user);
      Alert.alert(tt("editor.save"), "OK");
    } catch (e) {
      if (e.message === "limitReached") {
        Alert.alert(tt("editor.limitReached"));
        router.push("/(tabs)/pricing");
      } else {
        Alert.alert(tt("errors.generic"), e.message);
      }
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {editsLeft != null && (
        <Text style={styles.hint}>{tt("editor.editsLeft", { n: editsLeft })}</Text>
      )}
      {watermark && <Text style={styles.hint}>{tt("editor.watermarkNote")}</Text>}

      {["title", "hosts", "date", "time", "venue", "address"].map((key) => (
        <View key={key} style={styles.field}>
          <Text style={styles.label}>{tt(`editor.${key}Label`)}</Text>
          <TextInput
            style={styles.input}
            value={form[key]}
            onChangeText={(v) => setForm({ ...form, [key]: v })}
          />
        </View>
      ))}
      <View style={styles.field}>
        <Text style={styles.label}>{tt("editor.messageLabel")}</Text>
        <TextInput
          style={[styles.input, { minHeight: 90, textAlignVertical: "top" }]}
          multiline
          value={form.message}
          onChangeText={(v) => setForm({ ...form, message: v })}
        />
      </View>

      <View
        style={[
          styles.preview,
          { backgroundColor: tpl.palette.bg },
        ]}
      >
        <Text style={{ color: tpl.palette.muted }}>{tt("editor.preview")}</Text>
        <Text style={[styles.previewTitle, { color: tpl.palette.text }]}>
          {form.title || tt("editor.inviteGuest")}
        </Text>
        <Text style={{ color: tpl.palette.text, opacity: 0.9 }}>{form.hosts}</Text>
        <Text style={{ color: tpl.palette.muted, textAlign: "center", marginTop: 12 }}>
          {[form.date, form.time].filter(Boolean).join(" · ")}
          {"\n"}
          {form.venue}
          {"\n"}
          {form.address}
          {"\n\n"}
          {form.message}
        </Text>
        {watermark && (
          <Text style={[styles.wm, { color: tpl.palette.muted }]}>Davetly</Text>
        )}
      </View>

      <Pressable style={styles.btn} onPress={save}>
        <Text style={styles.btnText}>{tt("editor.save")}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, gap: 8, paddingBottom: 40 },
  hint: { color: colors.muted, marginBottom: 4 },
  field: { marginBottom: 6 },
  label: { color: colors.muted, fontSize: 12, fontWeight: "600", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  preview: {
    borderRadius: 20,
    padding: spacing.lg,
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  previewTitle: { fontSize: 28, fontWeight: "700", marginVertical: 8, textAlign: "center" },
  wm: { position: "absolute", bottom: 12, right: 14, fontSize: 12 },
  btn: {
    backgroundColor: colors.sage,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: { color: colors.white, fontWeight: "700" },
});
