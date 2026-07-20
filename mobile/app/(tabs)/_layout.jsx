import { Tabs } from "expo-router";
import { Text, View } from "react-native";

const brand = "#2edcc8";
const muted = "#8a9aa0";
const bg = "#0a0a0a";

function TabIcon({ letter, focused }) {
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? "rgba(46,220,200,0.15)" : "transparent",
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "800",
          color: focused ? brand : muted,
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
        headerStyle: { backgroundColor: bg },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
        tabBarActiveTintColor: brand,
        tabBarInactiveTintColor: muted,
        tabBarStyle: {
          backgroundColor: "#111314",
          borderTopColor: "rgba(255,255,255,0.08)",
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
        name="scan"
        options={{
          title: "AI Tara",
          tabBarIcon: ({ focused }) => <TabIcon letter="AI" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: "Atlas",
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
