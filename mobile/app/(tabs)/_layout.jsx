import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { colors } from "../../constants/theme";

function TabIcon({ letter, focused }) {
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? colors.foam : "transparent",
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "800",
          color: focused ? colors.brand : colors.muted,
        }}
      >
        {letter}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.brand },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Keşfet",
          tabBarIcon: ({ focused }) => <TabIcon letter="K" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: "Balıklar",
          tabBarIcon: ({ focused }) => <TabIcon letter="B" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favoriler",
          tabBarIcon: ({ focused }) => <TabIcon letter="F" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: "Hakkında",
          tabBarIcon: ({ focused }) => <TabIcon letter="i" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
