import { ScrollView, Text, StyleSheet } from "react-native";
import { colors, spacing } from "../constants/theme";

export default function PrivacyScreen() {
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.h1}>Privacy Policy</Text>
      <Text style={styles.meta}>Last updated: 2026-07-23</Text>
      <Text style={styles.p}>
        Davetly (“we”) provides digital invitation creation. We collect: email address for
        account authentication; invitation content you enter; language preference; and
        subscription status. We do not sell personal data to third parties. We do not use
        your data for tracking advertising.
      </Text>
      <Text style={styles.p}>
        Payments on iOS are processed by Apple via In-App Purchase. We receive subscription
        entitlement status, not your full payment card details.
      </Text>
      <Text style={styles.p}>
        You can delete your account in Account → Delete account. This permanently removes
        your account and invitations from our servers.
      </Text>
      <Text style={styles.p}>Contact: kaygisizbaris9@gmail.com</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, gap: 12, paddingBottom: 40 },
  h1: { fontSize: 28, fontWeight: "700", color: colors.ink },
  meta: { color: colors.muted },
  p: { color: colors.inkSoft, lineHeight: 22 },
});
