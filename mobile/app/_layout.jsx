import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors } from "../constants/theme";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.brand },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="fish/[id]"
          options={{ title: "Balık Detayı", headerBackTitle: "Geri" }}
        />
        <Stack.Screen
          name="privacy"
          options={{ title: "Gizlilik Politikası", presentation: "modal" }}
        />
        <Stack.Screen
          name="terms"
          options={{ title: "Kullanım Koşulları", presentation: "modal" }}
        />
      </Stack>
    </>
  );
}
