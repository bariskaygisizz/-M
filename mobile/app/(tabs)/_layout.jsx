import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#0a1520' },
        headerTintColor: '#e8f1f8',
        tabBarStyle: { backgroundColor: '#0a1520', borderTopColor: 'rgba(148,186,214,0.18)' },
        tabBarActiveTintColor: '#5eb8ff',
        tabBarInactiveTintColor: '#8aa0b5'
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Harita', headerTitle: 'SkyWatch' }} />
      <Tabs.Screen name="list" options={{ title: 'Liste', headerTitle: 'Trafik' }} />
      <Tabs.Screen name="about" options={{ title: 'Bilgi', headerTitle: 'Ne işe yarar?' }} />
    </Tabs>
  );
}
