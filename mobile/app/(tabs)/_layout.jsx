import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { colors } from "../../constants/theme";

function TabIcon({ label, focused }) {
  return (
    <View style={{ alignItems: "center", minWidth: 64 }}>
      <Text style={{ color: focused ? colors.sage : colors.muted, fontSize: 11, fontWeight: "700" }}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerTintColor: colors.ink,
        tabBarStyle: {
          backgroundColor: colors.foam,
          borderTopColor: colors.line,
          height: 64,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.sage,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Davetly",
          tabBarLabel: "Home",
          tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="templates"
        options={{
          title: "Templates",
          tabBarIcon: ({ focused }) => <TabIcon label="Templates" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="pricing"
        options={{
          title: "Pricing",
          tabBarIcon: ({ focused }) => <TabIcon label="Plans" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ focused }) => <TabIcon label="Account" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
