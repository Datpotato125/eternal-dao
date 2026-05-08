import { Tabs, Redirect } from 'expo-router';
import { Text } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { COLORS } from '@/constants/theme';

function Icon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function TabLayout() {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown:             false,
        tabBarStyle:             { backgroundColor: COLORS.surface, borderTopColor: COLORS.border, height: 60 },
        tabBarActiveTintColor:   COLORS.gold,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle:        { fontSize: 10, letterSpacing: 0.5, marginBottom: 4 },
      }}
    >
      <Tabs.Screen name="index"   options={{ title: 'Dashboard', tabBarIcon: ({ focused }) => <Icon emoji="🧘" focused={focused} /> }} />
      <Tabs.Screen name="combat"  options={{ title: 'Combat',    tabBarIcon: ({ focused }) => <Icon emoji="⚔️" focused={focused} /> }} />
      <Tabs.Screen name="sect"    options={{ title: 'Sect',      tabBarIcon: ({ focused }) => <Icon emoji="🏯" focused={focused} /> }} />
      <Tabs.Screen name="realms"  options={{ title: 'Realms',    tabBarIcon: ({ focused }) => <Icon emoji="🌏" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile',   tabBarIcon: ({ focused }) => <Icon emoji="👤" focused={focused} /> }} />
      <Tabs.Screen name="two"     options={{ href: null }} />
    </Tabs>
  );
}
