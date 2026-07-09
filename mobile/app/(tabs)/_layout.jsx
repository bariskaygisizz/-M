import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#e30a17',
        tabBarInactiveTintColor: '#6b7280',
        headerStyle: { backgroundColor: '#e30a17' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Harita',
          tabBarLabel: 'Harita'
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: 'Liste',
          tabBarLabel: 'Liste'
        }}
      />
    </Tabs>
  );
}
