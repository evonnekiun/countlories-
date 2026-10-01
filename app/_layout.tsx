import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { COLORS } from '../src/theme';
import { DataProvider } from '../src/data';
function TabIcon({ symbol, color, size }: { symbol: string; color: ColorValue; size: number }) {
  return <Text style={{ color, fontSize: size, lineHeight: size + 2 }}>{symbol}</Text>;
}
export default function Layout() {
  return <DataProvider><Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: COLORS.green,
    tabBarInactiveTintColor: COLORS.muted,
    tabBarStyle: { height: 68, paddingTop: 8, paddingBottom: 8, borderTopColor: COLORS.line, backgroundColor: 'white' },
    tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
  }}>
    <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: ({ color, size }) => <TabIcon symbol="⌂" color={color} size={size} /> }} />
    <Tabs.Screen name="log" options={{ title: 'Log', tabBarIcon: ({ color, size }) => <TabIcon symbol="◷" color={color} size={size} /> }} />
    <Tabs.Screen name="planner" options={{ title: 'Plan', tabBarIcon: ({ color, size }) => <TabIcon symbol="▦" color={color} size={size} /> }} />
    <Tabs.Screen name="circle" options={{ title: 'Circle', tabBarIcon: ({ color, size }) => <TabIcon symbol="♧" color={color} size={size} /> }} />
    <Tabs.Screen name="you" options={{ title: 'You', tabBarIcon: ({ color, size }) => <TabIcon symbol="☺" color={color} size={size} /> }} />
    <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <TabIcon symbol="⚙" color={color} size={size} /> }} />
  </Tabs></DataProvider>;
}
