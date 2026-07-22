import { View, Text, StyleSheet } from "react-native";
import { colors } from "../constants/theme";

export default function StatGrid({ fish }) {
  const items = [
    { label: "Kalori", value: `${fish.calories}`, unit: "kcal/100g" },
    { label: "Protein", value: `${fish.protein}`, unit: "g" },
    { label: "Yağ", value: `${fish.fat}`, unit: "g" },
    { label: "Omega-3", value: fish.omega3, unit: "" },
  ];

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.label} style={styles.cell}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.value}>{item.value}</Text>
          {!!item.unit && <Text style={styles.unit}>{item.unit}</Text>}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  cell: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: colors.foam,
    borderRadius: 14,
    padding: 14,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  value: {
    color: colors.brand,
    fontSize: 22,
    fontWeight: "700",
  },
  unit: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
});
