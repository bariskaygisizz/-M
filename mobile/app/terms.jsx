import { ScrollView, Text, StyleSheet, Linking } from "react-native";
import { colors, spacing } from "../constants/theme";

export default function TermsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.h1}>Terms of Use</Text>
      <Text style={styles.meta}>Last updated: 2026-07-23</Text>
      <Text style={styles.p}>
        Davetly is a freemium invitation design app. The Free plan includes a limited number
        of invitations and edits, and may display a watermark. Plus and Pro subscriptions
        unlock higher limits, premium templates, and remove the watermark as described in
        the Pricing screen.
      </Text>
      <Text style={styles.p}>
        Subscriptions are billed through the Apple App Store or Google Play and renew
        automatically unless cancelled at least 24 hours before the end of the current
        period. Manage or cancel in your store account settings. Restore Purchases is
        available on the Pricing screen.
      </Text>
      <Text style={styles.p}>
        You agree not to upload unlawful or infringing content. We may suspend accounts that
        violate these terms.
      </Text>
      <Text style={styles.p}>
        iOS EULA:{" "}
        <Text
          style={styles.link}
          onPress={() =>
            Linking.openURL(
              "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
            )
          }
        >
          Apple Standard EULA
        </Text>
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
  link: { color: colors.copper, fontWeight: "600" },
});
