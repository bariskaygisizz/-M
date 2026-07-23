import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing } from "../../constants/theme";
import {
  api,
  setSession,
  clearSession,
  getStoredUser,
} from "../../lib/api";
import { loadLocale, t } from "../../lib/i18n";

export default function AccountScreen() {
  const router = useRouter();
  const [locale, setLocale] = useState("tr");
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invites, setInvites] = useState([]);
  const tt = (path) => t(locale, path);

  async function refresh() {
    const stored = await getStoredUser();
    setUser(stored);
    if (stored) {
      try {
        const me = await api.me();
        setUser(me.user);
        await setSession(undefined, me.user);
        const list = await api.invitations();
        setInvites(list.invitations || []);
      } catch {
        await clearSession();
        setUser(null);
      }
    }
  }

  useEffect(() => {
    loadLocale().then(setLocale);
    refresh();
  }, []);

  async function auth(mode) {
    try {
      const fn = mode === "register" ? api.register : api.login;
      const data = await fn({ email, password, locale });
      await setSession(data.token, data.user);
      setUser(data.user);
      await refresh();
    } catch (e) {
      Alert.alert(tt("errors.auth"), e.message);
    }
  }

  async function logout() {
    await clearSession();
    setUser(null);
    setInvites([]);
  }

  async function deleteAccount() {
    Alert.alert(tt("account.deleteAccount"), tt("account.deleteConfirm"), [
      { text: tt("common.cancel"), style: "cancel" },
      {
        text: tt("account.deleteAccount"),
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteMe();
            await logout();
          } catch (e) {
            Alert.alert(tt("errors.generic"), e.message);
          }
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.h2}>{tt("account.title")}</Text>

      {user ? (
        <>
          <Text style={styles.meta}>
            {tt("account.email")}: {user.email}
          </Text>
          <Text style={styles.meta}>
            {tt("account.plan")}: {tt(`pricing.${user.plan || "free"}`)}
          </Text>
          <Pressable style={styles.btnOutline} onPress={logout}>
            <Text style={styles.btnOutlineText}>{tt("account.logout")}</Text>
          </Pressable>
          {/* App Store: account deletion required */}
          <Pressable style={styles.btnDanger} onPress={deleteAccount}>
            <Text style={styles.btnDangerText}>{tt("account.deleteAccount")}</Text>
          </Pressable>

          <Text style={styles.h3}>{tt("account.invites")}</Text>
          {invites.length === 0 ? (
            <Text style={styles.lead}>{tt("account.empty")}</Text>
          ) : (
            invites.map((inv) => (
              <Pressable
                key={inv.id}
                style={styles.row}
                onPress={() =>
                  router.push({
                    pathname: "/editor",
                    params: { invitationId: inv.id, templateId: inv.templateId },
                  })
                }
              >
                <Text style={styles.rowTitle}>{inv.title || tt("editor.inviteGuest")}</Text>
                <Text style={styles.lead}>{tt(`categories.${inv.category}`)}</Text>
              </Pressable>
            ))
          )}
        </>
      ) : (
        <View style={styles.form}>
          <Text style={styles.label}>{tt("account.email")}</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Text style={styles.label}>{tt("account.password")}</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Pressable style={styles.btn} onPress={() => auth("login")}>
            <Text style={styles.btnText}>{tt("account.login")}</Text>
          </Pressable>
          <Pressable style={styles.btnOutline} onPress={() => auth("register")}>
            <Text style={styles.btnOutlineText}>{tt("account.register")}</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.links}>
        <Pressable onPress={() => router.push("/privacy")}>
          <Text style={styles.link}>{tt("navPrivacy")}</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/terms")}>
          <Text style={styles.link}>{tt("navTerms")}</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL("mailto:kaygisizbaris9@gmail.com")}>
          <Text style={styles.link}>Support</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 48 },
  h2: { fontSize: 28, fontWeight: "700", color: colors.ink, marginBottom: 8 },
  h3: { fontSize: 18, fontWeight: "700", color: colors.ink, marginTop: 16 },
  meta: { color: colors.inkSoft, marginBottom: 4 },
  lead: { color: colors.muted },
  form: { gap: 8 },
  label: { color: colors.muted, fontWeight: "600", fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.8)",
    marginBottom: 8,
  },
  btn: {
    backgroundColor: colors.sage,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  btnText: { color: colors.white, fontWeight: "700" },
  btnOutline: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  btnOutlineText: { color: colors.ink, fontWeight: "600" },
  btnDanger: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  btnDangerText: { color: colors.danger, fontWeight: "700" },
  row: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.65)",
    marginTop: 8,
  },
  rowTitle: { fontWeight: "700", color: colors.ink },
  links: { marginTop: 24, gap: 12 },
  link: { color: colors.copper, fontWeight: "600" },
});
