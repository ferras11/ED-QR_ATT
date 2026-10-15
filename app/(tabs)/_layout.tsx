
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, StyleSheet, View } from 'react-native';

import { COLORS } from '@/constants/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: COLORS.background,
        },
        headerShadowVisible: false,
        headerTintColor: COLORS.textPrimary,
        headerTitleStyle: {
          fontSize: 19,
          fontWeight: '700',
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <View style={styles.tabBackground} />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIcon : styles.icon}>
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                color={color}
                size={21}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan QR Code',
          tabBarLabel: 'Scan',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIcon : styles.icon}>
              <Ionicons
                name={focused ? 'qr-code' : 'qr-code-outline'}
                color={color}
                size={21}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: 'Attendance History',
          tabBarLabel: 'History',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIcon : styles.icon}>
              <Ionicons
                name={focused ? 'time' : 'time-outline'}
                color={color}
                size={21}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'My Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIcon : styles.icon}>
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                color={color}
                size={21}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="teacher"
        options={{
          title: 'Teacher',
          tabBarLabel: 'Teacher',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIcon : styles.icon}>
              <Ionicons
                name={focused ? 'clipboard' : 'clipboard-outline'}
                color={color}
                size={21}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'ios' ? 86 : 68,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 25 : 8,
    paddingHorizontal: 5,
    backgroundColor: COLORS.card,
    borderTopColor: COLORS.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 8,
  },
  tabBackground: {
    flex: 1,
    backgroundColor: COLORS.card,
  },
  tabItem: {
    paddingVertical: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  icon: {
    width: 42,
    height: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIcon: {
    width: 48,
    height: 31,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
