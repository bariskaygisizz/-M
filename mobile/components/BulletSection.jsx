import { View, Text, StyleSheet } from "react-native";
import { colors } from "../constants/theme";

export default function BulletSection({ title, items, tone = "good" }) {
  const mark = tone === "good" ? "+" : "!";
  const markColor = tone === "good" ? colors.accent : colors.danger;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {items.map((item) => (
        <View key={item} style={styles.row}>
          <Text style={[styles.mark, { color: markColor }]}>{mark}</Text>
          <Text style={styles.text}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  mark: {
    fontWeight: "800",
    fontSize: 16,
    width: 16,
  },
  text: {
    flex: 1,
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
  },
});
